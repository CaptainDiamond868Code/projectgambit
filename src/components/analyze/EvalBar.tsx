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
  // The bar always shows the side at the bottom matching board orientation.
  const bottomIsWhite = orientation === "white";

  return (
    <div className="flex h-full w-7 flex-col overflow-hidden rounded-lg border border-border bg-board-dark">
      <div
        className="w-full bg-board-light transition-[height] duration-200"
        style={{ height: `${bottomIsWhite ? 100 - whitePct : whitePct}%` }}
      />
      <div className="relative flex-1">
        <span
          className={`absolute left-1/2 w-full -translate-x-1/2 text-center text-[10px] font-bold tabular-nums ${
            share >= 0.5 ? "bottom-1 text-board-dark" : "top-1 text-board-light"
          }`}
          style={{ writingMode: "vertical-rl", rotate: "180deg" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}