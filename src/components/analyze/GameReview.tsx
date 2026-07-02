import { useMemo, useState } from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChessBoardView, uciSquares } from "@/components/chess/ChessBoardView";
import { EvalBar } from "@/components/analyze/EvalBar";
import { MoveList } from "@/components/analyze/MoveList";
import { CLS_META } from "@/components/chess/classification";
import { formatEval } from "@/lib/chess/classify";
import type { Color, Evaluation, GameAnalysis } from "@/lib/chess/types";

interface GameReviewProps {
  analysis: GameAnalysis;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  defaultOrientation?: Color;
}

function evalAt(analysis: GameAnalysis, index: number): Evaluation {
  if (index === 0) {
    return analysis.moves[0]?.evalBefore ?? { cp: 0, mate: null, bestMove: null, pv: [], depth: 0 };
  }
  return analysis.moves[index - 1].evalAfter;
}

export function GameReview({
  analysis,
  activeIndex,
  onIndexChange,
  defaultOrientation = "white",
}: GameReviewProps) {
  const [orientation, setOrientation] = useState<Color>(defaultOrientation);
  const maxIndex = analysis.fens.length - 1;
  const fen = analysis.fens[activeIndex];
  const currentEval = evalAt(analysis, activeIndex);
  const lastMove = activeIndex > 0 ? analysis.moves[activeIndex - 1] : null;

  const highlights = useMemo(() => {
    if (!lastMove) return [];
    const sq = uciSquares(lastMove.uci);
    if (!sq) return [];
    const color = CLS_META[lastMove.classification].cssVar;
    return [
      { square: sq.from, color },
      { square: sq.to, color },
    ];
  }, [lastMove]);

  const go = (i: number) => onIndexChange(Math.max(0, Math.min(maxIndex, i)));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex gap-3">
        <div className="h-auto">
          <EvalBar evaluation={currentEval} orientation={orientation} />
        </div>
        <div className="flex-1">
          <div className="mx-auto w-full max-w-[520px]">
            <ChessBoardView
              id="review-board"
              fen={fen}
              orientation={orientation}
              highlights={highlights}
            />
          </div>

          <div className="mx-auto mt-4 flex w-full max-w-[520px] items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button variant="secondary" size="icon" onClick={() => go(0)} aria-label="First move">
                <ChevronFirst className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => go(activeIndex - 1)}
                aria-label="Previous move"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => go(activeIndex + 1)}
                aria-label="Next move"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => go(maxIndex)}
                aria-label="Last move"
              >
                <ChevronLast className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
            >
              <RefreshCw className="h-4 w-4" /> Flip
            </Button>
          </div>

          <MoveInfo analysis={analysis} activeIndex={activeIndex} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-muted-foreground">Moves</h4>
          <span className="text-xs text-muted-foreground">
            {activeIndex} / {maxIndex}
          </span>
        </div>
        <MoveList moves={analysis.moves} activeIndex={activeIndex} onSelect={onIndexChange} />
        <MoveLegend />
      </div>
    </div>
  );
}

function MoveLegend() {
  const items = [
    { key: "best", label: "Best" },
    { key: "inaccuracy", label: "Inaccuracy" },
    { key: "mistake", label: "Mistake" },
    { key: "blunder", label: "Blunder" },
  ] as const;
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${CLS_META[it.key].dot}`} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function MoveInfo({ analysis, activeIndex }: { analysis: GameAnalysis; activeIndex: number }) {
  if (activeIndex === 0) {
    return (
      <div className="mx-auto mt-4 w-full max-w-[520px] rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        Starting position. Step forward to replay the game move by move.
      </div>
    );
  }
  const move = analysis.moves[activeIndex - 1];
  const meta = CLS_META[move.classification];
  const flagged =
    move.classification === "inaccuracy" ||
    move.classification === "mistake" ||
    move.classification === "blunder";

  return (
    <div className="mx-auto mt-4 w-full max-w-[520px] rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {move.moveNumber}.{move.color === "black" ? ".." : ""} {move.san}
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.bg} ${meta.border} ${meta.text}`}
          >
            {meta.symbol} {meta.label}
          </span>
        </div>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          {formatEval(move.evalAfter)}
        </span>
      </div>
      {flagged && move.bestMoveSan && (
        <p className="mt-2 text-sm text-muted-foreground">
          Engine preferred{" "}
          <span className={`font-semibold ${meta.text}`}>{move.bestMoveSan}</span>
          {move.bestLineSan.length > 1 && (
            <span className="text-muted-foreground/80">
              {" "}
              — line: {move.bestLineSan.join(" ")}
            </span>
          )}
          . Lost {move.centipawnLoss} centipawns.
        </p>
      )}
    </div>
  );
}