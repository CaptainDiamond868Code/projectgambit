import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  XAxis,
  CartesianGrid,
} from "recharts";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "My Games · Project Gambit" },
      { name: "description", content: "Your saved games and progress." },
    ],
  }),
  component: GamesPage,
});

interface SavedGameRow {
  id: string;
  pgn: string;
  player_color: "white" | "black";
  result: string | null;
  accuracy: number | null;
  avg_cp_loss: number | null;
  move_counts: Record<string, number>;
  estimated_rating_low: number | null;
  estimated_rating_high: number | null;
  opening: string | null;
  coaching_report: unknown;
  analyzed_at: string;
}

function GamesPage() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<SavedGameRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate({ to: "/login" });
    }
  }, [authLoading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("saved_games")
      .select("*")
      .order("analyzed_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error(error.message);
        setGames((data as SavedGameRow[] | null) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const stats = useMemo(() => {
    if (!games || games.length === 0) return null;
    const withAcc = games.filter((g) => typeof g.accuracy === "number");
    const avgAcc =
      withAcc.length > 0
        ? withAcc.reduce((s, g) => s + (g.accuracy ?? 0), 0) / withAcc.length
        : 0;
    const ratings = games.filter(
      (g) => g.estimated_rating_low != null && g.estimated_rating_high != null,
    );
    const avgRating =
      ratings.length > 0
        ? Math.round(
            ratings.reduce(
              (s, g) => s + ((g.estimated_rating_low! + g.estimated_rating_high!) / 2),
              0,
            ) / ratings.length,
          )
        : null;
    const totals: Record<string, number> = {};
    for (const g of games) {
      for (const [k, v] of Object.entries(g.move_counts || {})) {
        totals[k] = (totals[k] ?? 0) + (v as number);
      }
    }
    const mistakeCategories = ["blunder", "mistake", "inaccuracy"] as const;
    const mostCommon = mistakeCategories.reduce(
      (best, k) => ((totals[k] ?? 0) > (totals[best] ?? 0) ? k : best),
      "inaccuracy" as (typeof mistakeCategories)[number],
    );
    const trend = games
      .slice(0, 10)
      .reverse()
      .map((g, i) => ({
        idx: i + 1,
        accuracy: g.accuracy ?? 0,
        date: g.analyzed_at,
      }));
    return {
      total: games.length,
      avgAccuracy: Math.round(avgAcc * 10) / 10,
      avgRating,
      mostCommon,
      trend,
    };
  }, [games]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this saved game?")) return;
    const { error } = await supabase.from("saved_games").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setGames((g) => (g ? g.filter((x) => x.id !== id) : g));
    toast.success("Game deleted");
  };

  if (authLoading || !session) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">My Games</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your analyzed games and progress over time.
            </p>
          </div>
          <Button asChild variant="hero" size="sm">
            <Link to="/analyze">Analyze new game</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {stats && games && games.length >= 3 ? (
              <ProgressSection stats={stats} />
            ) : games && games.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                Analyze 3 or more games to see your progress.
              </div>
            ) : null}

            {games && games.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card/40 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven't saved any games yet.
                </p>
                <Button asChild variant="hero" size="sm" className="mt-4">
                  <Link to="/analyze">Analyze your first game</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
                <table className="w-full text-sm">
                  <thead className="bg-card/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Opening</th>
                      <th className="px-4 py-3">Result</th>
                      <th className="px-4 py-3">Accuracy</th>
                      <th className="px-4 py-3">Est. rating</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games?.map((g) => (
                      <tr key={g.id} className="border-t border-border/60">
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(g.analyzed_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">{g.opening ?? "—"}</td>
                        <td className="px-4 py-3">{g.result ?? "—"}</td>
                        <td className="px-4 py-3">
                          {g.accuracy != null ? `${g.accuracy}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {g.estimated_rating_low != null && g.estimated_rating_high != null
                            ? `~${g.estimated_rating_low}–${g.estimated_rating_high}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete game"
                              onClick={() => onDelete(g.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link to="/games/$gameId" params={{ gameId: g.id }}>
                                View report
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ProgressSection({
  stats,
}: {
  stats: {
    total: number;
    avgAccuracy: number;
    avgRating: number | null;
    mostCommon: string;
    trend: { idx: number; accuracy: number; date: string }[];
  };
}) {
  return (
    <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card/40 p-6 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <div className="text-xs font-medium uppercase tracking-widest text-primary">
          Accuracy trend
        </div>
        <div className="mt-2 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="idx" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}%`, "Accuracy"]}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Last {stats.trend.length} games (oldest to newest).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total games" value={String(stats.total)} />
        <StatCard
          label="Avg. rating"
          value={stats.avgRating != null ? `~${stats.avgRating}` : "—"}
        />
        <StatCard label="Avg. accuracy" value={`${stats.avgAccuracy}%`} />
        <StatCard label="Most common" value={stats.mostCommon} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold capitalize">{value}</div>
    </div>
  );
}