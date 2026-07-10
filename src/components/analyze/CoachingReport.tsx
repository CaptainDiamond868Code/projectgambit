import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Target,
  ChevronDown,
  Compass,
  Gauge,
  Crown,
  BookOpen,
  Swords,
  Brain,
  Activity,
  ShieldCheck,
  Clock,
  Flag,
  Dumbbell,
  Lightbulb,
  Repeat,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChessBoardView, uciSquares } from "@/components/chess/ChessBoardView";
import { CLS_META } from "@/components/chess/classification";
import { resolveOutcome, outcomeLabel, estimatePlayingStrength } from "@/lib/chess/classify";
import { cn } from "@/lib/utils";
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
  const snapshot = report.playerSnapshot;
  const summary = report.gameSummary;
  const ownMoveCount = analysis.moves.filter((m) => m.color === color).length;
  const estimate = estimatePlayingStrength(stats, ownMoveCount);
  const outcome = resolveOutcome(analysis.meta.result, color);
  const outcomeText = outcomeLabel(outcome);
  const outcomeClass =
    outcome === "win"
      ? "border-cls-best/40 bg-cls-best/10 text-cls-best"
      : outcome === "loss"
        ? "border-cls-blunder/40 bg-cls-blunder/10 text-cls-blunder"
        : "border-cls-good/40 bg-cls-good/10 text-cls-good";

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
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">Playing {color}</span>
              {outcomeText && (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs font-semibold",
                    outcomeClass,
                  )}
                >
                  {outcomeText}
                </span>
              )}
              {analysis.meta.opening ? <span>· {analysis.meta.opening}</span> : null}
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

      {/* Player Snapshot */}
      <Section icon={<Compass className="h-4 w-4" />} title="Player Snapshot">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SnapshotCard index={0} icon={Swords} label="Playing Style" value={snapshot.playingStyle} />
          <SnapshotCard
            index={1}
            icon={TrendingUp}
            label="Biggest Strength"
            value={snapshot.biggestStrength}
            tone="best"
          />
          <SnapshotCard
            index={2}
            icon={TriangleAlert}
            label="Biggest Weakness"
            value={snapshot.biggestWeakness}
            tone="mistake"
          />
          <SnapshotCard index={3} icon={Target} label="Recommended Focus" value={snapshot.recommendedFocus} />
          <SnapshotCard
            index={4}
            icon={Crown}
            label="Estimated Level"
            value={`${estimate.label} · ~${estimate.low}–${estimate.high}`}
          />
          <ConfidenceCard
            index={5}
            score={estimate.confidence}
            label={estimate.confidenceLabel}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          This rating range is estimated by the engine from {estimate.sampleMoves} of your moves in
          this single game. Analyze more games to sharpen the estimate.
        </p>
      </Section>

      {/* Game summary */}
      <Section icon={<Sparkles className="h-4 w-4" />} title="Game Summary">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryItem icon={BookOpen} label="Opening" value={summary.opening} />
          <SummaryItem icon={Activity} label="Middlegame" value={summary.middlegame} />
          <SummaryItem icon={Flag} label="Endgame" value={summary.endgame} />
          <SummaryItem icon={Swords} label="Tactical Awareness" value={summary.tacticalAwareness} />
          <SummaryItem icon={Brain} label="Strategic Planning" value={summary.strategicPlanning} />
          <SummaryItem icon={Activity} label="Piece Activity" value={summary.pieceActivity} />
          <SummaryItem icon={ShieldCheck} label="King Safety" value={summary.kingSafety} />
          <SummaryItem icon={Gauge} label="Decision Making" value={summary.decisionMaking} />
          <SummaryItem icon={Clock} label="Time Management" value={summary.timeManagement} />
        </div>
        {summary.playingStyle && (
          <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Your Playing Style
            </div>
            <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-foreground/90">
              {summary.playingStyle}
            </p>
          </div>
        )}
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
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-cls-best/40 bg-cls-best/5 py-10 text-center">
            <ShieldCheck className="h-8 w-8 text-cls-best" />
            <p className="text-sm font-medium text-foreground">No major mistakes found — excellent play!</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Stockfish didn't flag any serious errors. Keep playing games to keep sharpening your edge.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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

      {/* Homework */}
      <div className="rounded-2xl border border-gold/40 [background-image:var(--gradient-gold-soft)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-gold">
            <Dumbbell className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Homework Before Your Next Game
            </span>
          </div>
          {report.homework.estimatedTime && (
            <span className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
              <Timer className="h-3.5 w-3.5" /> {report.homework.estimatedTime}
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <HomeworkItem icon={Swords} label="Tactical exercise" value={report.homework.tacticalExercise} />
          <HomeworkItem icon={Lightbulb} label="Strategic goal" value={report.homework.strategicGoal} />
          <HomeworkItem icon={Repeat} label="Habit to remember" value={report.homework.habit} />
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({
  icon: Icon,
  label,
  value,
  tone,
  index = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "best" | "mistake";
  index?: number;
}) {
  const toneClass =
    tone === "best"
      ? "text-cls-best"
      : tone === "mistake"
        ? "text-cls-mistake"
        : "text-primary";
  return (
    <div
      className="animate-fade-up rounded-xl border border-border bg-background/40 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wide", toneClass)}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1.5 text-sm font-medium leading-snug text-foreground">{value}</p>
    </div>
  );
}

