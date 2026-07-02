import { useCallback, useRef, useState } from "react";
import { analyzeGame, selectKeyMistakes } from "@/lib/chess/analyze";
import type { Color, GameAnalysis, GameMeta, KeyMistake, CoachingReport } from "@/lib/chess/types";
import { generateCoachingReport } from "@/lib/coaching.functions";

export type AnalysisStatus = "idle" | "evaluating" | "coaching" | "ready" | "error";

export interface AnalysisState {
  status: AnalysisStatus;
  progress: { completed: number; total: number };
  analysis: GameAnalysis | null;
  report: CoachingReport | null;
  mistakes: KeyMistake[];
  color: Color;
  error: string | null;
}

const INITIAL: AnalysisState = {
  status: "idle",
  progress: { completed: 0, total: 0 },
  analysis: null,
  report: null,
  mistakes: [],
  color: "white",
  error: null,
};

export function useGameAnalysis() {
  const [state, setState] = useState<AnalysisState>(INITIAL);
  const runIdRef = useRef(0);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setState(INITIAL);
  }, []);

  const run = useCallback(
    async (pgn: string, meta: GameMeta, color: Color, depth = 13) => {
      const runId = ++runIdRef.current;
      setState({ ...INITIAL, status: "evaluating", color });
      const hasTimeData = /\[%clk|\[%emt|TimeControl|Clock/i.test(pgn);

      try {
        const analysis = await analyzeGame(pgn, meta, depth, (p) => {
          if (runId !== runIdRef.current) return;
          setState((s) => ({ ...s, progress: { completed: p.completed, total: p.total } }));
        });
        if (runId !== runIdRef.current) return;

        const mistakes = selectKeyMistakes(analysis, color, 3);
        setState((s) => ({ ...s, status: "coaching", analysis, mistakes }));

        const stats = analysis.stats[color];
        const report = await generateCoachingReport({
          data: {
            playerColor: color,
            playerName: color === "white" ? analysis.meta.white : analysis.meta.black,
            opponentName: color === "white" ? analysis.meta.black : analysis.meta.white,
            result: analysis.meta.result,
            accuracy: stats.accuracy,
            averageCentipawnLoss: stats.averageCentipawnLoss,
            counts: stats.counts,
            totalMoves: analysis.moves.filter((m) => m.color === color).length,
            opening: analysis.meta.opening,
            hasTimeData,
            mistakes: mistakes.map((m) => ({
              moveNumber: m.moveNumber,
              san: m.san,
              classification: m.classification,
              centipawnLoss: m.centipawnLoss,
              phase: m.phase,
              evalBeforeText: m.evalBeforeText,
              evalAfterText: m.evalAfterText,
              bestMoveSan: m.bestMoveSan,
              bestLineSan: m.bestLineSan,
            })),
          },
        });
        if (runId !== runIdRef.current) return;

        setState((s) => ({ ...s, status: "ready", report }));
      } catch (err) {
        if (runId !== runIdRef.current) return;
        setState((s) => ({
          ...s,
          status: "error",
          error: err instanceof Error ? err.message : "Something went wrong during analysis.",
        }));
      }
    },
    [],
  );

  return { state, run, reset };
}