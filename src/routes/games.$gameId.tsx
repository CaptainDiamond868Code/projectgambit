import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GameReview } from "@/components/analyze/GameReview";
import { analyzeGame } from "@/lib/chess/analyze";
import type { CoachingReport as CoachingReportType, GameAnalysis } from "@/lib/chess/types";

export const Route = createFileRoute("/games/$gameId")({
  head: () => ({
    meta: [{ title: "Game · Project Gambit" }],
  }),
  component: GameDetail,
});

interface Row {
  id: string;
  pgn: string;
  player_color: "white" | "black";
  result: string | null;
  accuracy: number | null;
  avg_cp_loss: number | null;
  estimated_rating_low: number | null;
  estimated_rating_high: number | null;
  opening: string | null;
  opponent: string | null;
  coaching_report: CoachingReportType;
  analyzed_at: string;
}

function GameDetail() {
  const { gameId } = useParams({ from: "/games/$gameId" });
  const { session, loading: authLoading } = useAuth();
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Re-analysis state for the interactive board replay
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("saved_games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) setNotFound(true);
        setRow((data as Row | null) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, session]);

  // Re-run the Stockfish analysis pipeline on the saved PGN so we can show
  // the same interactive replay board used on the live analysis page. We
  // only store the PGN in Supabase (not the full per-move engine output), so
  // this recomputes it on demand when someone opens a saved report.
  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    setAnalysisLoading(true);
    setAnalysisError(null);
    analyzeGame(
      row.pgn,
      {
        white: row.player_color === "white" ? "You" : row.opponent ?? "Opponent",
        black: row.player_color === "black" ? "You" : row.opponent ?? "Opponent",
        result: row.result ?? "*",
        opening: row.opening ?? undefined,
      },
      13,
    )
      .then((result) => {
        if (cancelled) return;
        setAnalysis(result);
        setAnalysisLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setAnalysisError(
          err instanceof Error ? err.message : "Could not replay this game's board.",
        );
        setAnalysisLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (notFound || !row) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold">Game not found</h1>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/games">Back to My Games</Link>
          </Button>
        </div>
      </div>
    );
  }

  const r = row.coaching_report;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/games">
            <ArrowLeft className="h-4 w-4" /> Back to My Games
          </Link>
        </Button>

        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="text-xs font-medium uppercase tracking-widest text-primary">
            Saved coaching report
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold">
            {row.opening ?? "Game"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyzed {format(new Date(row.analyzed_at), "MMMM d, yyyy")} · Played as{" "}
            {row.player_color}
            {row.opponent ? ` vs ${row.opponent}` : ""}
            {row.result ? ` · ${row.result}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Stat label="Accuracy" value={row.accuracy != null ? `${row.accuracy}%` : "—"} />
            <Stat label="Avg. CP loss" value={row.avg_cp_loss != null ? String(row.avg_cp_loss) : "—"} />
            <Stat
              label="Est. rating"
              value={
                row.estimated_rating_low != null && row.estimated_rating_high != null
                  ? `~${row.estimated_rating_low}–${row.estimated_rating_high}`
                  : "—"
              }
            />
          </div>
        </div>

        {/* Interactive replay board */}
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Interactive replay</h2>
          {analysisLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Rebuilding the board from this game's PGN…
            </div>
          )}
          {analysisError && !analysisLoading && (
            <div className="rounded-xl border border-cls-blunder/40 bg-cls-blunder/10 p-4 text-sm text-cls-blunder">
              {analysisError}
            </div>
          )}
          {analysis && !analysisLoading && !analysisError && (
            <GameReview
              analysis={analysis}
              activeIndex={activeIndex}
              onIndexChange={setActiveIndex}
              defaultOrientation={row.player_color}
            />
          )}
        </div>

        <Section title="Player snapshot">
          <Field label="Playing style" value={r.playerSnapshot.playingStyle} />
          <Field label="Biggest strength" value={r.playerSnapshot.biggestStrength} />
          <Field label="Biggest weakness" value={r.playerSnapshot.biggestWeakness} />
          <Field label="Recommended focus" value={r.playerSnapshot.recommendedFocus} />
          <Field label="Estimated level" value={r.playerSnapshot.estimatedLevel} />
        </Section>

        <Section title="Game summary">
          <Field label="Opening" value={r.gameSummary.opening} />
          <Field label="Middlegame" value={r.gameSummary.middlegame} />
          <Field label="Endgame" value={r.gameSummary.endgame} />
          <Field label="Tactical awareness" value={r.gameSummary.tacticalAwareness} />
          <Field label="Strategic planning" value={r.gameSummary.strategicPlanning} />
          <Field label="King safety" value={r.gameSummary.kingSafety} />
          <Field label="Decision making" value={r.gameSummary.decisionMaking} />
          <Field label="Time management" value={r.gameSummary.timeManagement} />
        </Section>

        {r.mistakes.length > 0 && (
          <Section title="Three biggest mistakes">
            <div className="space-y-4">
              {r.mistakes.map((m, i) => (
                <div key={i} className="rounded-xl border border-border bg-card/40 p-4">
                  <div className="text-xs font-medium uppercase tracking-widest text-primary">
                    {m.patternCategory}
                  </div>
                  <p className="mt-2 text-sm"><strong>What happened:</strong> {m.whatHappened}</p>
                  <p className="mt-1 text-sm"><strong>Why:</strong> {m.whyItHappened}</p>
                  <p className="mt-1 text-sm"><strong>Better plan:</strong> {m.betterPlan}</p>
                  <p className="mt-1 text-sm text-muted-foreground"><strong>Lesson:</strong> {m.keyLesson}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Homework">
          <Field label="Tactical exercise" value={r.homework.tacticalExercise} />
          <Field label="Strategic goal" value={r.homework.strategicGoal} />
          <Field label="Habit" value={r.homework.habit} />
          <Field label="Estimated time" value={r.homework.estimatedTime} />
        </Section>

        <details className="rounded-2xl border border-border bg-card/40 p-4">
          <summary className="cursor-pointer text-sm font-medium">Show PGN</summary>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {row.pgn}
          </pre>
        </details>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
