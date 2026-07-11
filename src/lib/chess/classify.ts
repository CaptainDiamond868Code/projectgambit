import type { Color, Evaluation, GamePhase, MoveClassification, PlayerStats } from "./types";

/** Clamp used so that decisive/mate positions don't create absurd CPL values. */
const EVAL_CAP = 1000;

export type GameOutcome = "win" | "loss" | "draw" | "unknown";

/**
 * Determine, from the PGN result tag and the side the player chose, whether the
 * analyzed player won, lost or drew. Returns "unknown" for missing/unfinished
 * results ("*") so the coach never guesses the outcome.
 */
export function resolveOutcome(result: string | undefined, color: Color): GameOutcome {
  const r = (result ?? "").trim();
  if (r === "1-0") return color === "white" ? "win" : "loss";
  if (r === "0-1") return color === "black" ? "win" : "loss";
  if (r === "1/2-1/2" || r === "½-½" || r === "0.5-0.5") return "draw";
  return "unknown";
}

/** Short human label for an outcome, or null when it can't be determined. */
export function outcomeLabel(outcome: GameOutcome): string | null {
  switch (outcome) {
    case "win":
      return "Win";
    case "loss":
      return "Loss";
    case "draw":
      return "Draw";
    default:
      return null;
  }
}

/**
 * Convert a Stockfish evaluation (already normalized to White POV) into a
 * single centipawn number for comparison, capping decisive scores.
 */
export function evalToNumber(evaluation: Evaluation): number {
  if (evaluation.mate != null) {
    return evaluation.mate > 0 ? EVAL_CAP : -EVAL_CAP;
  }
  if (evaluation.cp == null) return 0;
  return Math.max(-EVAL_CAP, Math.min(EVAL_CAP, evaluation.cp));
}

/** Human-readable eval string from White's perspective (e.g. "+1.4", "M3"). */
export function formatEval(evaluation: Evaluation): string {
  if (evaluation.mate != null) {
    return evaluation.mate > 0 ? `M${evaluation.mate}` : `-M${Math.abs(evaluation.mate)}`;
  }
  if (evaluation.cp == null) return "0.0";
  const pawns = evaluation.cp / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(1)}`;
}

/**
 * Centipawn loss for the side that just moved.
 * evalBefore/evalAfter are both White-POV numbers.
 */
export function centipawnLoss(
  color: Color,
  evalBefore: number,
  evalAfter: number,
): number {
  const loss = color === "white" ? evalBefore - evalAfter : evalAfter - evalBefore;
  return Math.max(0, Math.round(loss));
}

export function classifyMove(
  cpl: number,
  playedIsBest: boolean,
): MoveClassification {
  if (playedIsBest || cpl <= 5) return "best";
  if (cpl < 25) return "excellent";
  if (cpl < 60) return "good";
  if (cpl < 120) return "inaccuracy";
  if (cpl < 250) return "mistake";
  return "blunder";
}

/** Rough game-phase heuristic based on ply number. */
export function phaseForPly(ply: number, totalPlies: number): GamePhase {
  if (ply < 20) return "opening";
  if (ply >= totalPlies - 20 && totalPlies > 40) return "endgame";
  return "middlegame";
}

/**
 * Accuracy from average centipawn loss. Uses a smooth exponential falloff so
 * that clean play scores high and blunder-heavy play scores low.
 */
export function accuracyFromAcpl(acpl: number): number {
  const acc = 100 * Math.exp(-acpl / 350);
  return Math.round(Math.max(10, Math.min(100, acc)));
}

export const CLASSIFICATION_LABELS: Record<MoveClassification, string> = {
  best: "Best",
  excellent: "Excellent",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

export const CLASSIFICATION_ORDER: MoveClassification[] = [
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
];

/**
 * Objective, engine-derived estimate of a player's strength for a single game.
 * This is intentionally deterministic (never AI-guessed) so it stays believable.
 */
export interface StrengthEstimate {
  /** Low end of the estimated rating range (rounded to 50). */
  low: number;
  /** High end of the estimated rating range (rounded to 50). */
  high: number;
  /** Centre of the range. */
  centre: number;
  /** Human label for the centre (e.g. "Intermediate club player"). */
  label: string;
  /** 0-100 confidence, capped for a single game. */
  confidence: number;
  confidenceLabel: "Low" | "Moderate" | "Good";
  /** How many of the player's own moves fed the estimate. */
  sampleMoves: number;
}

/** Anchor points mapping average centipawn loss → approximate Elo. */
const ACPL_ANCHORS: Array<[number, number]> = [
  [3,   2800],
  [8,   2650],
  [14,  2500],
  [22,  2350],
  [32,  2200],
  [44,  2000],
  [58,  1750],
  [76,  1500],
  [100, 1250],
  [135, 1050],
  [180, 850],
  [250, 650],
];

function acplToElo(acpl: number): number {
  const a = ACPL_ANCHORS;
  if (acpl <= a[0][0]) return a[0][1];
  if (acpl >= a[a.length - 1][0]) return a[a.length - 1][1];
  for (let i = 0; i < a.length - 1; i++) {
    const [x0, y0] = a[i];
    const [x1, y1] = a[i + 1];
    if (acpl >= x0 && acpl <= x1) {
      const t = (acpl - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return 1200;
}

function levelLabel(elo: number): string {
  if (elo >= 2400) return "Master-level";
  if (elo >= 2200) return "Candidate Master";
  if (elo >= 2000) return "Expert";
  if (elo >= 1800) return "Advanced player";
  if (elo >= 1500) return "Intermediate player";
  if (elo >= 1200) return "Developing player";
  if (elo >= 900) return "Improving beginner";
  return "Beginner";
}

/**
 * Estimate playing strength from the whole game using several engine signals —
 * average centipawn loss (primary), blunder/mistake/inaccuracy frequency, and
 * share of clean moves — rather than any single number. Confidence and range
 * width scale with sample size and consistency; a single game is capped below
 * full confidence because one game can't pin down a rating precisely.
 */
export function estimatePlayingStrength(
  stats: PlayerStats,
  ownMoveCount: number,
): StrengthEstimate {
  const acpl = stats.averageCentipawnLoss;
  const n = Math.max(1, ownMoveCount);
  const c = stats.counts;
  const blunderRate = c.blunder / n;
  const mistakeRate = c.mistake / n;
  const inaccRate = c.inaccuracy / n;
  const cleanShare = (c.best + c.excellent) / n;

  const baseElo = acplToElo(acpl);
  const secondaryNudge =
    -(blunderRate * 50) -
    (mistakeRate * 20) -
    (inaccRate * 5) +
    (cleanShare - 0.5) * 30;
  const clampedNudge = Math.max(-75, Math.min(50, secondaryNudge));
  let elo = Math.max(300, Math.min(2800, baseElo + clampedNudge));
  const centre = Math.round(elo / 50) * 50;

  const sizeConf = Math.min(1, n / 30);
  const consistency = 1 - Math.min(1, blunderRate * 4 + mistakeRate * 2);
  let confidence = Math.round((sizeConf * 0.6 + consistency * 0.4) * 75);
  confidence = Math.max(20, Math.min(80, confidence));

  const width = Math.max(100, Math.round((260 - confidence * 1.8) / 50) * 50);
  const low = Math.max(300, Math.round((centre - width) / 50) * 50);
  const high = Math.min(2900, Math.round((centre + width) / 50) * 50);
  const confidenceLabel = confidence >= 65 ? "Good" : confidence >= 45 ? "Moderate" : "Low";

  return { low, high, centre, label: levelLabel(centre), confidence, confidenceLabel, sampleMoves: n };
}
