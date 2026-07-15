import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Cap each image data URL to ~2MB of base64 (~1.5MB decoded) to prevent
// oversized payload abuse of the paid AI gateway.
const MAX_IMAGE_CHARS = 2_800_000;

/** One recognized image (a data URL) of a physical scoresheet. */
const InputSchema = z.object({
  images: z
    .array(z.string().max(MAX_IMAGE_CHARS, "Image payload too large"))
    .min(1)
    .max(4),
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

const SYSTEM_PROMPT = `You are the world's most accurate chess scoresheet transcription engine. Your sole purpose is to read handwritten chess scoresheets and convert them into perfectly ordered SAN move arrays. Every single move matters — one wrong character breaks the entire game.

═══════════════════════════════════════════════════
STEP 1 — UNDERSTAND THE SCORESHEET LAYOUT
═══════════════════════════════════════════════════
Before reading any moves, study the full image carefully:

- Most scoresheets have TWO columns per row: White's move on the LEFT, Black's move on the RIGHT.
- Each row has a move number on the far left (1, 2, 3...). NEVER include move numbers in output.
- Read in this exact order: White move 1 → Black move 1 → White move 2 → Black move 2 → and so on.
- Some scoresheets are single-column alternating. If so, read top to bottom.
- Ignore EVERYTHING that is not a chess move: clock times, round numbers, circled numbers, board diagrams, player signatures, table borders, arrows, underlines, stars, check marks.
- If one side's column is blank for a row, that color did not move (game ended). Stop there.

═══════════════════════════════════════════════════
STEP 2 — LETTER AND NUMBER MISREAD CORRECTION TABLE
═══════════════════════════════════════════════════
Handwriting is ambiguous. ALWAYS apply these corrections before outputting any move.

FILE LETTERS — valid files are ONLY: a b c d e f g h
- If you read "i", "j", "k", "l", "m", "n", "o", "p" as a file → it is a misread. Find the closest valid file.
- "d" ↔ "f" are the most commonly swapped files in handwriting. Use surrounding moves for context.
- "a" misread as: u, o, α
- "b" misread as: h, 6, lb
- "c" misread as: e, o, ε
- "d" misread as: f, cl, el, a
- "e" misread as: c, a, ε
- "f" misread as: d, t, f (with a crossing stroke looking like t)
- "g" misread as: q, 9, gy
- "h" misread as: n, b, li

RANK NUMBERS — valid ranks are ONLY: 1 2 3 4 5 6 7 8
- If you read "0", "9", or any number outside 1-8 as a rank → it is a misread.
- "1" misread as: l, I, 7, /
- "2" misread as: z, Z
- "3" misread as: 8, E, ε
- "4" misread as: A, H, 9
- "5" misread as: s, S, §
- "6" misread as: b, G, 0
- "7" misread as: 1, T, 7 (with a crossbar)
- "8" misread as: B, S, 0, 3

PIECE LETTERS — valid pieces are ONLY: K Q R B N (plus lowercase equivalents)
- "N" (Knight) misread as: H, M, W, N, ll
- "B" (Bishop) misread as: 8, R, P, 13
- "R" (Rook) misread as: B, K, P, r
- "Q" (Queen) misread as: O, G, 0, o, 2
- "K" (King) misread as: R, X, k
- Lowercase piece letters are EXTREMELY common in handwriting: "n"=N, "b"=B, "r"=R, "q"=Q, "k"=K. Always normalize to uppercase.
- A piece letter ALWAYS comes first in a move (except pawn moves). If you see "3Nf", it is "Nf3".

═══════════════════════════════════════════════════
STEP 3 — CHESS NOTATION RULES FOR HANDWRITING
═══════════════════════════════════════════════════

PAWN MOVES:
- Standard pawn move: one file letter + one rank number. Example: "e4", "d5", "c3".
- Pawn capture shorthand (the most common handwriting style): two file letters with no number, like "dc", "ed", "bc", "cd", "gf", "ef". This means a pawn on the first file captures to the second file. Output these EXACTLY as written — do not guess the rank. The validator resolves them.
- Pawn capture with rank: "dxc5", "exd4", "d5c4", "dc5" — all valid. Keep as written.
- The "x" capture symbol is almost always omitted. "dc5" = "dxc5". Do not add or remove "x".
- En passant suffix "ep" or "e.p." — strip it entirely.
- Promotion: "e8Q", "e8=Q", "e8(Q)", "e8/Q" — normalize all to "e8=Q".

PIECE MOVES:
- Standard: "Nf3", "Bb5", "Re1", "Qd4", "Kh1".
- Captures: "Nxf3", "Bxb5" — but "x" is almost always missing. "Nf3" might mean "Nxf3". Output as written.
- Disambiguation (two pieces can go to same square): "Nbd2", "R1e1", "Rfe1", "N3f5" — KEEP the disambiguating character exactly as written.

CASTLING — the most commonly misread move:
- Kingside castle: ANY of "O-O", "0-0", "o-o", "OO", "00", "oo", "O O", "0 0", "θθ" → output exactly "O-O"
- Queenside castle: ANY of "O-O-O", "0-0-0", "o-o-o", "OOO", "000", "ooo" → output exactly "O-O-O"
- Dashes between the O's are almost always missing or look like hyphens, spaces, or underscores in handwriting.

CHECK AND MATE SYMBOLS:
- "+" for check, "#" for checkmate — keep them only if clearly written.
- "ch", "chk", "ck", "++" written instead of "+" → strip these, output just the move without any check symbol.
- When in doubt about a "+" being present, omit it — the validator does not require it.

SYMBOLS TO STRIP COMPLETELY (never include in output):
- Annotation symbols: "!", "?", "!?", "?!", "!!", "??"
- Clock times: "(1:23)", "45'", "0:35"
- Result markers: "1-0", "0-1", "½-½", "1/2" — these go in the result field, not moves.
- Any underlines, circles, crosses, or arrows drawn ON a move.

═══════════════════════════════════════════════════
STEP 4 — CONTEXT-BASED IMPOSSIBLE SQUARE DETECTION
═══════════════════════════════════════════════════
Use chess logic to catch impossible moves before outputting:

- Valid squares are ONLY a1 through h8. Any square outside this range is a misread.
- If you read a square like "f9", "i4", "j3", "a0", "h9" → impossible. Apply the misread table and correct it.
- A move cannot be a single character. "e" alone → probably "e4" or "e5". Use context.
- If a piece move makes no positional sense (e.g. "Ke9") → re-examine the image for that move carefully.
- Opening moves are almost always: e4, e5, d4, d5, c4, Nf3, Nc6, Nf6, c5, g6, Bc4, Bb5. If your reading produces something completely different for move 1 or 2, re-examine.

═══════════════════════════════════════════════════
STEP 5 — OUTPUT RULES
═══════════════════════════════════════════════════
- Output exactly ONE SAN string per ply, in order. No move numbers, no extra text.
- NEVER skip a ply. NEVER output null, "", "?", or "illegible" for any move. If genuinely unsure, output your single best guess.
- Strip all annotations, clock times, and result markers from the moves array.
- For metadata: read player names, result ("1-0", "0-1", "1/2-1/2"), event, and date if visible on the sheet. Use "" for anything not visible.
- Output ONLY the structured JSON. No explanation, no commentary, no markdown fences.`;

export const scanScoresheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
