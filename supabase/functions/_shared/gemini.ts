// Gemini REST client: structured (JSON schema) and grounded (Google Search) modes.
const API = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 110_000;

export class GeminiBusy extends Error {} // 429/503 after one retry: try again in an hour

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface GeminiResult<T = unknown> {
  text: string;
  json: T | null;
  grounding: GroundingLink[];
}

export interface GeminiCall {
  model: string;
  prompt: string;
  system?: string;
  schema?: Record<string, unknown>; // structured mode
  grounded?: boolean; // google_search tool (no schema allowed)
  temperature?: number;
}

async function post(model: string, body: unknown) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Finds one JSON value in free text (```json block, or the outermost {...})
export function parseLenient<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.indexOf("{");
    const end = c.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      return JSON.parse(c.slice(start, end + 1)) as T;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export async function gemini<T = unknown>(call: GeminiCall): Promise<GeminiResult<T>> {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: call.prompt }] }],
    generationConfig: {
      temperature: call.temperature ?? 0.7,
      ...(call.schema && !call.grounded
        ? { responseMimeType: "application/json", responseSchema: call.schema }
        : {}),
    },
  };
  if (call.system) body.systemInstruction = { parts: [{ text: call.system }] };
  if (call.grounded) body.tools = [{ google_search: {} }];

  let res = await post(call.model, body);
  if (res.status === 429 || res.status === 503) {
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, 20_000));
    res = await post(call.model, body);
    if (res.status === 429 || res.status === 503) {
      await res.body?.cancel();
      throw new GeminiBusy(`Gemini ${res.status}`);
    }
  }
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const cand = data?.candidates?.[0];
  const text: string = (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new Error(`Gemini returned no text (${cand?.finishReason ?? "no candidate"})`);

  const grounding: GroundingLink[] = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map((c: { web?: { uri?: string; title?: string } }) => ({ uri: c.web?.uri ?? "", title: c.web?.title ?? "" }))
    .filter((g: GroundingLink) => g.uri);

  let parsed: T | null = null;
  if (call.schema && !call.grounded) {
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      parsed = parseLenient<T>(text);
    }
  } else {
    parsed = parseLenient<T>(text);
  }
  return { text, json: parsed, grounding };
}
