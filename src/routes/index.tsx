import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Cpu,
  MessageSquareText,
  Target,
  ListChecks,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Gambit — Improve After Every Game" },
      {
        name: "description",
        content:
          "Project Gambit reviews your games like a real chess coach, helping you understand your mistakes and build a personalized improvement plan.",
      },
      { property: "og:title", content: "Project Gambit — Improve After Every Game" },
      {
        property: "og:description",
        content: "A free personal chess coach powered by Stockfish. Play → Upload → Learn → Improve.",
      },
    ],
  }),
  component: Index,
});

// What you get, said plainly — no card chrome, just icon + line, generous
// whitespace. Also folds in what used to be a separate "Why trust us"
// section, since the two were saying overlapping things.
const HIGHLIGHTS = [
  { icon: Cpu, text: "Every evaluation comes from Stockfish — never guessed by AI." },
  { icon: MessageSquareText, text: "AI explains the engine's findings in plain, encouraging English." },
  { icon: Target, text: "See the three moves that mattered most, and why." },
  { icon: ListChecks, text: "Leave with one clear thing to practice next." },
];

const STEPS = [
  { title: "Upload your game", body: "Drag & drop a PGN or paste your moves." },
  { title: "Stockfish analyzes", body: "Every position is evaluated from scratch." },
  { title: "Get coached", body: "Read your report and replay the game." },
];

const FAQ = [
  {
    q: "Where do the evaluations come from?",
    a: "Exclusively from the Stockfish engine, which runs right in your browser. AI is used only to explain those numbers in plain English.",
  },
  {
    q: "Does the AI ever make up chess analysis?",
    a: "No. Best moves, blunders, evaluations and variations all come from Stockfish. The AI is strictly limited to teaching the concepts behind them.",
  },
  {
    q: "What format do I need?",
    a: "A standard PGN of a completed game. You can export one from Chess.com, Lichess, or most chess apps.",
  },
  {
    q: "Is it really free?",
    a: "Yes — Project Gambit is a free personal coach for every and any type of player.",
  },
];

// Real moments from the sample Ruy López game already used elsewhere in the
// app (the "Try a sample game" button on the analyze page), so the hero
// demo is an honest preview of what a real coaching report looks like.
const FEED_MOVES: Array<{
  move: string;
  cls: "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";
  label: string;
  comment: string;
}> = [
  { move: "14. h3", cls: "good", label: "Good", comment: "Prevents ...Bg4 pins before they start." },
  { move: "18. Be3", cls: "good", label: "Good", comment: "Solid regrouping, keeps the center flexible." },
  { move: "22. Bxg2??", cls: "blunder", label: "Blunder", comment: "Grabs a pawn — but opens your own king." },
  { move: "27. Ke2", cls: "inaccuracy", label: "Inaccuracy", comment: "The king wanders instead of consolidating." },
  { move: "30. Qe2??", cls: "blunder", label: "Blunder", comment: "Walks into a trade that loses the exchange." },
  { move: "36. Rg3??", cls: "blunder", label: "Blunder", comment: "Passive rook, right when it was needed most." },
];

// A short cycle of evaluations for the ambient "live engine" graphic —
// purely illustrative, showing what a real eval swing looks like.
const EVAL_CYCLE = [
  { text: "+0.3", pct: 54 },
  { text: "+0.9", pct: 61 },
  { text: "+0.4", pct: 55 },
  { text: "−0.6", pct: 43 },
  { text: "+2.7", pct: 78 },
  { text: "+1.1", pct: 63 },
];

const CLS_STYLES: Record<string, string> = {
  best: "border-cls-best/40 bg-cls-best/10 text-cls-best",
  excellent: "border-cls-excellent/40 bg-cls-excellent/10 text-cls-excellent",
  good: "border-cls-good/40 bg-cls-good/10 text-cls-good",
  inaccuracy: "border-cls-inaccuracy/40 bg-cls-inaccuracy/10 text-cls-inaccuracy",
  mistake: "border-cls-mistake/40 bg-cls-mistake/10 text-cls-mistake",
  blunder: "border-cls-blunder/40 bg-cls-blunder/10 text-cls-blunder",
};

/** Detects reduced-motion preference for any component that animates. */
function usesReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Fires `inView = true` the first time the wrapped element scrolls into view. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (usesReducedMotion()) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

