import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CLS_META } from "@/components/chess/classification";
import type { AnalyzedMove } from "@/lib/chess/types";

interface MoveListProps {
  moves: AnalyzedMove[];
  /** Number of plies played (index into fens). */
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function MoveList({ moves, activeIndex, onSelect }: MoveListProps) {
  const rows: Array<{ number: number; white?: AnalyzedMove; black?: AnalyzedMove }> = [];
  for (const m of moves) {
    const idx = m.moveNumber - 1;
    if (!rows[idx]) rows[idx] = { number: m.moveNumber };
    if (m.color === "white") rows[idx].white = m;
    else rows[idx].black = m;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  if (moves.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        Moves will appear here once your game is analyzed.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[420px] overflow-y-auto rounded-xl border border-border bg-card/40 text-sm"
    >
      {rows.map((row) => (
        <div key={row.number} className="grid grid-cols-[2.5rem_1fr_1fr] border-b border-border/60 last:border-0">
          <div className="flex items-center justify-center bg-secondary/40 py-1.5 text-xs text-muted-foreground">
            {row.number}
          </div>
          <MoveCell move={row.white} activeIndex={activeIndex} onSelect={onSelect} activeRef={activeRef} />
          <MoveCell move={row.black} activeIndex={activeIndex} onSelect={onSelect} activeRef={activeRef} />
        </div>
      ))}
    </div>
  );
}

function MoveCell({
  move,
  activeIndex,
  onSelect,
  activeRef,
}: {
  move?: AnalyzedMove;
  activeIndex: number;
  onSelect: (index: number) => void;
  activeRef: React.RefObject<HTMLButtonElement | null>;
}) {
  if (!move) return <div className="px-2 py-1.5" />;
  const meta = CLS_META[move.classification];
  const isActive = activeIndex === move.ply + 1;
  const flagged =
    move.classification === "blunder" ||
    move.classification === "mistake" ||
    move.classification === "inaccuracy";

  return (
    <button
      ref={isActive ? activeRef : undefined}
      onClick={() => onSelect(move.ply + 1)}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1.5 text-left font-medium transition-all duration-150 hover:bg-secondary/60",
        isActive
          ? "bg-primary/15 text-primary shadow-[inset_2px_0_0_0_var(--primary)]"
          : "text-foreground/90",
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
      <span className="tabular-nums">{move.san}</span>
      {flagged && <span className={cn("ml-auto text-xs font-bold", meta.text)}>{meta.symbol}</span>}
    </button>
  );
}