import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** One recognized image (a data URL) of a physical scoresheet. */
const InputSchema = z.object({
  images: z.array(z.string()).min(1).max(4),
});

export interface ScoresheetScanResult {
  white: string;
  black: string;
  result: string;
  event: string;
  date: string;
  /** SAN moves in ply order, as recognized by the model. */
  moves: string[];
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    white: { type: "string" },
    black: { type: "string" },
    result: { type: "string" },
    event: { type: "string" },
    date: { type: "string" },
    moves: { type: "array", items: { type: "string" } },
  },
  required: ["white", "black", "result", "event", "date", "moves"],
} as const;

const SYSTEM_PROMPT = `You are a chess scoresheet OCR specialist. You are given photo(s) of a handwritten or printed chess scoresheet using algebraic notation.

Your job:
- Read the moves in order and output them as an array of SAN moves, one entry per ply (half-move). For example a scoresheet showing "1. e4 e5 2. Nf3 Nc6" becomes ["e4","e5","Nf3","Nc6"].
- Do NOT include move numbers, result markers, annotations, clock times or symbols like "+", "#", "!?" unless they are genuine SAN (a trailing "+" for check or "#" for mate is fine to keep).
- Normalize obvious handwriting into standard SAN: piece letters K Q R B N, files a-h, ranks 1-8, "O-O" / "O-O-O" for castling, "x" for captures.
- If a move is illegible or you are unsure, still provide your single best guess for that ply so the user can correct it — never skip a ply.
- Read metadata if present: white player, black player, result (e.g. "1-0", "0-1", "1/2-1/2"), event, and date. Use an empty string for anything not present.

Output ONLY the structured JSON. Do not invent moves that are not on the sheet.`;

export const scanScoresheet = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<ScoresheetScanResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("Scoresheet scanning is not configured (missing LOVABLE_API_KEY).");
    }

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: "Transcribe this chess scoresheet into ordered SAN moves and metadata.",
      },
      ...data.images.map((url) => ({
        type: "image_url",
        image_url: { url },
      })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "scoresheet",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });

    if (response.status === 429) {
      throw new Error("The scanner is busy right now. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits are exhausted. Add credits to keep scanning scoresheets.");
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Scoresheet scan failed (${response.status}). ${text.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error("The scanner returned an empty response.");
    }

    const parsed = JSON.parse(raw) as ScoresheetScanResult;
    return {
      white: parsed.white ?? "",
      black: parsed.black ?? "",
      result: parsed.result ?? "",
      event: parsed.event ?? "",
      date: parsed.date ?? "",
      moves: Array.isArray(parsed.moves) ? parsed.moves.map((m) => String(m).trim()).filter(Boolean) : [],
    };
  });
