type GeminiRole = "user" | "model";

type GeminiMessage = {
  role: GeminiRole;
  parts: Array<{ text: string }>;
};

type GeminiRequest = {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiMessage[];
  generationConfig?: {
    maxOutputTokens?: number;
    responseMimeType?: "application/json" | "text/plain";
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 20_000;

async function requestGemini(body: GeminiRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = (await response.json()) as GeminiResponse;
      if (!response.ok) {
        const message = data.error?.message ?? `Gemini request failed with ${response.status}.`;
        lastError = new Error(message);
        if (response.status === 429 && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        throw lastError;
      }

      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "")
          .join("")
          .trim() ?? "";
      if (text) return text;
      lastError = new Error("Gemini returned an empty response.");
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Gemini request failed.");
      if (attempt === 0 && lastError.name === "AbortError") continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError?.name === "AbortError") {
    throw new Error("Gemini response took too long.");
  }
  throw lastError ?? new Error("Gemini request failed.");
}

export async function getCoachReply(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  return requestGemini({
    systemInstruction: {
      parts: [
        {
          text: `You are a warm, professional career coach helping someone build their CV through conversation.
Learn about work experience, education, skills, achievements, certifications, languages, interests, and career goals.
Ask one or two focused follow-up questions at a time. Probe for specific achievements and numbers.
Keep responses concise, in English, and limited to 2–4 sentences.
Never write the complete CV in chat. When the user is ready, tell them to use the Generate My CV action.
Stay focused on helping build the user's CV and do not discuss unrelated topics.`,
        },
      ],
    },
    contents: messages.slice(-80).map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    generationConfig: { maxOutputTokens: 8192, responseMimeType: "text/plain" },
  });
}

export async function generateCvJson(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const text = await requestGemini({
    systemInstruction: {
      parts: [
        {
          text: `You are a professional CV writer. Based only on the conversation, return a CV as valid JSON and nothing else.
Use this exact structure:
{
  "full_name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "career_objective": "",
  "work_experience": [{"company":"","role":"","start_date":"","end_date":"","responsibilities":[]}],
  "education": [{"institution":"","degree":"","field":"","year":""}],
  "skills": [],
  "certifications": [],
  "languages": [],
  "interests": []
}
Write strong, action-led responsibility bullets. Polish grammar but never invent facts. Use empty strings or arrays when details are missing.`,
        },
      ],
    },
    contents: [
      ...messages.slice(-80).map((message) => ({
        role: message.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: message.content }],
      })),
      {
        role: "user",
        parts: [{ text: "Generate my CV now as JSON." }],
      },
    ],
    generationConfig: { maxOutputTokens: 8192, responseMimeType: "application/json" },
  });

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    throw new Error("Gemini returned invalid CV JSON.");
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

export function normalizeCvData(
  value: unknown,
  user: { fullName: string; email: string },
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Gemini returned an invalid CV object.");
  }
  const input = value as Record<string, unknown>;
  const workExperience = Array.isArray(input.work_experience)
    ? input.work_experience
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          company: asString(item.company),
          role: asString(item.role),
          start_date: asString(item.start_date),
          end_date: asString(item.end_date),
          responsibilities: asStringArray(item.responsibilities),
        }))
    : [];
  const education = Array.isArray(input.education)
    ? input.education
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          institution: asString(item.institution),
          degree: asString(item.degree),
          field: asString(item.field),
          year: asString(item.year),
        }))
    : [];

  return {
    full_name: asString(input.full_name) || user.fullName,
    email: asString(input.email) || user.email,
    phone: asString(input.phone),
    location: asString(input.location),
    linkedin: asString(input.linkedin),
    career_objective: asString(input.career_objective),
    work_experience: workExperience,
    education,
    skills: asStringArray(input.skills),
    certifications: asStringArray(input.certifications),
    languages: asStringArray(input.languages),
    interests: asStringArray(input.interests),
  };
}