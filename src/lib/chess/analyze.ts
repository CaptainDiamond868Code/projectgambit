import { Chess } from "chess.js";
import {
  accuracyFromAcpl,
  centipawnLoss,
  classifyMove,
  evalToNumber,
  formatEval,
  phaseForPly,
} from "./classify";
import { StockfishEngine } from "./stockfish";
import type {
  AnalyzedMove,
  Color,
  Evaluation,
  GameAnalysis,
  GameMeta,
  KeyMistake,
  MoveClassification,
  PlayerStats,
} from "./types";

export interface AnalyzeProgress {
  completed: number;
  total: number;
  phase: "evaluating" | "done";
}

function emptyCounts(): Record<MoveClassification, number> {
  return { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
}

function uciToSan(fen: string, uci: string): string | null {
  if (!uci) return null;
  const chess = new Chess(fen);
  try {
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}

function lineToSan(fen: string, uciLine: string[], max = 6): string[] {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const uci of uciLine.slice(0, max)) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
      });
      if (!move) break;
      out.push(move.san);
    } catch {
      break;
    }
  }
  return out;
}

/**
 * Full-game analysis pipeline.
 *  1. Reconstruct every position from the PGN with chess.js.
 *  2. Ask Stockfish to evaluate each position (single source of truth).
 *  3. Derive centipawn loss + classification for every move.
 */
export async function analyzeGame(
  pgn: string,
  meta: GameMeta,
  depth: number,
  onProgress?: (p: AnalyzeProgress) => void,
): Promise<GameAnalysis> {
  const chess = new Chess();
  chess.loadPgn(pgn, { sloppy: true } as never);
  const verbose = chess.history({ verbose: true });

  // Rebuild the FEN before/after every move.
  const replay = new Chess();
  const fens: string[] = [replay.fen()];
  for (const m of verbose) {
    replay.move(m.san);
    fens.push(replay.fen());
  }

  const total = fens.length;
  const engine = new StockfishEngine();
  await engine.init();

  const evals: Evaluation[] = [];
  try {
    for (let i = 0; i < fens.length; i++) {
      const evaluation = await engine.evaluate(fens[i], depth);
      evals.push(evaluation);
      onProgress?.({ completed: i + 1, total, phase: "evaluating" });
    }
  } finally {
    engine.quit();
  }

  const totalPlies = verbose.length;
  const moves: AnalyzedMove[] = [];

  for (let ply = 0; ply < verbose.length; ply++) {
    const move = verbose[ply];
    const color: Color = move.color === "w" ? "white" : "black";
    const evalBefore = evals[ply];
    const evalAfter = evals[ply + 1];

    const before = evalToNumber(evalBefore);
    const after = evalToNumber(evalAfter);
    const cpl = centipawnLoss(color, before, after);

    const playedUci = `${move.from}${move.to}${move.promotion ?? ""}`;
    const bestUci = evalBefore.bestMove;
    const playedIsBest = !!bestUci && bestUci === playedUci;
    const classification = classifyMove(cpl, playedIsBest);

    moves.push({
      ply,
      moveNumber: Math.floor(ply / 2) + 1,
      color,
      san: move.san,
      uci: playedUci,
      fenBefore: fens[ply],
      fenAfter: fens[ply + 1],
      evalBefore,
      evalAfter,
      bestMoveUci: bestUci,
      bestMoveSan: bestUci ? uciToSan(fens[ply], bestUci) : null,
      bestLineSan: lineToSan(fens[ply], evalBefore.pv),
      centipawnLoss: cpl,
      classification,
      phase: phaseForPly(ply, totalPlies),
    });
  }

  const stats: Record<Color, PlayerStats> = {
    white: buildStats("white", moves),
    black: buildStats("black", moves),
  };

  return { meta, moves, fens, stats, depth };
}

function buildStats(color: Color, moves: AnalyzedMove[]): PlayerStats {
  const own = moves.filter((m) => m.color === color);
  const counts = emptyCounts();
  let totalLoss = 0;
  for (const m of own) {
    counts[m.classification] += 1;
    totalLoss += m.centipawnLoss;
  }
  const acpl = own.length ? totalLoss / own.length : 0;
  return {
    color,
    counts,
    averageCentipawnLoss: Math.round(acpl),
    accuracy: accuracyFromAcpl(acpl),
  };
}

/** Pick the player's most damaging moves for the coaching report. */
export function selectKeyMistakes(
  analysis: GameAnalysis,
  color: Color,
  limit = 3,
): KeyMistake[] {
  return analysis.moves
    .filter(
      (m) =>
        m.color === color &&
        (m.classification === "blunder" ||
          m.classification === "mistake" ||
          m.classification === "inaccuracy"),
    )
    .sort((a, b) => b.centipawnLoss - a.centipawnLoss)
    .slice(0, limit)
    .map((m) => {
      const idx = m.ply;
      return {
        ply: m.ply,
        moveNumber: m.moveNumber,
        color: m.color,
        san: m.san,
        bestMoveSan: m.bestMoveSan,
        bestLineSan: m.bestLineSan,
        centipawnLoss: m.centipawnLoss,
        classification: m.classification,
        phase: m.phase,
        evalBeforeText: formatEval(analysis.moves[idx].evalAfter),
        evalAfterText: formatEval(m.evalAfter),
        fenBefore: m.fenBefore,
        fenAfter: m.fenAfter,
      };
    });
}