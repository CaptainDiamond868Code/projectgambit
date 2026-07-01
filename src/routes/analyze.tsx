import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { AnalysisWorkspace } from "@/components/analyze/AnalysisWorkspace";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze · Project Gambit" },
      {
        name: "description",
        content: "Upload a PGN and get a Stockfish-powered coaching report.",
      },
    ],
  }),
  component: AnalyzePage,
});

function AnalyzePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnalysisWorkspace />
      </main>
    </div>
  );
}