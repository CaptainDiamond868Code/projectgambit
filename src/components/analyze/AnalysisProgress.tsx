import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
  FileText,
  PlayCircle,
  Cpu,
  Target,
  Radar,
  PenLine,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisStatus } from "@/hooks/useGameAnalysis";

interface AnalysisProgressProps {
  status: AnalysisStatus;
  completed: number;
  total: number;
}

const STAGES = [
  { icon: FileText, label: "Reading PGN", hint: "Parsing your moves and metadata" },
  { icon: PlayCircle, label: "Replaying the game", hint: "Rebuilding every position" },
  { icon: Cpu, label: "Running Stockfish analysis", hint: "The engine evaluates each move" },
  { icon: Target, label: "Evaluating critical positions", hint: "Finding the turning points" },
  { icon: Radar, label: "Detecting recurring patterns", hint: "Spotting habits and themes" },
  { icon: PenLine, label: "Writing your coaching report", hint: "Turning data into plain English" },
];

export function AnalysisProgress({ status, completed, total }: AnalysisProgressProps) {
  const evaluating = status === "evaluating";
  const pct = total ? Math.round((completed / total) * 100) : 0;

  // While the coach writes, advance the final two stages on a gentle timer so
  // the experience feels thoughtful rather than instant.
  const [coachElapsed, setCoachElapsed] = useState(0);
  useEffect(() => {
    if (status !== "coaching") {
      setCoachElapsed(0);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => setCoachElapsed(Date.now() - start), 120);
    return () => clearInterval(t);
  }, [status]);

  let stageIndex: number;
  let progress: number;
  if (evaluating) {
    stageIndex = pct < 4 ? 0 : pct < 10 ? 1 : pct < 82 ? 2 : 3;
    progress = Math.min(80, 4 + pct * 0.76);
  } else {
    stageIndex = coachElapsed < 1600 ? 4 : 5;
    progress = Math.min(97, 82 + coachElapsed / 380);
  }

  return (
    <div className="mx-auto w-full max-w-xl animate-fade-up rounded-2xl border border-border bg-card/60 p-8 shadow-[var(--shadow-card)]">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-pulse-ring">
          <Crown className="h-8 w-8 animate-float" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">
          {evaluating ? "Analyzing your game" : "Coaching your game"}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {evaluating
            ? "Stockfish is evaluating every position — the single source of truth for your analysis."
            : "Your coach is turning the engine's findings into clear, encouraging feedback."}
        </p>
      </div>

      {/* Progress bar with shimmer */}
      <div className="mt-6">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full [background-image:var(--gradient-primary)] transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <div className="animate-shimmer h-full w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{Math.round(progress)}%</span>
          <span>
            {evaluating && total
              ? `Position ${completed} of ${total}`
              : evaluating
                ? "Preparing engine…"
                : "Almost there…"}
          </span>
        </div>
      </div>

      {/* Staged checklist */}
      <ol className="mt-6 space-y-1.5">
        {STAGES.map((stage, i) => {
          const done = i < stageIndex;
          const active = i === stageIndex;
          const Icon = stage.icon;
          return (
            <li
              key={stage.label}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-all duration-300",
                active && "border-primary/30 bg-primary/5",
                !active && !done && "opacity-45",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                  done && "bg-primary/15 text-primary",
                  active && "bg-primary/15 text-primary",
                  !done && !active && "bg-secondary text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-sm font-medium",
                    (done || active) && "text-foreground",
                  )}
                >
                  {stage.label}
                </div>
                {active && (
                  <div className="truncate text-xs text-muted-foreground">{stage.hint}</div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}