import { useEffect, useState, useMemo } from "react";
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

// A handful of famous historical games, replayed on a small board while the
// user waits, purely for entertainment. One is picked at random each time
// the waiting screen mounts.
const FAMOUS_GAMES: Array<{ label: string; pgn: string }> = [
  {
    label: "Morphy vs Duke Karl & Count Isouard, Paris 1858 (\"The Opera Game\")",
    pgn:
      "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 " +
      "8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 " +
      "14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#",
  },
  {
    label: "Anderssen vs Kieseritzky, London 1851 (\"The Immortal Game\")",
    pgn:
      "1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 " +
      "8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 " +
      "15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 " +
      "21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#",
  },
  {
    label: "Anderssen vs Dufresne, Berlin 1852 (\"The Evergreen Game\")",
    pgn:
      "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 " +
      "8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 " +
      "14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 " +
      "19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kd8 24. Bxb7#",
  },
  {
    label: "Byrne vs Fischer, New York 1956 (\"The Game of the Century\")",
    pgn:
      "1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 " +
      "8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 " +
      "14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 " +
      "Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 " +
      "25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 " +
      "Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ " +
      "37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2#",
  },
  {
    label: "Kasparov vs Topalov, Wijk aan Zee 1999",
    pgn:
      "1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 " +
      "8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O " +
      "14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 " +
      "20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 " +
      "25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 " +
      "30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 " +
      "35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 " +
      "40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0",
  },
];

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

/** Small animated replay of a famous game, chosen at random and looping continuously. */
function FamousGameBoard() {
  // Pick one famous game at random each time this component mounts (i.e.
  // each time a new analysis run starts).
  const game = useMemo(
    () => FAMOUS_GAMES[Math.floor(Math.random() * FAMOUS_GAMES.length)],
    [],
  );

  const positions = useMemo(() => {
    const boards: (string | null)[][][] = [boardFromFen(new Chess().fen())];
    const historyChess = new Chess();
    historyChess.loadPgn(game.pgn, { sloppy: true } as never);
    const moves = historyChess.history({ verbose: true });
    const replay = new Chess();
    for (const m of moves) {
      replay.move(m.san);
      boards.push(boardFromFen(replay.fen()));
    }
    return boards;
  }, [game]);

  const [moveIndex, setMoveIndex] = useState(0);

  useEffect(() => {
    setMoveIndex(0);
    const interval = setInterval(() => {
      setMoveIndex((i) => (i + 1) % positions.length);
    }, 1400);
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
          width: 224,
          height: 224,
        }}
      >
        {board.flatMap((row, r) =>
          row.map((piece, c) => {
            const isLight = (r + c) % 2 === 0;
            const isWhitePiece = piece?.[0] === "w";
            return (
              <div
                key={`${r}-${c}`}
                className="flex items-center justify-center"
                style={{
                  background: isLight ? "var(--board-light)" : "var(--board-dark)",
                  width: 28,
                  height: 28,
                }}
              >
                {piece ? (
                  <span
                    style={{
                      fontSize: 24,
                      lineHeight: 1,
                      color: isWhitePiece ? "#ffffff" : "#1a1a1a",
                      textShadow: isWhitePiece
                        ? "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 3px rgba(0,0,0,0.6)"
                        : "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff",
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
      <p className="mt-2 max-w-[224px] text-center text-xs text-muted-foreground">
        Replaying: {game.label}
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
      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <FamousGameBoard />
        <div className="w-full">
          <ChessTips />
        </div>
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
