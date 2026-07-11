import { Chess } from "chess.js";
import type { Move } from "chess.js";
import type { GameMeta } from "./types";

/**
 * How a single OCR token was resolved against the real board position:
 *  - legal:     matched a legal move exactly as written
 *  - corrected: matched exactly one legal move after lenient interpretation
 *               (abbreviations, missing "x", casing, "dc"/"ed5" shorthand …)
 *  - ambiguous: several legal moves fit the notation — the user must choose
 *  - illegal:   no legal move fits, even after interpretation
 *  - unchecked: a prior move is unresolved, so this one can't be validated yet
 */
export type MoveStatus = "legal" | "corrected" | "ambiguous" | "illegal" | "unchecked";

export interface MoveEntry {
  /** The raw OCR / user text for this ply (what the input box shows). */
  raw: string;
  /** Resolved SAN when legal/corrected, otherwise the raw text. */
  san: string;
  status: MoveStatus;
  /** True when the resolved SAN differs from what was written. */
  corrected: boolean;
  /** Legal SAN moves that fit, when status === "ambiguous". */
  candidates?: string[];
  /** Human explanation of a correction / rejection. */
  note?: string;
  /** Full-move number for display (1, 1, 2, 2, ...). */
  moveNumber: number;
  /** "white" | "black" for display. */
  color: "white" | "black";
  /** @deprecated kept for compatibility — true when status is legal/corrected. */
  legal: boolean;
}

export interface ValidationResult {
  entries: MoveEntry[];
  /** Valid PGN built from the resolved prefix (or full game when all resolved). */
  pgn: string;
  /** True when every move is resolved (legal or corrected) and analyzable. */
  allLegal: boolean;
  /** Number of resolved (legal + corrected) moves. */
  legalCount: number;
  /** Number of moves that were auto-corrected from imperfect notation. */
  correctedCount: number;
  /** Number of moves needing user attention (ambiguous + illegal). */
  issueCount: number;
  /** Index of the first move needing attention, or -1 when all resolved. */
  firstIllegalIndex: number;
}

interface Interpretation {
  status: "legal" | "corrected" | "ambiguous" | "illegal";
  san?: string;
  move?: Move;
  candidates?: string[];
  note?: string;
}

