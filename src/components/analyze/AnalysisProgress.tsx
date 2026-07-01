import { Cpu, Loader2, Brain } from "lucide-react";
import type { AnalysisStatus } from "@/hooks/useGameAnalysis";

interface AnalysisProgressProps {
  status: AnalysisStatus;
  completed: number;
  total: number;
}

export function AnalysisProgress({ status, completed, total }: AnalysisProgressProps) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const evaluating = status === "evaluating";

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card/60 p-8 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {evaluating ? <Cpu className="h-7 w-7" /> : <Brain className="h-7 w-7" />}
      </div>

      <h3 className="mt-4 flex items-center justify-center gap-2 text-lg font-semibold">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {evaluating ? "Stockfish is analyzing your game" : "Your coach is writing the report"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {evaluating
          ? "Every position is being evaluated by the Stockfish engine — the single source of truth."
          : "Turning the engine's findings into plain-English coaching advice."}
      </p>

      <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: evaluating ? `${pct}%` : "100%" }}
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {evaluating ? `Evaluating position ${completed} of ${total} (${pct}%)` : "Almost there…"}
      </div>
    </div>
  );
}