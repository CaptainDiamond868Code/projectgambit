import type { MoveClassification } from "@/lib/chess/types";

interface ClsMeta {
  label: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
  symbol: string;
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
  },
  excellent: {
    label: "Excellent",
    text: "text-cls-excellent",
    bg: "bg-cls-excellent/12",
    border: "border-cls-excellent/35",
    dot: "bg-cls-excellent",
    symbol: "!",
  },
  good: {
    label: "Good",
    text: "text-cls-good",
    bg: "bg-cls-good/12",
    border: "border-cls-good/35",
    dot: "bg-cls-good",
    symbol: "✓",
  },
  inaccuracy: {
    label: "Inaccuracy",
    text: "text-cls-inaccuracy",
    bg: "bg-cls-inaccuracy/12",
    border: "border-cls-inaccuracy/35",
    dot: "bg-cls-inaccuracy",
    symbol: "?!",
  },
  mistake: {
    label: "Mistake",
    text: "text-cls-mistake",
    bg: "bg-cls-mistake/12",
    border: "border-cls-mistake/35",
    dot: "bg-cls-mistake",
    symbol: "?",
  },
  blunder: {
    label: "Blunder",
    text: "text-cls-blunder",
    bg: "bg-cls-blunder/14",
    border: "border-cls-blunder/40",
    dot: "bg-cls-blunder",
    symbol: "??",
  },
};