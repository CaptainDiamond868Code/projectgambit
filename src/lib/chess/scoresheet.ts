import { Chess } from "chess.js";
import type { GameMeta } from "./types";

export interface MoveEntry {
  /** The SAN text the user currently has for this ply. */
  san: string;
  /** Whether this move is legal given all prior moves. */
  legal: boolean;
  /** Full-move number for display (1, 1, 2, 2, ...). */
  moveNumber: number;
  /** "white" | "black" for display. */
  color: "white" | "black";
}

export interface ValidationResult {
  entries: MoveEntry[];
  /** Valid PGN built from the legal prefix (or full game when all legal). */
  pgn: string;
  allLegal: boolean;
  legalCount: number;
  /** Index of the first illegal/unparseable ply, or -1 when all legal. */
  firstIllegalIndex: number;
}

/**
 * Validate a sequence of SAN moves by replaying them with chess.js. Illegal or
 * unrecognized moves are flagged rather than guessed, and everything after the
 * first illegal move is marked illegal too (it cannot be validated reliably).
 */
export function validateMoves(moves: string[], meta?: Partial<GameMeta>): ValidationResult {
  const chess = new Chess();
  const entries: MoveEntry[] = [];
  let firstIllegalIndex = -1;

  moves.forEach((raw, i) => {
    const san = raw.trim();
    const moveNumber = Math.floor(i / 2) + 1;
    const color: "white" | "black" = i % 2 === 0 ? "white" : "black";

    if (firstIllegalIndex !== -1) {
      entries.push({ san, legal: false, moveNumber, color });
      return;
    }

    let legal = false;
    if (san) {
      try {
        const move = chess.move(san);
        legal = !!move;
      } catch {
        legal = false;
      }
    }
    if (!legal) firstIllegalIndex = i;
    entries.push({ san, legal, moveNumber, color });
  });

  if (meta) {
    if (meta.white) chess.header("White", meta.white);
    if (meta.black) chess.header("Black", meta.black);
    if (meta.result) chess.header("Result", meta.result);
    if (meta.event) chess.header("Event", meta.event);
    if (meta.date) chess.header("Date", meta.date);
  }

  const legalCount = firstIllegalIndex === -1 ? moves.length : firstIllegalIndex;
  return {
    entries,
    pgn: chess.pgn(),
    allLegal: firstIllegalIndex === -1 && moves.length >= 2,
    legalCount,
    firstIllegalIndex,
  };
}
