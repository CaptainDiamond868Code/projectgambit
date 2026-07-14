import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const location = useLocation();
  const onAnalyzePage = location.pathname === "/analyze";

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg [background-image:var(--gradient-primary)] text-primary-foreground">
            ♞
          </span>
          Project Gambit
        </Link>
        {onAnalyzePage ? (
          <Button
            variant="hero"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Analyze My Game
          </Button>
        ) : (
          <Button asChild variant="hero" size="sm">
            <Link to="/analyze">Analyze My Game</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