/** Wraps content in a scroll-triggered fade-up reveal, staggered by delay (ms). */
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Faint, slowly drifting chess piece glyphs in the hero background. */
function FloatingPieces() {
  const pieces = [
    { glyph: "♞", top: "12%", left: "6%", size: "6rem", delay: "0s", duration: "7s" },
    { glyph: "♗", top: "62%", left: "88%", size: "5rem", delay: "1.2s", duration: "8.5s" },
    { glyph: "♛", top: "72%", left: "10%", size: "4.5rem", delay: "0.6s", duration: "9s" },
    { glyph: "♜", top: "8%", left: "86%", size: "4rem", delay: "1.8s", duration: "7.5s" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="animate-float absolute select-none text-primary/[0.06]"
          style={{
            top: p.top,
            left: p.left,
            fontSize: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}

/**
 * The hero's signature element: a small looping "coaching feed" that shows
 * real moves from the sample game ticking through classification badges and
 * one-line commentary — an honest, working preview of the product itself
 * rather than a generic screenshot or stat block.
 */
function LiveCoachingFeed() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (usesReducedMotion()) return;
    const interval = setInterval(() => {
      setVisible(false);
      const t = setTimeout(() => {
        setIndex((i) => (i + 1) % FEED_MOVES.length);
        setVisible(true);
      }, 220);
      return () => clearTimeout(t);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  const current = FEED_MOVES[index];

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-border bg-card/70 p-5 text-left shadow-[var(--shadow-elegant)] backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="font-notation text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Coaching Feed
        </span>
        <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <span
          className={`font-notation text-2xl font-semibold transition-opacity duration-200 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {current.move}
        </span>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 font-notation text-[11px] font-semibold transition-opacity duration-200 ${CLS_STYLES[current.cls]} ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {current.label}
        </span>
      </div>

      <p
        className={`mt-3 min-h-[2.5em] text-sm leading-relaxed text-muted-foreground transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {current.comment}
      </p>

      <div className="mt-4 flex gap-1">
        {FEED_MOVES.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i === index ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      <p className="mt-3 font-notation text-[11px] text-muted-foreground/70">
        From the sample game · try it yourself below
      </p>
    </div>
  );
}

/** A single real, animated graphic — a live-looking evaluation bar — rather than a stock icon. */
function EngineEvalPulse() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (usesReducedMotion()) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % EVAL_CYCLE.length);
    }, 1900);
    return () => clearInterval(interval);
  }, []);

  const current = EVAL_CYCLE[index];

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card/50 p-6">
      <div className="flex items-center justify-between font-notation text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>Live evaluation</span>
        <span className="text-gold">Stockfish</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="font-notation w-16 shrink-0 text-2xl font-semibold text-foreground">
          {current.text}
        </span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full [background-image:var(--gradient-primary)] transition-all duration-[1200ms] ease-in-out"
            style={{ width: `${current.pct}%` }}
          />
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Every position is searched from scratch — the same engine strong players train with.
      </p>
    </div>
  );
}

function Index() {
  const { session } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-chess-texture">
        <FloatingPieces />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
          <div className="text-center lg:text-left">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-notation text-[11px] font-medium tracking-wide text-muted-foreground lg:mx-0">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Stockfish engine · AI-coach
            </div>
            <h1 className="font-hero mt-6 text-4xl font-normal leading-[1.05] sm:text-5xl lg:text-6xl">
              Improve after
              <br />
              <span className="text-gradient animate-gradient-x italic">every game.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground lg:mx-0">
              Project Gambit reviews your games like a real chess coach, helping you understand
              your mistakes and build a personalized improvement plan.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
              <Button asChild variant="hero" size="xl">
                <Link to="/analyze">
                  Analyze My Game <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {!session && (
                <Button asChild variant="outline" size="lg">
                  <Link to="/login">Sign in / Sign up</Link>
                </Button>
              )}
            </div>
            <p className="mt-4 font-notation text-xs text-muted-foreground">
              play → upload → learn → improve
            </p>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "150ms" }}>
            <LiveCoachingFeed />
          </div>
        </div>
      </section>

      {/* What you get — plain icon + line, no card chrome, generous whitespace */}
      <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <div className="space-y-10">
          {HIGHLIGHTS.map((h, i) => (
            <Reveal key={h.text} delay={i * 90}>
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <h.icon className="h-4 w-4" />
                </span>
                <p className="pt-1 text-base leading-relaxed text-foreground/90 sm:text-lg">
                  {h.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={380}>
          <div className="mt-14">
            <EngineEvalPulse />
          </div>
        </Reveal>
      </section>

      {/* How it works — plain typography, no boxes */}
      <section className="border-y border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
              From PGN to a real coaching session
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="text-center sm:text-left">
                  <span className="font-notation text-3xl font-semibold text-primary/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — simple divided list, no per-item card chrome */}
      <section>
        <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
              Frequently asked questions
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-10 divide-y divide-border">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-lg py-5 transition-colors hover:bg-card/30"
                >
                  <summary className="cursor-pointer list-none px-2 font-medium marker:content-none">
                    <span className="flex items-center justify-between gap-4">
                      {item.q}
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                    </span>
                  </summary>
                  <p className="mt-3 px-2 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-20 text-center">
              <h3 className="font-display text-2xl font-bold">Ready for your first review?</h3>
              <p className="mt-2 text-muted-foreground">
                Upload a game and leave feeling like you had a real coaching session.
              </p>
              <div className="mt-6 inline-block animate-pulse-ring rounded-lg">
                <Button asChild variant="hero" size="xl">
                  <Link to="/analyze">
                    Analyze My Game <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Project Gambit · Analysis by Stockfish, explanations by AI.
      </footer>
    </div>
  );
}
