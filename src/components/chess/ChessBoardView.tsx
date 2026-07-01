import { useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { Arrow } from "react-chessboard";
import type { Color } from "@/lib/chess/types";

export interface SquareHighlight {
  square: string;
  color: string;
}

interface ChessBoardViewProps {
  fen: string;
  orientation?: Color;
  arrows?: Arrow[];
  highlights?: SquareHighlight[];
  animationMs?: number;
  id?: string;
}

/** Presentational board wrapped with Project Gambit's board theme. */
export function ChessBoardView({
  fen,
  orientation = "white",
  arrows = [],
  highlights = [],
  animationMs = 200,
  id = "board",
}: ChessBoardViewProps) {
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    for (const h of highlights) {
      styles[h.square] = { boxShadow: `inset 0 0 0 4px ${h.color}` };
    }
    return styles;
  }, [highlights]);

  return (
    <Chessboard
      options={{
        id,
        position: fen,
        boardOrientation: orientation,
        allowDragging: false,
        allowDrawingArrows: false,
        showNotation: true,
        showAnimations: true,
        animationDurationInMs: animationMs,
        arrows,
        squareStyles: squareStyles,
        darkSquareStyle: { backgroundColor: "var(--board-dark)" },
        lightSquareStyle: { backgroundColor: "var(--board-light)" },
        darkSquareNotationStyle: { color: "var(--board-light)", opacity: 0.75 },
        lightSquareNotationStyle: { color: "var(--board-dark)", opacity: 0.85 },
        boardStyle: {
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "var(--shadow-elegant)",
        },
      }}
    />
  );
}

/** Convert a UCI move to the from/to squares for arrows + highlights. */
export function uciSquares(uci: string | null | undefined): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}