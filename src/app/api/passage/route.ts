import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export type PassageCategory = "news" | "learn" | "code";
export type PassageLength = "short" | "medium" | "long";

function sanitize(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')    // smart double quotes
    .replace(/[\u2013\u2014]/g, "-")                // en/em dash
    .replace(/\u2026/g, "...")                       // ellipsis
    .replace(/`/g, "'")                              // backticks → apostrophe
    .replace(/[^\x20-\x7E\n]/g, "");                // strip anything else non-ASCII
}

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
  return sanitize(result.trim() || body.slice(0, target).trim());
}

// --- Featherless / AI generated ---
const AI_PROMPTS: Record<Exclude<PassageCategory, "news">, string> = {
  learn:
    "Generate a typing practice passage that teaches something real and useful about a programming language, framework, tool, or computer science concept. It should read like a well-written documentation excerpt or textbook explanation — clear, factual, and educational. Pick a specific topic each time such as how React state works, what a hash table is, how Git branching works, or what TCP/IP does. Do not use bullet points or headers, only plain paragraphs. Do not use backticks — write code identifiers inline as plain words.",
  code:
    "Write a typing practice passage that mixes a real code snippet with a plain English explanation of what it does. Do not use backticks — write strings using double quotes or single quotes.",
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
  return sanitize(text);
}

// --- Route handler ---
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") ?? "learn") as PassageCategory;
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
