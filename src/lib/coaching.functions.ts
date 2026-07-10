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
  playerOutcome: z.enum(["win", "loss", "draw", "unknown"]),
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
  hasTimeData: z.boolean().optional(),
  estimatedRatingLow: z.number().optional(),
  estimatedRatingHigh: z.number().optional(),
  estimatedLevelLabel: z.string().optional(),
  estimateConfidence: z.number().optional(),
  mistakes: z.array(MistakeSchema),
});

export type CoachingInput = z.infer<typeof InputSchema>;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    playerSnapshot: {
      type: "object",
      additionalProperties: false,
      properties: {
        playingStyle: { type: "string" },
        biggestStrength: { type: "string" },
        biggestWeakness: { type: "string" },
        recommendedFocus: { type: "string" },
        estimatedLevel: { type: "string" },
        confidenceScore: { type: "number" },
      },
      required: [
        "playingStyle",
        "biggestStrength",
        "biggestWeakness",
        "recommendedFocus",
        "estimatedLevel",
        "confidenceScore",
      ],
    },
    gameSummary: {
      type: "object",
      additionalProperties: false,
      properties: {
        opening: { type: "string" },
        middlegame: { type: "string" },
        endgame: { type: "string" },
        tacticalAwareness: { type: "string" },
        strategicPlanning: { type: "string" },
        pieceActivity: { type: "string" },
        kingSafety: { type: "string" },
        decisionMaking: { type: "string" },
        timeManagement: { type: "string" },
        playingStyle: { type: "string" },
      },
      required: [
        "opening",
        "middlegame",
        "endgame",
        "tacticalAwareness",
        "strategicPlanning",
        "pieceActivity",
        "kingSafety",
        "decisionMaking",
        "timeManagement",
        "playingStyle",
      ],
    },
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
          whatHappened: { type: "string" },
          whyItHappened: { type: "string" },
          betterPlan: { type: "string" },
          keyLesson: { type: "string" },
          patternCategory: { type: "string" },
        },
        required: [
          "whatHappened",
          "whyItHappened",
          "betterPlan",
          "keyLesson",
          "patternCategory",
        ],
      },
    },
    homework: {
      type: "object",
      additionalProperties: false,
      properties: {
        tacticalExercise: { type: "string" },
        strategicGoal: { type: "string" },
        habit: { type: "string" },
        estimatedTime: { type: "string" },
      },
      required: ["tacticalExercise", "strategicGoal", "habit", "estimatedTime"],
    },
  },
  required: [
    "playerSnapshot",
    "gameSummary",
    "biggestStrength",
    "biggestWeakness",
    "mistakes",
    "homework",
  ],
} as const;

const SYSTEM_PROMPT = `You are Project Gambit, a warm, encouraging and precise chess coach for beginner and intermediate players. You speak like a supportive human coach sitting next to the player after their game — conversational, motivating and clear, never robotic.

ABSOLUTE RULES — these are non-negotiable:
- Every evaluation, best move, centipawn loss and principal variation was produced by the Stockfish engine and is given to you as data. You must ONLY explain that data.
- NEVER invent evaluations, blunders, best moves, tactics, or variations. Do not add moves or lines that are not in the provided data.
- If you reference a better move, use exactly the bestMoveSan / bestLineSan provided. Do not guess alternatives.
- Translate the engine numbers into plain-English chess concepts (development, king safety, hanging pieces, pawn structure, tactics, activity, endgame technique). Teach the idea; do not just restate the engine move.
- Address the player directly as "you". Be encouraging, educational and conversational. Keep every field to 1-3 sentences unless noted.

GAME RESULT — CRITICAL: The field "playerOutcome" tells you exactly how the game ended for the player you are coaching: "win", "loss", "draw", or "unknown".
- NEVER assume the player lost. Use "playerOutcome" as the single source of truth for the result.
- If playerOutcome is "win", celebrate the win. If "loss", be constructive about the loss. If "draw", frame it as a draw.
- If playerOutcome is "unknown", DO NOT mention or imply who won or lost anywhere in the report — talk only about move quality and ideas.
- Every summary, coaching paragraph, recommendation and conclusion must be consistent with playerOutcome. A player can play accurately and still win, draw, or lose — never contradict the stated outcome.

TONE: Always start from what the player did well before addressing weaknesses. Even hard feedback should feel constructive and hopeful. Avoid jargon dumps — explain concepts simply.

COACHING VOICE: Never output raw engine phrasing like "Move 15 was a blunder." Instead speak like a human coach: describe the idea the player was going for, why the moment went wrong, and the better plan — e.g. "You spotted an active attacking idea here, but launched it before your pieces were coordinated; finishing development first would have made the attack far stronger." Always be encouraging, constructive, conversational and educational — never insulting or robotic.

ESTIMATES: An objective, engine-based rating estimate for this player is computed separately and passed to you as "estimatedRatingLow", "estimatedRatingHigh", "estimatedLevelLabel" and "estimateConfidence". When these are present you MUST use that exact range and label for "playerSnapshot.estimatedLevel" (format it like "Intermediate club player (~1500-1700)") and set "confidenceScore" to the provided "estimateConfidence". NEVER invent a different rating or contradict this range — it is derived from the whole game's centipawn loss and mistake pattern, which is far more reliable than a guess. Only if these fields are absent may you estimate a friendly range yourself from accuracy, centipawn loss and the move-classification mix.

MISTAKE CARDS: For each mistake produce (1) whatHappened — describe the move and its effect in plain terms; (2) whyItHappened — the likely thinking trap behind it; (3) betterPlan — the improvement, using the provided bestMoveSan/bestLineSan; (4) keyLesson — a short takeaway; (5) patternCategory — a 1-3 word label such as "Premature Attack", "Loose Piece", "Missed Tactic", "King Safety", "Passive Piece", "Pawn Weakness".

GAME SUMMARY: Cover opening, middlegame, endgame, tactical awareness, strategic planning, piece activity, king safety, decision making and time management, each 1-2 sentences. For "decisionMaking", comment on how well the player chose between candidate ideas and handled critical moments. If time data is not available, briefly note that pacing could not be measured and give general guidance. Finish "gameSummary.playingStyle" with ONE sentence describing the player's overall style.

HOMEWORK: Give one concrete tactical exercise, one strategic goal, one habit to remember, and a realistic estimated practice time (e.g. "15-20 minutes").

You will receive JSON describing one player's performance in a single game.`;

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
    input.playerOutcome === "unknown"
      ? "The game result is UNKNOWN — do not mention or imply who won or lost anywhere in the report."
      : `The player's result in this game was a ${input.playerOutcome.toUpperCase()}. Keep every reference to the result consistent with this and never assume a loss.`,
    input.hasTimeData
      ? "Clock/time data IS available for this game; comment on time management accordingly."
      : "No clock/time data is available; note that pacing could not be measured and give general time-management guidance.",
    input.estimatedRatingLow != null && input.estimatedRatingHigh != null
      ? `The engine-based rating estimate for this player is approximately ${input.estimatedRatingLow}-${input.estimatedRatingHigh} (${input.estimatedLevelLabel ?? ""}), confidence ${input.estimateConfidence ?? ""}/100. Use this exact range and label for "playerSnapshot.estimatedLevel" and set "confidenceScore" to this confidence. Do not contradict it anywhere.`
      : "No precomputed rating estimate was provided; estimate a friendly range yourself.",
    'The "playerSnapshot" fields must be short (a few words each), while "gameSummary" and mistake fields can be 1-2 sentences.',
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