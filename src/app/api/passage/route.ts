import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export type PassageCategory = "news" | "prose" | "code" | "quotes" | "scifi";
export type PassageLength = "short" | "medium" | "long";

const LENGTH_CHARS: Record<PassageLength, number> = {
  short: 120,
  medium: 320,
  long: 650,
};

const LENGTH_SENTENCES: Record<PassageLength, string> = {
  short: "1-2 sentences",
  medium: "1 paragraph (4-6 sentences)",
  long: "2-3 paragraphs",
};

// --- Guardian ---
async function fetchNewsPassage(length: PassageLength): Promise<string> {
  const key = process.env.GUARDIAN_API_KEY;
  const res = await fetch(
    `https://content.guardianapis.com/search?api-key=${key}&show-fields=bodyText&page-size=50&order-by=newest`
  );
  if (!res.ok) throw new Error("Guardian fetch failed");
  const data = await res.json();
  const results = data.response?.results ?? [];
  if (results.length === 0) throw new Error("No Guardian results");

  // Pick a random article that has body text
  const articles = results.filter((r: any) => r.fields?.bodyText);
  if (articles.length === 0) throw new Error("No articles with body text");
  const article = articles[Math.floor(Math.random() * articles.length)];
  const body: string = article.fields.bodyText;

  // Slice to desired length at a sentence boundary
  const target = LENGTH_CHARS[length];
  if (body.length <= target) return body.trim();

  const chunk = body.slice(0, target + 200);
  const sentences = chunk.match(/[^.!?]+[.!?]+/g) ?? [];
  let result = "";
  for (const s of sentences) {
    if ((result + s).length > target && result.length > 0) break;
    result += s;
  }
  return result.trim() || body.slice(0, target).trim();
}

// --- Featherless / AI generated ---
const AI_PROMPTS: Record<Exclude<PassageCategory, "news">, string> = {
  prose:
    "Write a typing practice passage about nature, history, science, or everyday life.",
  code:
    "Write a short code snippet or explain a programming concept in plain English suitable for typing practice. Mix real code and explanation.",
  quotes:
    "Write an original inspirational or philosophical statement in the style of a famous thinker.",
  scifi:
    "Write a typing practice passage in the style of science fiction — futuristic setting, technology, space, or AI.",
};

async function fetchAIPassage(
  category: Exclude<PassageCategory, "news">,
  length: PassageLength
): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.FEATHERLESS_API_KEY,
    baseURL: "https://api.featherless.ai/v1",
  });

  const sentences = LENGTH_SENTENCES[length];
  const categoryPrompt = AI_PROMPTS[category];

  const response = await client.chat.completions.create({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages: [
      {
        role: "system",
        content:
          "You generate typing practice passages. Respond with ONLY the passage text — no quotes, no title, no explanation, no markdown.",
      },
      {
        role: "user",
        content: `${categoryPrompt} Length: ${sentences}. No special characters or symbols beyond basic punctuation.`,
      },
    ],
    max_tokens: 400,
    temperature: 0.9,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

// --- Route handler ---
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") ?? "prose") as PassageCategory;
  const length = (searchParams.get("length") ?? "medium") as PassageLength;

  try {
    let text: string;
    if (category === "news") {
      text = await fetchNewsPassage(length);
    } else {
      text = await fetchAIPassage(category, length);
    }
    return NextResponse.json({ text, category, length });
  } catch (err) {
    console.error("passage generation failed:", err);
    return NextResponse.json({ error: "Failed to generate passage" }, { status: 500 });
  }
}
