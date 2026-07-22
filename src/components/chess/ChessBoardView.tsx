import { useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { Arrow } from "react-chessboard";
import type { Color } from "@/lib/chess/types";
import { useBoardTheme, getBoardColorOption, buildPieceComponents } from "@/hooks/useBoardTheme";
import { playMoveSound } from "@/lib/sound";

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
  /**
   * When true, the board accepts piece drags and calls onMove. Every
   * existing read-only replay view (GameReview, CoachingReport mini boards)
   * leaves this unset, so nothing changes for them.
   */
  interactive?: boolean;
  /**
   * Called when the user drops a piece on a target square. Return true to
   * accept the move — the board then re-renders from whatever new `fen` you
   * pass in — or false to have the piece snap back. Promotions always
   * default to a queen; there's no promotion-choice UI yet.
   */
  onMove?: (from: string, to: string, promotion?: string) => boolean;
}

/** Presentational board wrapped with Project Gambit's board theme. */
export function ChessBoardView({
  fen,
  orientation = "white",
  arrows = [],
  highlights = [],
  animationMs = 200,
  id = "board",
  interactive = false,
  onMove,
}: ChessBoardViewProps) {
  const { colorKey, pieceSet } = useBoardTheme();
  const colors = getBoardColorOption(colorKey);
  const pieces = useMemo(() => buildPieceComponents(pieceSet), [pieceSet]);

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
        allowDragging: interactive,
        allowDrawingArrows: false,
        showNotation: true,
        showAnimations: true,
        animationDurationInMs: animationMs,
        arrows,
        squareStyles: squareStyles,
        pieces,
        onPieceDrop: interactive
          ? ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
              if (!targetSquare || !onMove) return false;
              const accepted = onMove(sourceSquare, targetSquare, "q");
              if (accepted) playMoveSound();
              return accepted;
            }
          : undefined,
        darkSquareStyle: { backgroundColor: colors.dark },
        lightSquareStyle: { backgroundColor: colors.light },
        darkSquareNotationStyle: { color: colors.light, opacity: 0.75 },
        lightSquareNotationStyle: { color: colors.dark, opacity: 0.85 },
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
