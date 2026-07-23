import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { RotateCcw, RefreshCw, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/SiteHeader";
import { ChessBoardView, uciSquares } from "@/components/chess/ChessBoardView";
import { EvalBar } from "@/components/analyze/EvalBar";
import { StockfishEngine, type MultiPvLine } from "@/lib/chess/stockfish";
import { formatEval } from "@/lib/chess/classify";
import type { Color, Evaluation } from "@/lib/chess/types";
import { toast } from "sonner";

export const Route = createFileRoute("/board")({
  head: () => ({
    meta: [
      { title: "Analysis Board · Project Gambit" },
      {
        name: "description",
        content: "Set up any position and see the top Stockfish lines update live at high depth.",
      },
    ],
  }),
  component: BoardPage,
});

const START_FEN = new Chess().fen();

interface MoveEntry {
  san: string;
  fen: string;
}

/** Converts a UCI principal variation into SAN, starting from a given FEN. */
function pvToSan(fen: string, pv: string[], max = 10): string[] {
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

function lineToEvaluation(line: MultiPvLine): Evaluation {
  return { cp: line.cp, mate: line.mate, bestMove: line.pv[0] ?? null, pv: line.pv, depth: line.depth };
}

function BoardPage() {
  const [moves, setMoves] = useState<MoveEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [orientation, setOrientation] = useState<Color>("white");
  const [fenInput, setFenInput] = useState("");
  const [depth, setDepth] = useState(20);
  const [multiPv, setMultiPv] = useState(3);
  const [lines, setLines] = useState<MultiPvLine[]>([]);
  const [engineReady, setEngineReady] = useState(false);

  const startFenRef = useRef(START_FEN);
  const engineRef = useRef<StockfishEngine | null>(null);
  const stopRef = useRef<() => void>(() => {});

  const currentFen = activeIndex === 0 ? startFenRef.current : moves[activeIndex - 1].fen;

  // Boot the engine once for this page.
  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;
    engine
      .init()
      .then(() => setEngineReady(true))
      .catch(() => toast.error("Could not start the analysis engine."));
    return () => {
      stopRef.current();
      engine.quit();
    };
  }, []);

  // Re-run live analysis whenever the position, depth, or line count changes.
  useEffect(() => {
    if (!engineReady || !engineRef.current) return;
    stopRef.current();
    setLines([]);
    stopRef.current = engineRef.current.startAnalysis(
      currentFen,
      { multiPv, depth },
      (updated) => setLines(updated),
    );
    return () => stopRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFen, depth, multiPv, engineReady]);

  const bestEvaluation: Evaluation = useMemo(() => {
    const top = lines.find((l) => l.multipv === 1);
    return top ? lineToEvaluation(top) : { cp: 0, mate: null, bestMove: null, pv: [], depth: 0 };
  }, [lines]);

  const applyMove = useCallback(
    (from: string, to: string, promotion = "q"): boolean => {
      const base = new Chess(activeIndex === 0 ? startFenRef.current : moves[activeIndex - 1].fen);
      let move;
      try {
        move = base.move({ from, to, promotion });
      } catch {
        return false;
      }
      if (!move) return false;
      const truncated = moves.slice(0, activeIndex);
      truncated.push({ san: move.san, fen: base.fen() });
      setMoves(truncated);
      setActiveIndex(truncated.length);
      return true;
    },
    [moves, activeIndex],
  );

  function playSuggested(line: MultiPvLine) {
    const first = line.pv[0];
    const sq = uciSquares(first);
    if (!sq) return;
    const promotion = first.length > 4 ? first.slice(4, 5) : "q";
    applyMove(sq.from, sq.to, promotion);
  }

  function resetToStart() {
    startFenRef.current = START_FEN;
    setMoves([]);
    setActiveIndex(0);
    setFenInput("");
  }

  function loadCustomFen() {
    const trimmed = fenInput.trim();
    if (!trimmed) return;
    try {
      const test = new Chess(trimmed);
      startFenRef.current = test.fen();
      setMoves([]);
      setActiveIndex(0);
      toast.success("Position loaded");
    } catch {
      toast.error("That doesn't look like a valid FEN.");
    }
  }

  // Arrow-key navigation through the move history (← previous, → next, Home
  // first, End last) — ignored while typing in the FEN input.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(moves.length, i + 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(moves.length);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [moves.length]);

  const rows: Array<{ number: number; white?: string; black?: string; whiteIdx?: number; blackIdx?: number }> = [];
  moves.forEach((m, i) => {
    const rowIdx = Math.floor(i / 2);
    if (!rows[rowIdx]) rows[rowIdx] = { number: rowIdx + 1 };
    if (i % 2 === 0) {
      rows[rowIdx].white = m.san;
      rows[rowIdx].whiteIdx = i + 1;
    } else {
      rows[rowIdx].black = m.san;
      rows[rowIdx].blackIdx = i + 1;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Analysis Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Play out any position and watch the top Stockfish lines update live.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Board + eval bar */}
          <div className="flex gap-3">
            <EvalBar evaluation={bestEvaluation} orientation={orientation} />
            <div className="mx-auto w-full max-w-[520px]">
              <ChessBoardView
                id="analysis-board"
                fen={currentFen}
                orientation={orientation}
                interactive
                onMove={(from, to, promotion) => applyMove(from, to, promotion)}
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={resetToStart}>
                  <RotateCcw className="h-4 w-4" /> Starting position
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
                >
                  <RefreshCw className="h-4 w-4" /> Flip board
                </Button>
              </div>

              <p className="mt-2 text-center text-xs text-muted-foreground">
                Click a piece then a square to move it, drag it, or use{" "}
                <kbd className="rounded border border-border bg-secondary/60 px-1">←</kbd>{" "}
                <kbd className="rounded border border-border bg-secondary/60 px-1">→</kbd> to step through moves.
              </p>

              <div className="mx-auto mt-4 max-w-md">
                <Label htmlFor="fen-input" className="text-xs text-muted-foreground">
                  Load a custom position (FEN)
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="fen-input"
                    value={fenInput}
                    onChange={(e) => setFenInput(e.target.value)}
                    placeholder="Paste a FEN string…"
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={loadCustomFen}>
                    Load
                  </Button>
                </div>
                <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground/70">
                  {currentFen}
                </p>
              </div>
            </div>
          </div>

          {/* Engine panel + move list */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Cpu className="h-4 w-4 text-primary" /> Engine lines
                </span>
                {!engineReady && (
                  <span className="text-xs text-muted-foreground">Starting engine…</span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Depth</Label>
                  <Select value={String(depth)} onValueChange={(v) => setDepth(Number(v))}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[14, 16, 18, 20, 22, 24].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Depth {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Lines</Label>
                  <Select value={String(multiPv)} onValueChange={(v) => setMultiPv(Number(v))}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          Top {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {lines.length === 0 && (
                  <p className="text-sm text-muted-foreground">Analyzing…</p>
                )}
                {lines.map((line) => {
                  const san = pvToSan(currentFen, line.pv);
                  return (
                    <button
                      key={line.multipv}
                      onClick={() => playSuggested(line)}
                      className="flex w-full items-start gap-3 rounded-lg border border-border bg-background/40 p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums">
                        {formatEval(lineToEvaluation(line))}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
                        {san.join(" ")}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        d{line.depth}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Click a line to play its first move on the board.
              </p>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Moves</h4>
              {moves.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                  Make a move on the board to get started.
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto rounded-xl border border-border bg-card/40 text-sm">
                  {rows.map((row) => (
                    <div
                      key={row.number}
                      className="grid grid-cols-[2.5rem_1fr_1fr] border-b border-border/60 last:border-0"
                    >
                      <div className="flex items-center justify-center bg-secondary/40 py-1.5 text-xs text-muted-foreground">
                        {row.number}
                      </div>
                      <MoveButton
                        san={row.white}
                        index={row.whiteIdx}
                        activeIndex={activeIndex}
                        onSelect={setActiveIndex}
                      />
                      <MoveButton
                        san={row.black}
                        index={row.blackIdx}
                        activeIndex={activeIndex}
                        onSelect={setActiveIndex}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MoveButton({
  san,
  index,
  activeIndex,
  onSelect,
}: {
  san?: string;
  index?: number;
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  if (!san || index == null) return <div className="px-2 py-1.5" />;
  const isActive = activeIndex === index;
  return (
    <button
      onClick={() => onSelect(index)}
      className={`px-2 py-1.5 text-left font-medium tabular-nums transition-colors hover:bg-secondary/60 ${
        isActive ? "bg-primary/15 text-primary shadow-[inset_2px_0_0_0_var(--primary)]" : "text-foreground/90"
      }`}
    >
      {san}
    </button>
  );
}
