import { formatEval } from "@/lib/chess/classify";
import type { Color, Evaluation } from "@/lib/chess/types";

/** Map a White-POV evaluation to White's share of the bar (0..1). */
function whiteShare(evaluation: Evaluation): number {
  if (evaluation.mate != null) return evaluation.mate > 0 ? 1 : 0;
  const cp = evaluation.cp ?? 0;
  return 1 / (1 + Math.exp(-cp / 320));
}

export function EvalBar({
  evaluation,
  orientation = "white",
}: {
  evaluation: Evaluation;
  orientation?: Color;
}) {
  const share = whiteShare(evaluation);
  const whitePct = Math.round(share * 100);
  const label = formatEval(evaluation);
  const bottomIsWhite = orientation === "white";
  const whiteFillHeight = bottomIsWhite ? whitePct : 100 - whitePct;

  return (
    <div className="flex h-full flex-col items-center gap-2">
      <span className="text-xs font-bold tabular-nums text-foreground">{label}</span>
      <div className="relative flex w-6 flex-1 flex-col overflow-hidden rounded-md border border-border bg-board-dark">
        <div className="flex-1" />
        <div
          className="w-full bg-board-light transition-[height] duration-200"
          style={{ height: `${whiteFillHeight}%` }}
        />
      </div>
    </div>
  );
}