function ConfidenceCard({
  score,
  index = 0,
  label,
}: {
  score: number;
  index?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div
      className="animate-fade-up rounded-xl border border-border bg-background/40 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Gauge className="h-3.5 w-3.5" /> Confidence Score
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums text-foreground">{clamped}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
        {label && <span className="ml-1 text-xs font-medium text-muted-foreground">· {label}</span>}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full [background-image:var(--gradient-primary)] transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-background/30 p-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">{value}</p>
      </div>
    </div>
  );
}

function HomeworkItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gold/30 bg-background/30 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{value}</p>
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
  explanation?: {
    whatHappened: string;
    whyItHappened: string;
    betterPlan: string;
    keyLesson: string;
    patternCategory: string;
  };
  onJump: () => void;
}) {
  const [open, setOpen] = useState(index === 0);
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
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      style={{ animationDelay: `${index * 80}ms` }}
      className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card/40 transition-all duration-200 hover:border-primary/25 hover:shadow-[var(--shadow-card)]"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              Move {mistake.moveNumber}
              {mistake.color === "black" ? "…" : "."} {mistake.san}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.bg} ${meta.border} ${meta.text}`}
            >
              {meta.symbol} {meta.label}
            </span>
            {explanation?.patternCategory && (
              <span className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {explanation.patternCategory}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {mistake.evalBeforeText} → {mistake.evalAfterText} · best was{" "}
            <span className="font-semibold text-cls-best">{mistake.bestMoveSan ?? "—"}</span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=open]:overflow-visible data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="grid gap-5 border-t border-border/60 p-4 md:grid-cols-[220px_1fr]">
          <div>
            <ChessBoardView
              id={`mistake-${index}`}
              fen={mistake.fenBefore}
              orientation={color}
              arrows={arrows}
              highlights={highlights}
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Best was{" "}
              <span className="font-semibold text-cls-best">{mistake.bestMoveSan ?? "—"}</span>
              {" · "}
              {mistake.evalBeforeText} → {mistake.evalAfterText}
            </p>
          </div>

          <div className="space-y-3">
            <Field icon={Activity} label="What happened" value={explanation?.whatHappened} />
            <Field icon={Brain} label="Why it happened" value={explanation?.whyItHappened} />
            <Field icon={Target} label="Better move or plan" value={explanation?.betterPlan} />
            <Field icon={Lightbulb} label="Key lesson" value={explanation?.keyLesson} accent />

            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary"
              onClick={onJump}
            >
              View on board <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  accent?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <div
        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${accent ? "text-gold" : "text-muted-foreground"}`}
      >
        <Icon className="h-3.5 w-3.5" /> {label}
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
      <div className="mb-4 flex items-center gap-2">
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