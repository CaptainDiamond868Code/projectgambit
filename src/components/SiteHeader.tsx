import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LogOut, User as UserIcon, Library, Settings as SettingsIcon, Sun, Moon, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, username, user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const onAnalyzePage = location.pathname === "/analyze";
  const displayName = username ?? user?.email?.split("@")[0] ?? "";
  const initial = (displayName || "U").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg [background-image:var(--gradient-primary)] text-primary-foreground">
            ♞
          </span>
          Project Gambit
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/board">
              <Swords className="h-4 w-4" /> Analysis Board
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
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
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">
                  {displayName || "Signed in"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="sm:hidden">
                  <Link to="/board">
                    <Swords className="h-4 w-4" /> Analysis Board
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/games">
                    <Library className="h-4 w-4" /> My Games
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <SettingsIcon className="h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/login">
                <UserIcon className="h-4 w-4" /> Sign in / Sign up
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
