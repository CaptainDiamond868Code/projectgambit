import { useEffect, useMemo, useState } from "react";
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
   * When true, the board accepts moves (both dragging and click-to-move).
   * Every existing read-only replay view (GameReview, CoachingReport mini
   * boards) leaves this unset, so nothing changes for them.
   */
  interactive?: boolean;
  /**
   * Called when the user makes a move, either by dropping a dragged piece or
   * by clicking a piece then clicking a destination square. Return true to
   * accept the move — the board then re-renders from whatever new `fen` you
   * pass in — or false to reject it. Promotions always default to a queen;
   * there's no promotion-choice UI yet.
   */
  onMove?: (from: string, to: string, promotion?: string) => boolean;
}

/** Piece color + type at a square, read directly from a FEN's placement field. */
function pieceAt(fen: string, square: string): { color: "w" | "b"; type: string } | null {
  const placement = fen.split(" ")[0];
  const ranks = placement.split("/"); // ranks[0] = rank 8 ... ranks[7] = rank 1
  const file = square.charCodeAt(0) - 97; // 'a' -> 0
  const rankIndex = 8 - Number(square[1]); // rank 8 -> index 0
  const rankStr = ranks[rankIndex];
  if (!rankStr) return null;
  let fileIdx = 0;
  for (const ch of rankStr) {
    if (/\d/.test(ch)) {
      fileIdx += Number(ch);
      continue;
    }
    if (fileIdx === file) {
      return { color: ch === ch.toUpperCase() ? "w" : "b", type: ch.toLowerCase() };
    }
    fileIdx += 1;
  }
  return null;
}

function sideToMove(fen: string): "w" | "b" {
  return (fen.split(" ")[1] as "w" | "b") ?? "w";
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

  // Click-to-move: click a piece to select it, then click a destination
  // square to move there. Works alongside dragging, not instead of it.
  const [selected, setSelected] = useState<string | null>(null);

  // Clear any selection whenever the position changes (a move completed, a
  // new position was loaded, or history navigation moved us elsewhere).
  useEffect(() => setSelected(null), [fen]);

  function handleSquareClick(square: string) {
    if (!interactive || !onMove) return;
    const stm = sideToMove(fen);

    if (selected) {
      if (selected === square) {
        setSelected(null);
        return;
      }
      const targetPiece = pieceAt(fen, square);
      if (targetPiece && targetPiece.color === stm) {
        // Clicking another one of your own pieces just re-selects it.
        setSelected(square);
        return;
      }
      const accepted = onMove(selected, square, "q");
      if (accepted) playMoveSound();
      setSelected(null);
      return;
    }

    const piece = pieceAt(fen, square);
    if (piece && piece.color === stm) setSelected(square);
  }

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    for (const h of highlights) {
      styles[h.square] = { boxShadow: `inset 0 0 0 4px ${h.color}` };
    }
    if (selected) {
      styles[selected] = {
        ...(styles[selected] ?? {}),
        boxShadow: `inset 0 0 0 3px var(--primary)`,
        backgroundColor: "color-mix(in oklch, var(--primary) 25%, transparent)",
      };
    }
    return styles;
  }, [highlights, selected]);

  return (
    // The library renders squares as adjacent inline elements; at normal
    // font-size the whitespace between them in the markup shows through as
    // thin gaps between rows/columns. Zeroing font-size here collapses that
    // whitespace so the board reads as one solid grid.
    <div style={{ fontSize: 0, lineHeight: 0 }}>
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
          onSquareClick: interactive
            ? ({ square }: { square: string }) => handleSquareClick(square)
            : undefined,
          onPieceDrop: interactive
            ? ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
                if (!targetSquare || !onMove) return false;
                const accepted = onMove(sourceSquare, targetSquare, "q");
                if (accepted) playMoveSound();
                setSelected(null);
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
    </div>
  );
}

/** Convert a UCI move to the from/to squares for arrows + highlights. */
export function uciSquares(uci: string | null | undefined): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}
