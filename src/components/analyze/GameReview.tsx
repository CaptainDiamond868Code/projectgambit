import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { Chess } from "chess.js";
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

/** Convert a UCI principal variation into SAN from a given FEN. */
function pvToSan(fen: string, pv: string[], max = 8): string[] {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
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

export function GameReview({
  analysis,
  activeIndex,
  onIndexChange,
  defaultOrientation = "white",
}: GameReviewProps) {
  const [orientation, setOrientation] = useState<Color>(defaultOrientation);
  const [showEngine, setShowEngine] = useState(false);
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

  // Keyboard navigation: ←/→ step moves, Home/End jump to ends.
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndexChange(Math.min(maxIndex, activeIndex + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndexChange(Math.max(0, activeIndex - 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        onIndexChange(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onIndexChange(maxIndex);
      }
    },
    [activeIndex, maxIndex, onIndexChange],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

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

          <div className="mx-auto mt-3 w-full max-w-[520px]">
            <Button
              variant={showEngine ? "secondary" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => setShowEngine((v) => !v)}
              aria-pressed={showEngine}
            >
              <Cpu className="h-4 w-4" /> {showEngine ? "Hide Engine Line" : "Show Engine Line"}
            </Button>
            {showEngine && (
              <EnginePanel fen={fen} evaluation={currentEval} />
            )}
          </div>
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

function EnginePanel({ fen, evaluation }: { fen: string; evaluation: Evaluation }) {
  const line = useMemo(() => pvToSan(fen, evaluation.pv), [fen, evaluation.pv]);
  return (
    <div className="mt-2 animate-fade-up rounded-xl border border-primary/25 bg-primary/5 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Cpu className="h-3.5 w-3.5" /> Stockfish engine line
        </span>
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Eval{" "}
            <span className="font-semibold tabular-nums text-foreground">{formatEval(evaluation)}</span>
          </span>
          {evaluation.depth > 0 && <span>Depth {evaluation.depth}</span>}
        </span>
      </div>
      {line.length > 0 ? (
        <p className="mt-2 font-mono text-sm leading-relaxed text-foreground/90">{line.join(" ")}</p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No further continuation available.</p>
      )}
    </div>
  );
}

function MoveLegend() {
  const items = [
    { key: "best", label: "Best" },
    { key: "excellent", label: "Excellent" },
    { key: "good", label: "Good" },
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