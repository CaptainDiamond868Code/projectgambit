import type { MoveClassification } from "@/lib/chess/types";

interface ClsMeta {
  label: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
  symbol: string;
  cssVar: string;
}

/**
 * Static Tailwind class strings per classification. Kept as literals (not
 * interpolated) so the compiler always emits them.
 */
export const CLS_META: Record<MoveClassification, ClsMeta> = {
  best: {
    label: "Best",
    text: "text-cls-best",
    bg: "bg-cls-best/12",
    border: "border-cls-best/35",
    dot: "bg-cls-best",
    symbol: "★",
    cssVar: "var(--cls-best)",
  },
  excellent: {
    label: "Excellent",
    text: "text-cls-excellent",
    bg: "bg-cls-excellent/12",
    border: "border-cls-excellent/35",
    dot: "bg-cls-excellent",
    symbol: "!",
    cssVar: "var(--cls-excellent)",
  },
  good: {
    label: "Good",
    text: "text-cls-good",
    bg: "bg-cls-good/12",
    border: "border-cls-good/35",
    dot: "bg-cls-good",
    symbol: "✓",
    cssVar: "var(--cls-good)",
  },
  inaccuracy: {
    label: "Inaccuracy",
    text: "text-cls-inaccuracy",
    bg: "bg-cls-inaccuracy/12",
    border: "border-cls-inaccuracy/35",
    dot: "bg-cls-inaccuracy",
    symbol: "?!",
    cssVar: "var(--cls-inaccuracy)",
  },
  mistake: {
    label: "Mistake",
    text: "text-cls-mistake",
    bg: "bg-cls-mistake/12",
    border: "border-cls-mistake/35",
    dot: "bg-cls-mistake",
    symbol: "?",
    cssVar: "var(--cls-mistake)",
  },
  blunder: {
    label: "Blunder",
    text: "text-cls-blunder",
    bg: "bg-cls-blunder/14",
    border: "border-cls-blunder/40",
    dot: "bg-cls-blunder",
    symbol: "??",
    cssVar: "var(--cls-blunder)",
  },
};