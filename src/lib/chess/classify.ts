import type { Color, Evaluation, GamePhase, MoveClassification } from "./types";

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