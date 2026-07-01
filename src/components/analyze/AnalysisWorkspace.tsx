import { useEffect, useRef, useState } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import { PgnUpload } from "./PgnUpload";
import { AnalysisProgress } from "./AnalysisProgress";
import { GameReview } from "./GameReview";
import { CoachingReport } from "./CoachingReport";

export function AnalysisWorkspace() {
  const { state, run, reset } = useGameAnalysis();
  const [activeIndex, setActiveIndex] = useState(0);
  const reviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "ready") setActiveIndex(0);
  }, [state.status]);

  const jumpTo = (index: number) => {
    setActiveIndex(index);
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (state.status === "idle") {
    return (
      <div className="py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Analyze your game</h1>
          <p className="mt-2 text-muted-foreground">
            Upload a PGN and get a full coaching report powered by Stockfish.
          </p>
        </div>
        <PgnUpload onAnalyze={(pgn, meta, color) => run(pgn, meta, color)} />
      </div>
    );
  }

  if (state.status === "evaluating" || state.status === "coaching") {
    return (
      <div className="py-16">
        <AnalysisProgress
          status={state.status}
          completed={state.progress.completed}
          total={state.progress.total}
        />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-cls-blunder/40 bg-cls-blunder/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-cls-blunder" />
          <h3 className="mt-3 text-lg font-semibold">Analysis failed</h3>
          <p className="mt-1 text-sm text-muted-foreground">{state.error}</p>
          <Button variant="outline" className="mt-4" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  // ready
  return (
    <div className="space-y-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Your coaching session</h1>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> New game
        </Button>
      </div>

      {state.analysis && state.report && (
        <CoachingReport
          report={state.report}
          analysis={state.analysis}
          mistakes={state.mistakes}
          color={state.color}
          onJumpToMistake={jumpTo}
        />
      )}

      {state.analysis && (
        <div ref={reviewRef} className="scroll-mt-20">
          <h2 className="mb-4 font-display text-xl font-semibold">Interactive replay</h2>
          <GameReview
            analysis={state.analysis}
            activeIndex={activeIndex}
            onIndexChange={setActiveIndex}
            defaultOrientation={state.color}
          />
        </div>
      )}
    </div>
  );
}