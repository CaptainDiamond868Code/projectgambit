import { useCallback, useEffect, useState } from "react";

export type BoardColorKey = "emerald" | "wood" | "azure" | "coral" | "slate";
export type PieceSetKey = "standard" | "minimal" | "bold";

export interface BoardColorOption {
  key: BoardColorKey;
  label: string;
  light: string;
  dark: string;
}

/**
 * A handful of board color palettes. "emerald" matches the app's existing
 * default board colors so nothing changes for users who never touch this
 * setting. Colors are plain CSS color values (not tied to the app's global
 * --board-light/--board-dark tokens, which are also used decoratively
 * elsewhere, like the landing page's hero texture) so changing this setting
 * only affects real chess boards, never marketing chrome.
 */
export const BOARD_COLOR_OPTIONS: BoardColorOption[] = [
  { key: "emerald", label: "Emerald (default)", light: "oklch(0.9 0.028 105)", dark: "oklch(0.56 0.072 158)" },
  { key: "wood", label: "Classic Wood", light: "oklch(0.86 0.045 80)", dark: "oklch(0.5 0.06 45)" },
  { key: "azure", label: "Azure", light: "oklch(0.92 0.02 230)", dark: "oklch(0.55 0.09 240)" },
  { key: "coral", label: "Coral", light: "oklch(0.93 0.02 40)", dark: "oklch(0.62 0.13 25)" },
  { key: "slate", label: "Slate Gray", light: "oklch(0.88 0.005 250)", dark: "oklch(0.45 0.01 250)" },
];

export const PIECE_SET_OPTIONS: Array<{ key: PieceSetKey; label: string }> = [
  { key: "standard", label: "Standard" },
  { key: "minimal", label: "Minimal (circles)" },
  { key: "bold", label: "Bold Outline" },
];

const COLOR_STORAGE_KEY = "pg-board-color";
const PIECES_STORAGE_KEY = "pg-board-pieces";
const THEME_EVENT = "pg-board-theme";

export function getBoardColorOption(key: BoardColorKey | null | undefined): BoardColorOption {
  return BOARD_COLOR_OPTIONS.find((o) => o.key === key) ?? BOARD_COLOR_OPTIONS[0];
}

export function readBoardColorKey(): BoardColorKey {
  if (typeof window === "undefined") return "emerald";
  const v = window.localStorage.getItem(COLOR_STORAGE_KEY);
  return BOARD_COLOR_OPTIONS.some((o) => o.key === v) ? (v as BoardColorKey) : "emerald";
}

export function readPieceSetKey(): PieceSetKey {
  if (typeof window === "undefined") return "standard";
  const v = window.localStorage.getItem(PIECES_STORAGE_KEY);
  return PIECE_SET_OPTIONS.some((o) => o.key === v) ? (v as PieceSetKey) : "standard";
}

/**
 * Site-wide board appearance preference. There's no React Context/Provider
 * needed — every ChessBoardView instance (and the Settings page) calls this
 * hook independently; changes are broadcast via a small window event so
 * every mounted board updates immediately, wherever it is in the tree.
 */
export function useBoardTheme() {
  const [colorKey, setColorKeyState] = useState<BoardColorKey>(() => readBoardColorKey());
  const [pieceSet, setPieceSetState] = useState<PieceSetKey>(() => readPieceSetKey());

  useEffect(() => {
    const onChange = () => {
      setColorKeyState(readBoardColorKey());
      setPieceSetState(readPieceSetKey());
    };
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const setColorKey = useCallback((key: BoardColorKey) => {
    try {
      window.localStorage.setItem(COLOR_STORAGE_KEY, key);
    } catch {
      /* ignore */
    }
    setColorKeyState(key);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const setPieceSet = useCallback((key: PieceSetKey) => {
    try {
      window.localStorage.setItem(PIECES_STORAGE_KEY, key);
    } catch {
      /* ignore */
    }
    setPieceSetState(key);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return {
    colorKey,
    pieceSet,
    setColorKey,
    setPieceSet,
    colorOptions: BOARD_COLOR_OPTIONS,
    pieceSetOptions: PIECE_SET_OPTIONS,
  };
}

const GLYPH_WHITE: Record<string, string> = { P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔" };
const GLYPH_BLACK: Record<string, string> = { P: "♟", N: "♞", B: "♝", R: "♜", Q: "♛", K: "♚" };

function boldPiece(letter: string, isWhite: boolean) {
  const glyph = isWhite ? GLYPH_WHITE[letter] : GLYPH_BLACK[letter];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function BoldPiece(props: any) {
    const size = props?.squareWidth ?? 56;
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: size * 0.72,
            lineHeight: 1,
            color: isWhite ? "#ffffff" : "#1a1a1a",
            textShadow: isWhite
              ? "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000"
              : "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff",
          }}
        >
          {glyph}
        </span>
      </div>
    );
  };
}

function minimalPiece(letter: string, isWhite: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function MinimalPiece(props: any) {
    const size = props?.squareWidth ?? 56;
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: "50%",
            background: isWhite ? "#f8fafc" : "#1e293b",
            border: `2px solid ${isWhite ? "#1e293b" : "#f8fafc"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: size * 0.3,
            color: isWhite ? "#1e293b" : "#f8fafc",
          }}
        >
          {letter}
        </div>
      </div>
    );
  };
}

/**
 * Builds a react-chessboard `pieces` override map for a given set. Returns
 * `undefined` for "standard" so the library's own built-in piece art renders
 * unmodified — we only override when a custom set is chosen.
 *
 * Note: "minimal" and "bold" are custom vector/glyph sets built for this app
 * rather than licensed piece artwork (e.g. the exact sets chess.com ships).
 * If you want a pixel-perfect classic set later, that requires supplying the
 * actual SVG/PNG assets for it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildPieceComponents(pieceSet: PieceSetKey): Record<string, (props: any) => JSX.Element> | undefined {
  if (pieceSet === "standard") return undefined;
  const codes = ["P", "N", "B", "R", "Q", "K"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, (props: any) => JSX.Element> = {};
  for (const c of codes) {
    if (pieceSet === "bold") {
      out[`w${c}`] = boldPiece(c, true);
      out[`b${c}`] = boldPiece(c, false);
    } else {
      out[`w${c}`] = minimalPiece(c, true);
      out[`b${c}`] = minimalPiece(c, false);
    }
  }
  return out;
}
