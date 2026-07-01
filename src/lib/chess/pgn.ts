import { Chess } from "chess.js";
import type { GameMeta } from "./types";

export interface ParsedGame {
  meta: GameMeta;
  /** Verbose move list from chess.js. */
  moveCount: number;
  pgn: string;
}

export interface PgnValidationResult {
  valid: boolean;
  error?: string;
  game?: ParsedGame;
}

/**
 * Validate and parse a PGN string using chess.js. Returns structured metadata
 * so the UI can preview the game before spending time on engine analysis.
 */
export function validatePgn(pgn: string): PgnValidationResult {
  const trimmed = pgn.trim();
  if (!trimmed) {
    return { valid: false, error: "The file is empty. Please provide a PGN game." };
  }

  const chess = new Chess();
  try {
    chess.loadPgn(trimmed, { sloppy: true } as never);
  } catch (err) {
    return {
      valid: false,
      error:
        err instanceof Error
          ? `This doesn't look like a valid PGN: ${err.message}`
          : "This doesn't look like a valid PGN game.",
    };
  }

  const history = chess.history();
  if (history.length < 2) {
    return {
      valid: false,
      error: "This PGN has too few moves to analyze. Upload a completed game.",
    };
  }

  const headers = chess.header();
  const meta: GameMeta = {
    white: headers.White || "White",
    black: headers.Black || "Black",
    result: headers.Result || "*",
    event: headers.Event || undefined,
    date: headers.Date || undefined,
    opening: headers.Opening || undefined,
    eco: headers.ECO || undefined,
  };

  return {
    valid: true,
    game: { meta, moveCount: history.length, pgn: trimmed },
  };
}

export function detectPlayerColor(meta: GameMeta): "white" | "black" | null {
  return null; // Player identity is unknown; the user selects their side.
}