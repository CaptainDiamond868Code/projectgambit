import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Cpu,
  MessageSquareText,
  Target,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Upload,
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

const FEATURES = [
  {
    icon: Cpu,
    title: "Real Stockfish engine",
    body: "Every evaluation, best move and centipawn loss comes from Stockfish — never guessed by AI.",
  },
  {
    icon: MessageSquareText,
    title: "Plain-English coaching",
    body: "AI translates the engine's findings into clear lessons, so you learn concepts, not just moves.",
  },
  {
    icon: Target,
    title: "Your biggest mistakes",
    body: "See the three moves that mattered most, why they hurt, and the better idea to remember.",
  },
  {
    icon: ListChecks,
    title: "A plan to improve",
    body: "Finish every review with one clear thing to practice before your next games.",
  },
];

const STEPS = [
  { icon: Upload, title: "Upload your game", body: "Drag & drop a PGN or paste your moves. We validate it instantly." },
  { icon: Cpu, title: "Stockfish analyzes", body: "The engine evaluates every position and classifies each move." },
  { icon: Sparkles, title: "Get coached", body: "Read a personalized report and replay your game interactively." },
];

const WHY = [
  { title: "Accuracy first", body: "Analysis is 100% engine-based. The AI only explains — it never invents." },
  { title: "Made to teach", body: "Reports focus on recurring weaknesses and concepts, like a real coach." },
  { title: "Free & private", body: "No account needed. Upload a game and start learning in seconds." },
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
    a: "Yes — Project Gambit is a free personal coach for beginner and intermediate players.",
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

const CLS_STYLES: Record<string, string> = {
  best: "border-cls-best/40 bg-cls-best/10 text-cls-best",
  excellent: "border-cls-excellent/40 bg-cls-excellent/10 text-cls-excellent",
  good: "border-cls-good/40 bg-cls-good/10 text-cls-good",
  inaccuracy: "border-cls-inaccuracy/40 bg-cls-inaccuracy/10 text-cls-inaccuracy",
  mistake: "border-cls-mistake/40 bg-cls-mistake/10 text-cls-mistake",
  blunder: "border-cls-blunder/40 bg-cls-blunder/10 text-cls-blunder",
};

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
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

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

function Index() {
  const { session } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-chess-texture">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
          <div className="text-center lg:text-left">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-notation text-[11px] font-medium tracking-wide text-muted-foreground lg:mx-0">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Stockfish engine · AI-coach
            </div>
            <h1 className="font-hero mt-6 text-4xl font-normal leading-[1.05] sm:text-5xl lg:text-6xl">
              Improve after
              <br />
              <span className="text-gradient italic">every game.</span>
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

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="Features" title="Everything you need to get better" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card/50 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="How It Works" title="From PGN to a real coaching session" />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="relative rounded-2xl border border-border bg-card/50 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <span className="font-notation text-sm font-bold text-primary">
                  0{i + 1}
                </span>
                <span className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="Why Project Gambit" title="Coaching you can trust" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {WHY.map((w) => (
            <div key={w.title} className="rounded-2xl border border-border bg-card/50 p-6">
              <h3 className="font-semibold">{w.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60 bg-card/20">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-border bg-card/50 p-5">
                <summary className="cursor-pointer list-none font-medium marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-border bg-hero-glow p-10 text-center">
            <h3 className="font-display text-2xl font-bold">Ready for your first review?</h3>
            <p className="mt-2 text-muted-foreground">Upload a game and leave feeling like you had a real coaching session.</p>
            <Button asChild variant="hero" size="xl" className="mt-6">
              <Link to="/analyze">Analyze My Game <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        Project Gambit · Analysis by Stockfish, explanations by AI.
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <div className="font-notation text-xs font-semibold uppercase tracking-widest text-primary">
        {eyebrow}
      </div>
      <h2 className="mt-2 font-display text-3xl font-bold">{title}</h2>
    </div>
  );
}
