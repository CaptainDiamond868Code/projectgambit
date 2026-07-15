import { createFileRoute, Link } from "@tanstack/react-router";
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

function Index() {
  const { session } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-glow">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Powered by Stockfish · Explained by AI
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
            Improve After <span className="text-gradient">Every Game.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Project Gambit reviews your games like a real chess coach, helping you understand your
            mistakes and build a personalized improvement plan.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3">
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
          <p className="mt-4 text-sm text-muted-foreground">Play a game → Upload it → Learn from it → Improve.</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="Features" title="Everything you need to get better" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card/50 p-6 transition-colors hover:border-primary/40">
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
              <div key={s.title} className="relative rounded-2xl border border-border bg-card/50 p-6">
                <span className="text-sm font-bold text-primary">Step {i + 1}</span>
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
      <div className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</div>
      <h2 className="mt-2 font-display text-3xl font-bold">{title}</h2>
    </div>
  );
}
