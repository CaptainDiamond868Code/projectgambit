import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CoachingReport } from "./chess/types";

const MistakeSchema = z.object({
  moveNumber: z.number(),
  san: z.string(),
  classification: z.string(),
  centipawnLoss: z.number(),
  phase: z.string(),
  evalBeforeText: z.string(),
  evalAfterText: z.string(),
  bestMoveSan: z.string().nullable(),
  bestLineSan: z.array(z.string()),
});

const InputSchema = z.object({
  playerColor: z.enum(["white", "black"]),
  playerName: z.string(),
  opponentName: z.string(),
  result: z.string(),
  accuracy: z.number(),
  averageCentipawnLoss: z.number(),
  counts: z.object({
    best: z.number(),
    excellent: z.number(),
    good: z.number(),
    inaccuracy: z.number(),
    mistake: z.number(),
    blunder: z.number(),
  }),
  totalMoves: z.number(),
  opening: z.string().optional(),
  mistakes: z.array(MistakeSchema),
});

export type CoachingInput = z.infer<typeof InputSchema>;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallSummary: { type: "string" },
    biggestStrength: {
      type: "object",
      additionalProperties: false,
      properties: { title: { type: "string" }, detail: { type: "string" } },
      required: ["title", "detail"],
    },
    biggestWeakness: {
      type: "object",
      additionalProperties: false,
      properties: { title: { type: "string" }, detail: { type: "string" } },
      required: ["title", "detail"],
    },
    mistakes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          whyItMattered: { type: "string" },
          betterIdea: { type: "string" },
          remember: { type: "string" },
        },
        required: ["whyItMattered", "betterIdea", "remember"],
      },
    },
    recommendation: { type: "string" },
  },
  required: [
    "overallSummary",
    "biggestStrength",
    "biggestWeakness",
    "mistakes",
    "recommendation",
  ],
} as const;

const SYSTEM_PROMPT = `You are Project Gambit, a warm, encouraging and precise chess coach for beginner and intermediate players.

ABSOLUTE RULES — these are non-negotiable:
- Every evaluation, best move, centipawn loss and principal variation was produced by the Stockfish engine and is given to you as data. You must ONLY explain that data.
- NEVER invent evaluations, blunders, best moves, tactics, or variations. Do not add moves or lines that are not in the provided data.
- If you reference a better move, use exactly the bestMoveSan / bestLineSan provided. Do not guess alternatives.
- Translate the engine numbers into plain-English chess concepts (development, king safety, hanging pieces, pawn structure, tactics, activity, endgame technique). Teach the idea; do not just restate the engine move.
- Be specific, motivating and concise. Address the player directly as "you". Keep each field to 1-3 sentences.

You will receive JSON describing one player's performance in a single game. Produce a coaching report that answers: What did I do well? Which mistakes mattered most? What weakness is holding me back? What should I practice next?`;

function buildUserPrompt(input: CoachingInput): string {
  return [
    "Here is the Stockfish-derived data for the player you are coaching.",
    "Explain it as a coaching report. Only use these facts.",
    "",
    JSON.stringify(input, null, 2),
    "",
    `Provide exactly ${input.mistakes.length} entries in "mistakes", in the same order as the input mistakes array.`,
    'For "biggestStrength" identify one thing the numbers show the player did consistently well (e.g. low blunder count, accurate opening, few inaccuracies).',
    'For "biggestWeakness" identify the single recurring theme behind the mistakes.',
    'End "recommendation" with one concrete thing to practice before the next games.',
  ].join("\n");
}

export const generateCoachingReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<CoachingReport> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI coach is not configured (missing LOVABLE_API_KEY).");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(data) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "coaching_report",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });

    if (response.status === 429) {
      throw new Error("The AI coach is busy right now. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits are exhausted. Add credits to keep generating reports.");
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`AI coach request failed (${response.status}). ${text.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("The AI coach returned an empty response.");
    }

    return JSON.parse(content) as CoachingReport;
  });