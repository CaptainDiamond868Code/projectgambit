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

  return (
    <div className="max-h-[420px] overflow-y-auto rounded-xl border border-border bg-card/40 text-sm">
      {rows.map((row) => (
        <div key={row.number} className="grid grid-cols-[2.5rem_1fr_1fr] border-b border-border/60 last:border-0">
          <div className="flex items-center justify-center bg-secondary/40 py-1.5 text-xs text-muted-foreground">
            {row.number}
          </div>
          <MoveCell move={row.white} activeIndex={activeIndex} onSelect={onSelect} />
          <MoveCell move={row.black} activeIndex={activeIndex} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

function MoveCell({
  move,
  activeIndex,
  onSelect,
}: {
  move?: AnalyzedMove;
  activeIndex: number;
  onSelect: (index: number) => void;
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
      onClick={() => onSelect(move.ply + 1)}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1.5 text-left font-medium transition-colors hover:bg-secondary/60",
        isActive && "bg-primary/15 text-primary",
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
      <span className="tabular-nums">{move.san}</span>
      {flagged && <span className={cn("ml-auto text-xs font-bold", meta.text)}>{meta.symbol}</span>}
    </button>
  );
}