const stripCheck = (s: string): string => s.replace(/[+#]/g, "");

/** Remove annotations, spaces, en-passant marks and separators from a token. */
function stripDecorations(t: string): string {
  return t
    .replace(/\s+/g, "")
    .replace(/e\.?p\.?$/i, "")
    .replace(/[!?]+/g, "")
    .replace(/[+#]/g, "")
    .replace(/\./g, "");
}

/** Detect castling written in any common shorthand (O-O, 0-0, oo, o-o-o …). */
function detectCastle(t: string): "O-O" | "O-O-O" | null {
  const c = t.replace(/\s+/g, "").replace(/[+#]/g, "").toLowerCase().replace(/0/g, "o");
  if (/^o(-?o){2}$/.test(c)) return "O-O-O";
  if (/^o-?o$/.test(c)) return "O-O";
  return null;
}

/**
 * Build the set of notations a given legal move can reasonably be written as,
 * so we can match sloppy handwriting against the actual legal move. `exact`
 * preserves standard casing; `loose` is the lowercased fallback.
 */
function moveKeys(m: Move): { exact: Set<string>; loose: Set<string> } {
  const keys = new Set<string>();
  const toFile = m.to[0];
  const toRank = m.to[1];
  const fromFile = m.from[0];
  const fromRank = m.from[1];
  const isCapture = m.flags.includes("c") || m.flags.includes("e");
  const promo = m.promotion ? m.promotion.toUpperCase() : "";

  keys.add(stripCheck(m.san).replace(/=/g, "").replace(/[xX]/g, ""));

  if (m.piece === "p") {
    const dests = isCapture
      ? [fromFile + toFile, fromFile + toFile + toRank]
      : [toFile + toRank];
    for (const d of dests) {
      keys.add(d);
      if (promo) keys.add(d + promo);
    }
  } else {
    const P = m.piece.toUpperCase();
    keys.add(P + toFile + toRank);
    keys.add(P + fromFile + toFile + toRank);
    keys.add(P + fromRank + toFile + toRank);
    keys.add(P + fromFile + fromRank + toFile + toRank);
  }

  const loose = new Set<string>();
  for (const k of keys) loose.add(k.toLowerCase());
  return { exact: keys, loose };
}

/**
 * Interpret one handwritten token against the current legal position. Behaves
 * like a chess player reading a scoresheet: it accepts anything that maps to a
 * single legal move, asks (ambiguous) when several fit, and only rejects when
 * nothing legal matches.
 */
function interpret(chess: Chess, raw: string): Interpretation {
  const trimmed = raw.trim();
  if (!trimmed) return { status: "illegal", note: "Empty move." };

  const legal = chess.moves({ verbose: true }) as Move[];

  // Castling in any shorthand.
  const castle = detectCastle(trimmed);
  if (castle) {
    const m = legal.find((mm) => stripCheck(mm.san) === castle);
    if (m) {
      const wrote = stripCheck(trimmed).replace(/0/g, "O").toUpperCase();
      return { status: wrote === castle ? "legal" : "corrected", san: m.san, move: m };
    }
    return { status: "illegal", note: "Castling isn't legal in this position." };
  }

  // Perfect SAN (ignoring check symbols) — accept as-is.
  const exactSan = legal.find((mm) => stripCheck(mm.san) === stripCheck(trimmed));
  if (exactSan) return { status: "legal", san: exactSan.san, move: exactSan };

  const token = stripDecorations(trimmed).replace(/[xX]/g, "").replace(/=/g, "");
  if (!token) return { status: "illegal", note: "Unreadable move." };
  const tLower = token.toLowerCase();

  // Prefer correctly-cased matches, then fall back to case-insensitive, then to
  // a bare destination square (OCR dropped the piece letter).
  let matches = legal.filter((m) => moveKeys(m).exact.has(token));
  if (matches.length === 0) matches = legal.filter((m) => moveKeys(m).loose.has(tLower));
  if (matches.length === 0 && /^[a-h][1-8]$/.test(tLower)) {
    matches = legal.filter((m) => m.to === tLower);
  }

  // Final fallback: the OCR may have misread or added a stray piece letter but
  // still captured the destination square (e.g. "Rf3" when only Nf3 reaches f3,
  // or "Ncd4" mangled). If the token ends in a square and exactly one legal
  // move lands there, an experienced reader would accept it — so do we.
  if (matches.length === 0) {
    const dest = tLower.match(/([a-h][1-8])$/);
    if (dest) {
      matches = legal.filter((m) => m.to === dest[1]);
    }
  }

  const uniq = Array.from(new Map(matches.map((m) => [m.san, m])).values());
  if (uniq.length === 1) {
    const m = uniq[0];
    return { status: "corrected", san: m.san, move: m, note: `Read as ${stripCheck(m.san)}.` };
  }
  if (uniq.length > 1) {
    return {
      status: "ambiguous",
      candidates: uniq.map((m) => m.san),
      note: "Several legal moves match this notation.",
    };
  }
  return { status: "illegal", note: "No legal move matches this notation." };
}

/**
 * Validate a sequence of OCR move tokens by reconstructing the board move by
 * move and interpreting each token against the real legal position. Imperfect
 * but unambiguous notation is auto-corrected; genuinely ambiguous or illegal
 * moves are flagged individually so the user can fix just those.
 */
export function validateMoves(moves: string[], meta?: Partial<GameMeta>): ValidationResult {
  const chess = new Chess();
  const entries: MoveEntry[] = [];
  let blocked = false;
  let firstIllegalIndex = -1;
  let legalCount = 0;
  let correctedCount = 0;
  let issueCount = 0;

  moves.forEach((raw, i) => {
    const moveNumber = Math.floor(i / 2) + 1;
    const color: "white" | "black" = i % 2 === 0 ? "white" : "black";

    // Once a move is unresolved the board state is unknown, so later moves
    // can't be validated — keep them as editable, non-red "unchecked" entries
    // instead of falsely marking them illegal.
    if (blocked) {
      entries.push({
        raw,
        san: raw.trim(),
        status: "unchecked",
        corrected: false,
        moveNumber,
        color,
        legal: false,
      });
      return;
    }

    const res = interpret(chess, raw);

    if ((res.status === "legal" || res.status === "corrected") && res.move) {
      try {
        chess.move({ from: res.move.from, to: res.move.to, promotion: res.move.promotion });
      } catch {
        // Should not happen, but guard so one edge case can't crash the editor.
        blocked = true;
        if (firstIllegalIndex === -1) firstIllegalIndex = i;
        issueCount += 1;
        entries.push({
          raw,
          san: raw.trim(),
          status: "illegal",
          corrected: false,
          note: "Could not apply this move.",
          moveNumber,
          color,
          legal: false,
        });
        return;
      }
      legalCount += 1;
      const corrected = res.status === "corrected";
      if (corrected) correctedCount += 1;
      if (import.meta.env.DEV && corrected) {
        console.debug(`[scoresheet] ply ${i} "${raw.trim()}" → ${res.san}`);
      }
      entries.push({
        raw,
        san: res.san ?? raw.trim(),
        status: res.status,
        corrected,
        note: corrected ? res.note : undefined,
        moveNumber,
        color,
        legal: true,
      });
      return;
    }

    // Ambiguous or illegal — flag it and stop advancing the board.
    blocked = true;
    if (firstIllegalIndex === -1) firstIllegalIndex = i;
    issueCount += 1;
    if (import.meta.env.DEV) {
      console.debug(
        `[scoresheet] ply ${i} "${raw.trim()}" ${res.status}`,
        res.candidates ?? res.note ?? "",
      );
    }
    entries.push({
      raw,
      san: raw.trim(),
      status: res.status,
      corrected: false,
      candidates: res.candidates,
      note: res.note,
      moveNumber,
      color,
      legal: false,
    });
  });

  if (meta) {
    if (meta.white) chess.header("White", meta.white);
    if (meta.black) chess.header("Black", meta.black);
    if (meta.result) chess.header("Result", meta.result);
    if (meta.event) chess.header("Event", meta.event);
    if (meta.date) chess.header("Date", meta.date);
  }

  return {
    entries,
    pgn: chess.pgn(),
    allLegal: firstIllegalIndex === -1 && legalCount >= 2,
    legalCount,
    correctedCount,
    issueCount,
    firstIllegalIndex,
  };
}
