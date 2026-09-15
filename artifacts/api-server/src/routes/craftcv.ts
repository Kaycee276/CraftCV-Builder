import { Router, type IRouter } from "express";
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
import {
  cvsRepo,
  messagesRepo,
  usersRepo,
  type Message,
} from "@workspace/db";
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

function toMessage(message: Message) {
  return {
    id: message.id,
    role: message.role,
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
  const existing = usersRepo.findByEmail(email);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const user = usersRepo.create({
    fullName,
    email,
    passwordHash: await hashPassword(parsed.data.password),
  });
  await createSession(user.id, res);
  res.status(201).json(publicUser(user));
});

router.post("/auth/signin", async (req, res) => {
  const parsed = SignInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }
  const user = usersRepo.findByEmail(parsed.data.email.toLowerCase().trim());
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
  let messages = messagesRepo.listByUser(user.id);
  if (messages.length === 0) {
    const welcome = messagesRepo.create({
      userId: user.id,
      role: "assistant",
      content: welcomeMessage(user.fullName),
    });
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
  const history = messagesRepo.listByUser(user.id);
  const userMessage = messagesRepo.create({
    userId: user.id,
    role: "user",
    content,
  });
  let reply: string;
  try {
    reply = await getCoachReply([
      ...history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      { role: "user", content },
    ]);
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(502).json({
      error: "Gemini could not respond right now. Please try again.",
    });
    return;
  }
  const assistantMessage = messagesRepo.create({
    userId: user.id,
    role: "assistant",
    content: reply,
  });
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
  const cvs = cvsRepo.listByUser(user.id);
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
  const cv = cvsRepo.getById(parsed.data.id, user.id);
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
  const deleted = cvsRepo.delete(parsed.data.id, user.id);
  if (!deleted) {
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
  const messages = messagesRepo.listByUser(user.id);
  let cvData: unknown;
  try {
    cvData = normalizeCvData(
      await generateCvJson(
        messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ),
      user,
    );
  } catch (err) {
    console.error("Generate CV Error:", err);
    res.status(502).json({
      error: "Gemini could not generate your CV right now. Please try again.",
    });
    return;
  }
  const maxVersion = cvsRepo.getMaxVersion(user.id);
  const version = maxVersion + 1;
  const cv = cvsRepo.create({
    userId: user.id,
    version,
    cvData,
  });
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
  usersRepo.delete(user.id);
  await clearSession(req, res);
  res.status(204).end();
});

export default router;