import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Moon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { deleteAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Project Gambit" },
      { name: "description", content: "Manage your profile, account and preferences." },
    ],
  }),
  component: SettingsPage,
});

const DEFAULT_COLOR_KEY = "pg-default-color";

function SettingsPage() {
  const navigate = useNavigate();
  const { session, user, username, loading, refreshUsername, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [defaultColor, setDefaultColor] = useState<"white" | "black">("white");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(DEFAULT_COLOR_KEY);
    if (v === "black" || v === "white") setDefaultColor(v);
  }, []);

  if (!session || !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
      </div>
    );
  }

  const googleLinked = (user.identities ?? []).some((i) => i.provider === "google");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, account, and preferences.
        </p>

        <div className="mt-8 space-y-6">
          <Section title="Profile">
            <UsernameForm current={username ?? ""} onSaved={refreshUsername} />
            <div className="space-y-1.5">
              <Label>Account email</Label>
              <Input value={user.email ?? ""} readOnly disabled />
            </div>
          </Section>

          <Section title="Account">
            <EmailForm currentEmail={user.email ?? ""} />
            <PasswordForm email={user.email ?? ""} />
            <div className="space-y-1.5">
              <Label>Connected sign-in methods</Label>
              <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2">
                <span className="text-sm">
                  Google —{" "}
                  <span className={googleLinked ? "text-primary" : "text-muted-foreground"}>
                    {googleLinked ? "Connected" : "Not connected"}
                  </span>
                </span>
                <GoogleLinkButton linked={googleLinked} />
              </div>
            </div>
          </Section>

          <Section title="Preferences">
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={theme === "light" ? "hero" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-4 w-4" /> Light
                </Button>
                <Button
                  type="button"
                  variant={theme === "dark" ? "hero" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-4 w-4" /> Dark
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default-color">Default analysis color</Label>
              <Select
                value={defaultColor}
                onValueChange={(v) => {
                  const next = v === "black" ? "black" : "white";
                  setDefaultColor(next);
                  try {
                    window.localStorage.setItem(DEFAULT_COLOR_KEY, next);
                  } catch {
                    /* ignore */
                  }
                  toast.success("Preference saved");
                }}
              >
                <SelectTrigger id="default-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Section title="Danger Zone" tone="danger">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all your saved games. This cannot be undone.
            </p>
            <DeleteAccountButton
              onDeleted={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            />
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border ${
        tone === "danger" ? "border-destructive/40" : "border-border"
      } bg-card/60 p-6 shadow-[var(--shadow-card)]`}
    >
      <h2
        className={`font-display text-lg font-semibold ${
          tone === "danger" ? "text-destructive" : ""
        }`}
      >
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function UsernameForm({ current, onSaved }: { current: string; onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);

  useEffect(() => setValue(current), [current]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username: trimmed }, { onConflict: "id" });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "That username is already taken" : error.message);
      return;
    }
    await onSaved();
    toast.success("Username updated");
  };

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <Label htmlFor="username">Display username</Label>
      <div className="flex gap-2">
        <Input
          id="username"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          minLength={3}
        />
        <Button type="submit" variant="hero" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || value === currentEmail) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: value });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your new inbox to confirm the change");
    setValue("");
  };
  return (
    <form onSubmit={submit} className="space-y-1.5">
      <Label htmlFor="new-email">Change email address</Label>
      <div className="flex gap-2">
        <Input
          id="new-email"
          type="email"
          placeholder="new@example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" variant="hero" disabled={busy || !value}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function PasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    setBusy(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signErr) {
      setBusy(false);
      toast.error("Current password is incorrect");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Password updated");
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Label>Change password</Label>
      <Input
        type="password"
        placeholder="Current password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
      />
      <Input
        type="password"
        placeholder="New password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
      />
      <Input
        type="password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />
      <Button type="submit" variant="hero" disabled={busy || !current || !next || !confirm}>
        {busy ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}

function GoogleLinkButton({ linked }: { linked: boolean }) {
  const [busy, setBusy] = useState(false);
  const onConnect = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error(result.error.message ?? "Google connect failed");
    }
  };
  const onDisconnect = async () => {
    setBusy(true);
    const { data } = await supabase.auth.getUserIdentities();
    const identity = data?.identities?.find((i) => i.provider === "google");
    if (!identity) {
      setBusy(false);
      toast.error("No Google identity to disconnect");
      return;
    }
    const { error } = await supabase.auth.unlinkIdentity(identity);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Google disconnected");
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={linked ? onDisconnect : onConnect}
    >
      {linked ? "Disconnect" : "Connect"}
    </Button>
  );
}

function DeleteAccountButton({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const del = useServerFn(deleteAccount);
  const run = async () => {
    setBusy(true);
    try {
      await del();
      toast.success("Account deleted");
      await onDeleted();
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
    }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your account and every saved game. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              void run();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? "Deleting…" : "Yes, delete everything"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}