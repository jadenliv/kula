/**
 * source-lookup — Supabase Edge Function (Deno)
 *
 * Flow:
 *   1. Verify the caller is authenticated (Supabase JWT)
 *   2. Ask Claude to identify 3–5 specific Torah source refs for the query
 *   3. Fetch the actual text for each ref from Sefaria's public texts API
 *   4. Return { synthesis, sources } — real text, no hallucinated quotes
 *
 * Env vars required:
 *   ANTHROPIC_API_KEY   — Anthropic API key
 *   SUPABASE_URL        — injected automatically by Supabase
 *   SUPABASE_ANON_KEY   — injected automatically by Supabase
 *
 * Model: claude-haiku-4-5 — fast & cost-effective for this high-volume lookup
 * use case. Swap to claude-opus-4-7 in the body below for deeper analysis.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourceHit {
  ref: string;
  heRef: string;
  /** First ~350 chars of the English text (or a note if unavailable) */
  text: string;
  /** First ~200 chars of the Hebrew */
  heText: string;
  url: string;
}

export interface SourceLookupResult {
  synthesis: string;
  sources: SourceHit[];
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // ── Parse body ────────────────────────────────────────────────────────────
  let query: string;
  try {
    const body = await req.json();
    query = (body.query ?? "").trim();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!query) return json({ error: "query is required" }, 400);
  if (query.length > 300) return json({ error: "query too long (max 300 chars)" }, 400);

  // ── Step 1: ask Claude for refs + synthesis ───────────────────────────────
  const claudeRaw = await askClaude(query);
  if (!claudeRaw) return json({ error: "Claude API error" }, 502);

  // ── Step 2: fetch real text from Sefaria for each ref ─────────────────────
  const sources = await fetchSefariaTexts(claudeRaw.refs);

  return json({ synthesis: claudeRaw.synthesis, sources });
});

// ---------------------------------------------------------------------------
// Claude — identify refs + write synthesis in one call
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `\
You are a Torah source locator embedded in a Jewish learning app. Your sole purpose is to help
users find where things are written in Torah literature. You locate and describe sources — you
do not rule on halachic questions or tell people what they should or should not do.

────────────────────────────────────────
WHAT YOU DO
────────────────────────────────────────
When a user asks where something is written, what a text says about a topic, or wants sources
on a concept, identify 3–5 specific Torah source references and write a brief, descriptive
synthesis explaining what those sources say — not what the user should do.

────────────────────────────────────────
WHAT YOU DO NOT DO
────────────────────────────────────────
If the question is asking for a practical halachic ruling — "Can I do X?", "Is X permitted?",
"What should I do about X?", "Is X kosher?" — do NOT answer it. Instead, set synthesis to a
polite explanation that this tool locates sources but does not issue rulings, and that they
should consult their rabbi for practical guidance. Return an empty refs array.

────────────────────────────────────────
RULES FOR REFS
────────────────────────────────────────
- Only include refs you are highly confident exist (correct tractate, folio, chapter, paragraph).
- Use standard Sefaria ref format exactly: "Berakhot 2a", "Shulchan Arukh, Orach Chaim 271:1",
  "Mishnah Avot 1:1", "Deuteronomy 6:4", "Rambam, Laws of Shabbat 5:1", etc.
- Use standard English-Jewish transliteration: Shabbat, berakhah, halakhah, tzedakah, etc.
- If you are not confident a ref exists, omit it. Return fewer refs rather than guessing.
- Do NOT invent, paraphrase, or fabricate references. The actual text will be fetched live
  from Sefaria — your ref must match exactly what Sefaria indexes.

────────────────────────────────────────
RESPONSE FORMAT
────────────────────────────────────────
Respond with ONLY valid JSON — no markdown fences, no extra keys:
{
  "synthesis": "...",
  "refs": ["Berakhot 2a", "..."]
}

For declined halachic questions:
{
  "synthesis": "This tool locates Torah sources but does not rule on halachic questions. For practical guidance, please consult your rabbi.",
  "refs": []
}`;

interface ClaudeResult {
  synthesis: string;
  refs: string[];
}

async function askClaude(query: string): Promise<ClaudeResult | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return null;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      // claude-haiku-4-5: fast & cost-effective for lookup.
      // Change to "claude-opus-4-7" for deeper, more nuanced analysis.
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Claude API error", res.status, err);
    return null;
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(text) as ClaudeResult;
    return {
      synthesis: parsed.synthesis ?? "",
      refs: Array.isArray(parsed.refs) ? parsed.refs.slice(0, 6) : [],
    };
  } catch {
    // Claude didn't return valid JSON — surface as synthesis with no refs
    return { synthesis: text, refs: [] };
  }
}

// ---------------------------------------------------------------------------
// Sefaria — fetch actual text for a list of refs
// ---------------------------------------------------------------------------

async function fetchSefariaTexts(refs: string[]): Promise<SourceHit[]> {
  if (refs.length === 0) return [];

  const results = await Promise.allSettled(
    refs.map((ref) => fetchOneRef(ref)),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<SourceHit | null> =>
        r.status === "fulfilled" && r.value !== null,
    )
    .map((r) => r.value!);
}

async function fetchOneRef(ref: string): Promise<SourceHit | null> {
  // Sefaria uses underscores for spaces in URL paths
  const encodedRef = encodeURIComponent(ref.replace(/ /g, "_"));
  const url =
    `https://www.sefaria.org/api/texts/${encodedRef}?lang=bi&context=0&stripItags=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.error) return null;

    // `text` and `he` can be a string, an array, or nested arrays.
    const en = flattenText(data.text);
    const he = flattenText(data.he);

    if (!en && !he) return null;

    const sefariaPath = data.url ?? `/${encodedRef}`;

    return {
      ref: data.ref ?? ref,
      heRef: data.heRef ?? "",
      text: en.slice(0, 400),
      heText: he.slice(0, 250),
      url: `https://www.sefaria.org${sefariaPath}?lang=bi`,
    };
  } catch {
    return null;
  }
}

/** Flatten a string | string[] | string[][] into a single plain string. */
function flattenText(value: unknown): string {
  if (typeof value === "string") return stripHtml(value);
  if (Array.isArray(value)) {
    return value
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v) => typeof v === "string" && v.trim())
      .map(stripHtml)
      .join(" ")
      .trim();
  }
  return "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
