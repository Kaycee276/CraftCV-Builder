import { Router, type IRouter } from "express";
import { and, desc, eq, max } from "drizzle-orm";
import {
  DeleteCvParams,
  GenerateCvBody,
  GetCvParams,
  ListCvsResponse,
  ListMessagesResponse,
  SendChatMessageBody,
  SendChatMessageResponse,
  SignInBody,
  SignUpBody,
} from "@workspace/api-zod";
import { db, cvsTable, messagesTable, usersTable } from "@workspace/db";
import {
  clearSession,
  createSession,
  getSessionUser,
  hashPassword,
  publicUser,
  requireUser,
  verifyPassword,
} from "../lib/auth";
import { generateCvJson, getCoachReply, normalizeCvData } from "../lib/gemini";

const router: IRouter = Router();

const welcomeMessage = (name: string) =>
  `Hi ${name.split(" ")[0]} — I'm your CV coach. Tell me a bit about yourself: what kind of work do you do, and what are you looking for?`;

function toMessage(message: typeof messagesTable.$inferSelect) {
  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    content: message.content,
    created_at: message.createdAt,
  };
}

router.get("/auth/me", async (req, res) => {
  const user = await getSessionUser(req);
  if (!requireUser(user, res)) return;
  res.json(publicUser(user));
});

router.post("/auth/signup", async (req, res) => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please check your details and try again." });
    return;
  }
  const fullName = parsed.data.full_name.trim();
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/.test(fullName)) {
    res.status(400).json({ error: "Full name can only contain letters and spaces." });
    return;
  }
  if (!/[A-Z]/.test(parsed.data.password) || !/\d/.test(parsed.data.password)) {
    res.status(400).json({
      error: "Password must include at least one uppercase letter and one number.",
    });
    return;
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName,
      email,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .returning();
  await createSession(user.id, res);
  res.status(201).json(publicUser(user));
});

router.post("/auth/signin", async (req, res) => {
  const parsed = SignInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email.toLowerCase().trim()))
    .limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }
  await createSession(user.id, res);
  res.json(publicUser(user));
});

router.post("/auth/signout", async (req, res) => {
  await clearSession(req, res);
  res.status(204).end();
});

router.get("/messages", async (req, res) => {
  const user = await getSessionUser(req);
  if (!requireUser(user, res)) return;
  let messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.userId, user.id))
    .orderBy(messagesTable.createdAt);
  if (messages.length === 0) {
    const [welcome] = await db
      .insert(messagesTable)
      .values({ userId: user.id, role: "assistant", content: welcomeMessage(user.fullName) })
      .returning();
    messages = [welcome];
  }
  res.json(ListMessagesResponse.parse(messages.map(toMessage)));
});

router.post("/chat/reply", async (req, res) => {
  const user = await getSessionUser(req);
  if (!requireUser(user, res)) return;
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Message must be between 1 and 1000 characters." });
    return;
  }
  const content = parsed.data.content.trim();
  const history = await db
    .select({ role: messagesTable.role, content: messagesTable.content })
    .from(messagesTable)
    .where(eq(messagesTable.userId, user.id))
    .orderBy(messagesTable.createdAt);
  const [userMessage] = await db
    .insert(messagesTable)
    .values({ userId: user.id, role: "user", content })
    .returning();
  let reply: string;
  try {
    reply = await getCoachReply([
      ...history.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
      { role: "user", content },
    ]);
  } catch {
    res.status(502).json({
      error: "Gemini could not respond right now. Please try again.",
    });
    return;
  }
  const [assistantMessage] = await db
    .insert(messagesTable)
    .values({
      userId: user.id,
      role: "assistant",
      content: reply,
    })
    .returning();
  res.json(
    SendChatMessageResponse.parse({
      user_message: toMessage(userMessage),
      assistant_message: toMessage(assistantMessage),
    }),
  );
});

router.get("/cvs", async (req, res) => {
  const user = await getSessionUser(req);
  if (!requireUser(user, res)) return;
  const cvs = await db
    .select()
    .from(cvsTable)
    .where(eq(cvsTable.userId, user.id))
    .orderBy(desc(cvsTable.createdAt));
  res.json(ListCvsResponse.parse(cvs.map((cv) => ({
    id: cv.id,
    version: cv.version,
    cv_data: cv.cvData,
    created_at: cv.createdAt,
  }))));
});

router.get("/cvs/:id", async (req, res) => {
  const user = await getSessionUser(req);
  if (!requireUser(user, res)) return;
  const parsed = GetCvParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(404).json({ error: "CV not found." });
    return;
  }
  const [cv] = await db
    .select()
    .from(cvsTable)
    .where(and(eq(cvsTable.id, parsed.data.id), eq(cvsTable.userId, user.id)))
    .limit(1);
  if (!cv) {
    res.status(404).json({ error: "CV not found." });
    return;
  }
  res.json({ id: cv.id, version: cv.version, cv_data: cv.cvData, created_at: cv.createdAt });
});

router.delete("/cvs/:id", async (req, res) => {
  const user = await getSessionUser(req);
  if (!requireUser(user, res)) return;
  const parsed = DeleteCvParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(404).json({ error: "CV not found." });
    return;
  }
  const deleted = await db
    .delete(cvsTable)
    .where(and(eq(cvsTable.id, parsed.data.id), eq(cvsTable.userId, user.id)))
    .returning({ id: cvsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "CV not found." });
    return;
  }
  res.status(204).end();
});

router.post("/cvs/generate", async (req, res) => {
  const user = await getSessionUser(req);
  if (!requireUser(user, res)) return;
  const parsed = GenerateCvBody.safeParse(req.body);
  if (!parsed.success || parsed.data.messages.length === 0) {
    res.status(400).json({ error: "Chat with your CV coach first — tell me about yourself." });
    return;
  }
  const messages = await db
    .select({ role: messagesTable.role, content: messagesTable.content })
    .from(messagesTable)
    .where(eq(messagesTable.userId, user.id))
    .orderBy(messagesTable.createdAt);
  let cvData: unknown;
  try {
    cvData = normalizeCvData(
      await generateCvJson(
        messages.map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        })),
      ),
      user,
    );
  } catch {
    res.status(502).json({
      error: "Gemini could not generate your CV right now. Please try again.",
    });
    return;
  }
  const [latest] = await db
    .select({ value: max(cvsTable.version) })
    .from(cvsTable)
    .where(eq(cvsTable.userId, user.id));
  const version = (latest?.value ?? 0) + 1;
  const [cv] = await db
    .insert(cvsTable)
    .values({ userId: user.id, version, cvData })
    .returning();
  res.status(201).json({
    id: cv.id,
    version: cv.version,
    cv_data: cv.cvData,
    created_at: cv.createdAt,
  });
});

router.delete("/account", async (req, res) => {
  const user = await getSessionUser(req);
  if (!requireUser(user, res)) return;
  await db.delete(usersTable).where(eq(usersTable.id, user.id));
  await clearSession(req, res);
  res.status(204).end();
});

export default router;