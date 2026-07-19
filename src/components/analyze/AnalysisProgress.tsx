import { useEffect, useState, useRef, useMemo } from "react";
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
  Lightbulb,
} from "lucide-react";
import { Chess } from "chess.js";
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

// The Opera Game — Paul Morphy vs. Duke Karl / Count Isouard, Paris 1858.
// Replayed on a small board while the user waits, purely for entertainment.
const OPERA_GAME_PGN =
  "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 " +
  "8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 " +
  "14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#";

const CHESS_TIPS = [
  "Knights on the rim are dim — keep your knights near the center.",
  "Rooks belong on open files and the 7th rank.",
  "Always ask yourself: why did my opponent play that move?",
  "The threat is stronger than the execution. — Nimzowitsch",
  "When you see a good move, look for a better one. — Emanuel Lasker",
  "Passed pawns must be pushed.",
  "Trade pieces when you're ahead in material.",
  "Castle early — your king is not a fighting piece in the opening.",
  "Control the center with pawns and pieces, not just pawns.",
  "Before moving, check if your pieces are safe.",
  "An isolated pawn spreads gloom all over the chessboard. — Nimzowitsch",
  "Even the best players blunder. The goal is to blunder less.",
  "In the endgame, the king becomes a powerful piece — activate it.",
  "Coordinate your rooks by doubling them on open files.",
  "Every move should have a purpose.",
];

const PIECE_UNICODE: Record<string, string> = {
  wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
  bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
};

/** Small animated replay of the Opera Game, looping continuously. */
function OperaGameBoard() {
  const positions = useMemo(() => {
    const boards: (string | null)[][][] = [boardFromFen(new Chess().fen())];
    const historyChess = new Chess();
    historyChess.loadPgn(OPERA_GAME_PGN, { sloppy: true } as never);
    const moves = historyChess.history({ verbose: true });
    const replay = new Chess();
    for (const m of moves) {
      replay.move(m.san);
      boards.push(boardFromFen(replay.fen()));
    }
    return boards;
  }, []);

  const [moveIndex, setMoveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMoveIndex((i) => (i + 1) % positions.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [positions.length]);

  const board = positions[moveIndex];

  return (
    <div className="flex flex-col items-center">
      <div
        className="grid overflow-hidden rounded-lg border border-border shadow-sm"
        style={{
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
          width: 168,
          height: 168,
        }}
      >
        {board.flatMap((row, r) =>
          row.map((piece, c) => {
            const isLight = (r + c) % 2 === 0;
            return (
              <div
                key={`${r}-${c}`}
                className="flex items-center justify-center"
                style={{
                  background: isLight ? "var(--board-light)" : "var(--board-dark)",
                  fontSize: 15,
                  lineHeight: 1,
                }}
              >
                {piece ? (
                  <span
                    style={{
                      color: piece[0] === "w" ? "#f8fafc" : "#0f172a",
                      filter:
                        piece[0] === "w"
                          ? "drop-shadow(0 0 1px rgba(0,0,0,0.55))"
                          : "none",
                    }}
                  >
                    {PIECE_UNICODE[piece]}
                  </span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Replaying: Morphy vs Duke Karl, 1858
      </p>
    </div>
  );
}

/** Converts a FEN into an 8x8 board array of piece codes like "wp", "bk", or null. */
function boardFromFen(fen: string): (string | null)[][] {
  const rows = fen.split(" ")[0].split("/");
  return rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        cells.push(`${color}${ch.toLowerCase()}`);
      }
    }
    return cells;
  });
}

/** Cycles through short chess tips with a smooth fade transition. */
function ChessTips() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const t = setTimeout(() => {
        setIndex((i) => (i + 1) % CHESS_TIPS.length);
        setVisible(true);
      }, 250);
      return () => clearTimeout(t);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
        <Lightbulb className="h-3.5 w-3.5" /> Chess Tip
      </div>
      <p
        className={cn(
          "mt-1.5 text-sm text-foreground/90 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        {CHESS_TIPS[index]}
      </p>
    </div>
  );
}

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

      {/* Animated mini board + chess tips while the user waits */}
      <div className="mt-6 grid gap-4 sm:grid-cols-[168px_1fr] sm:items-center">
        <OperaGameBoard />
        <ChessTips />
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
