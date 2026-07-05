import { useEffect, useRef, useState } from "react";
import { RotateCcw, AlertTriangle, ShieldCheck, Cpu, Sparkles, FileText, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import { PgnUpload } from "./PgnUpload";
import { ScoresheetScanner } from "./ScoresheetScanner";
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
      <div className="animate-fade-up py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Powered by Stockfish · Explained by AI
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Analyze your game</h1>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Upload a PGN and get a full coaching report powered by Stockfish — mistakes, patterns, and a plan to improve.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Real engine analysis</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Plain-English coaching</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> No account needed</span>
          </div>
        </div>
        <Tabs defaultValue="pgn" className="mx-auto w-full max-w-2xl">
          <TabsList className="mx-auto grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pgn">
              <FileText className="h-4 w-4" /> Paste or upload PGN
            </TabsTrigger>
            <TabsTrigger value="scan">
              <ScanLine className="h-4 w-4" /> Scan scoresheet
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pgn" className="mt-6 animate-fade-up">
            <PgnUpload onAnalyze={(pgn, meta, color) => run(pgn, meta, color)} />
          </TabsContent>
          <TabsContent value="scan" className="mt-6 animate-fade-up">
            <ScoresheetScanner onAnalyze={(pgn, meta, color) => run(pgn, meta, color)} />
          </TabsContent>
        </Tabs>
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
    <div className="animate-fade-up space-y-8 py-8">
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