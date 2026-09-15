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

const MODEL = "gemini-3.6-flash";
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
  const contents: GeminiMessage[] = [];
  for (const message of messages.slice(-80)) {
    const role: GeminiRole = message.role === "assistant" ? "model" : "user";
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n\n${message.content}`;
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }

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
    contents,
    generationConfig: { maxOutputTokens: 8192, responseMimeType: "text/plain" },
  });
}

export async function generateCvJson(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const contents: GeminiMessage[] = [];
  for (const message of messages.slice(-80)) {
    const role: GeminiRole = message.role === "assistant" ? "model" : "user";
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n\n${message.content}`;
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }

  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents[contents.length - 1].parts[0].text += "\n\nGenerate my CV now as JSON using the specified schema.";
  } else {
    contents.push({
      role: "user",
      parts: [{ text: "Generate my CV now as JSON using the specified schema." }],
    });
  }

  const text = await requestGemini({
    systemInstruction: {
      parts: [
        {
          text: `You are a professional CV writer. Based on the conversation, extract the person's profile and return a CV as valid JSON and nothing else.
Use this exact JSON structure:
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
    contents,
    generationConfig: { maxOutputTokens: 8192, responseMimeType: "application/json" },
  });

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonString = match ? match[0] : cleaned;

  try {
    return JSON.parse(jsonString) as unknown;
  } catch {
    throw new Error("Gemini returned invalid CV JSON.");
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function normalizeCvData(
  value: unknown,
  user: { fullName: string; email: string },
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Gemini returned an invalid CV object.");
  }
  const input = value as Record<string, unknown>;

  const rawWorkExp = input.work_experience || input.experience || input.workExperience || input.jobs;
  const workExperience = Array.isArray(rawWorkExp)
    ? rawWorkExp
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          company: asString(item.company || item.employer || item.organization),
          role: asString(item.role || item.title || item.position || item.job_title),
          start_date: asString(item.start_date || item.startDate || item.start || item.duration),
          end_date: asString(item.end_date || item.endDate || item.end),
          responsibilities: asStringArray(item.responsibilities || item.bullets || item.highlights || item.skills_used || item.duties),
        }))
    : [];

  const rawEdu = input.education || input.academic || input.schools;
  const education = Array.isArray(rawEdu)
    ? rawEdu
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          institution: asString(item.institution || item.school || item.university),
          degree: asString(item.degree || item.qualification),
          field: asString(item.field || item.major || item.subject),
          year: asString(item.year || item.graduated || item.date),
        }))
    : [];

  return {
    full_name: asString(input.full_name || input.fullName || input.name) || user.fullName,
    email: asString(input.email) || user.email,
    phone: asString(input.phone || input.mobile || input.contact_number),
    location: asString(input.location || input.city || input.address),
    linkedin: asString(input.linkedin || input.linkedin_url),
    career_objective: asString(input.career_objective || input.summary || input.objective || input.about || input.profile || input.bio),
    work_experience: workExperience,
    education,
    skills: asStringArray(input.skills || input.technologies || input.competencies),
    certifications: asStringArray(input.certifications || input.certificates),
    languages: asStringArray(input.languages),
    interests: asStringArray(input.interests || input.hobbies),
  };
}