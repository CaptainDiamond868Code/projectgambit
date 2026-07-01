import { ArrowRight, Sparkles, TrendingUp, TriangleAlert, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChessBoardView, uciSquares } from "@/components/chess/ChessBoardView";
import { CLS_META } from "@/components/chess/classification";
import type {
  Color,
  CoachingReport as CoachingReportType,
  GameAnalysis,
  KeyMistake,
} from "@/lib/chess/types";

interface CoachingReportProps {
  report: CoachingReportType;
  analysis: GameAnalysis;
  mistakes: KeyMistake[];
  color: Color;
  onJumpToMistake: (ply: number) => void;
}

export function CoachingReport({
  report,
  analysis,
  mistakes,
  color,
  onJumpToMistake,
}: CoachingReportProps) {
  const stats = analysis.stats[color];
  const playerName = color === "white" ? analysis.meta.white : analysis.meta.black;

  return (
    <div className="space-y-6">
      {/* Header + key metrics */}
      <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-primary">
              Coaching Report
            </div>
            <h2 className="mt-1 text-2xl font-semibold">{playerName}</h2>
            <p className="text-sm text-muted-foreground">
              Playing {color} · {analysis.meta.result}
              {analysis.meta.opening ? ` · ${analysis.meta.opening}` : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <Metric label="Accuracy" value={`${stats.accuracy}%`} highlight />
            <Metric label="Avg. CP loss" value={String(stats.averageCentipawnLoss)} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["best", "excellent", "good", "inaccuracy", "mistake", "blunder"] as const).map((c) => (
            <span
              key={c}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${CLS_META[c].bg} ${CLS_META[c].border} ${CLS_META[c].text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${CLS_META[c].dot}`} />
              {CLS_META[c].label}: {stats.counts[c]}
            </span>
          ))}
        </div>
      </div>

      {/* Overall summary */}
      <Section icon={<Sparkles className="h-4 w-4" />} title="Overall Summary">
        <p className="text-[15px] leading-relaxed text-foreground/90">{report.overallSummary}</p>
      </Section>

      {/* Strength + weakness */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-cls-best/30 bg-cls-best/5 p-5">
          <div className="flex items-center gap-2 text-cls-best">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Biggest Strength</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold">{report.biggestStrength.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {report.biggestStrength.detail}
          </p>
        </div>
        <div className="rounded-2xl border border-cls-mistake/30 bg-cls-mistake/5 p-5">
          <div className="flex items-center gap-2 text-cls-mistake">
            <TriangleAlert className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Biggest Weakness</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold">{report.biggestWeakness.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {report.biggestWeakness.detail}
          </p>
        </div>
      </div>

      {/* Three biggest mistakes */}
      <Section icon={<Target className="h-4 w-4" />} title="Three Biggest Mistakes">
        {mistakes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No significant mistakes were found in this game — excellent play!
          </p>
        ) : (
          <div className="space-y-5">
            {mistakes.map((m, i) => (
              <MistakeCard
                key={m.ply}
                index={i}
                mistake={m}
                analysis={analysis}
                color={color}
                explanation={report.mistakes[i]}
                onJump={() => onJumpToMistake(m.ply + 1)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Recommendation */}
      <div className="rounded-2xl border border-gold/40 [background-image:var(--gradient-gold-soft)] p-6">
        <div className="flex items-center gap-2 text-gold">
          <Trophy className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Coach's Recommendation</span>
        </div>
        <p className="mt-2 text-lg font-medium leading-relaxed text-foreground">
          {report.recommendation}
        </p>
      </div>
    </div>
  );
}

function MistakeCard({
  index,
  mistake,
  analysis,
  color,
  explanation,
  onJump,
}: {
  index: number;
  mistake: KeyMistake;
  analysis: GameAnalysis;
  color: Color;
  explanation?: { whyItMattered: string; betterIdea: string; remember: string };
  onJump: () => void;
}) {
  const move = analysis.moves[mistake.ply];
  const meta = CLS_META[mistake.classification];
  const played = uciSquares(move?.uci);
  const best = uciSquares(move?.bestMoveUci);

  const arrows =
    best != null
      ? [{ startSquare: best.from, endSquare: best.to, color: "var(--cls-best)" }]
      : [];
  const highlights = played
    ? [
        { square: played.from, color: meta.cssVar },
        { square: played.to, color: meta.cssVar },
      ]
    : [];

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <div>
          <ChessBoardView
            id={`mistake-${index}`}
            fen={mistake.fenBefore}
            orientation={color}
            arrows={arrows}
            highlights={highlights}
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Best was <span className="font-semibold text-cls-best">{mistake.bestMoveSan ?? "—"}</span>
            {" · "}
            {mistake.evalBeforeText} → {mistake.evalAfterText}
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold">
              {index + 1}
            </span>
            <span className="font-semibold">
              Move {mistake.moveNumber}
              {mistake.color === "black" ? "…" : "."} {mistake.san}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.bg} ${meta.border} ${meta.text}`}
            >
              {meta.symbol} {meta.label}
            </span>
          </div>

          <div className="mt-3 space-y-3">
            <Field label="Why it mattered" value={explanation?.whyItMattered} />
            <Field label="Better idea" value={explanation?.betterIdea} />
            <Field label="Remember next time" value={explanation?.remember} accent />
          </div>

          <Button variant="ghost" size="sm" className="mt-3 text-primary hover:text-primary" onClick={onJump}>
            View on board <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div
        className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-gold" : "text-muted-foreground"}`}
      >
        {label}
      </div>
      <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">{value}</p>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-4 py-2 text-center">
      <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}