import { useCallback, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  Upload,
  ScanLine,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scanScoresheet } from "@/lib/scoresheet.functions";
import { validateMoves } from "@/lib/chess/scoresheet";
import type { Color, GameMeta } from "@/lib/chess/types";

interface ScoresheetScannerProps {
  onAnalyze: (pgn: string, meta: GameMeta, color: Color) => void;
}

/** Downscale a captured image so the base64 payload stays reasonable. */
async function fileToDataUrl(file: File, maxDim = 1600): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale >= 1) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ScoresheetScanner({ onAnalyze }: ScoresheetScannerProps) {
  const scan = useServerFn(scanScoresheet);
  const fileRef = useRef<HTMLInputElement>(null);

  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moves, setMoves] = useState<string[] | null>(null);
  const [meta, setMeta] = useState<Partial<GameMeta>>({});
  const [color, setColor] = useState<Color>("white");

  const validation = useMemo(
    () => (moves ? validateMoves(moves, meta) : null),
    [moves, meta],
  );

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      try {
        urls.push(await fileToDataUrl(file));
      } catch {
        setError("Couldn't read that image. Try a clearer photo.");
      }
    }
    setPreviews((prev) => [...prev, ...urls].slice(0, 4));
  }, []);

  const runScan = useCallback(async () => {
    if (previews.length === 0) return;
    setScanning(true);
    setError(null);
    try {
      const result = await scan({ data: { images: previews } });
      setMoves(result.moves);
      setMeta({
        white: result.white || "White",
        black: result.black || "Black",
        result: result.result || "*",
        event: result.event || undefined,
        date: result.date || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scanning failed. Please try again.");
    } finally {
      setScanning(false);
    }
  }, [previews, scan]);

  const editMove = (index: number, value: string) => {
    setMoves((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeMove = (index: number) => {
    setMoves((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  };

  const addMove = () => setMoves((prev) => [...(prev ?? []), ""]);

  const resetAll = () => {
    setPreviews([]);
    setMoves(null);
    setMeta({});
    setError(null);
  };

  const startAnalyze = () => {
    if (!validation?.allLegal) return;
    const gameMeta: GameMeta = {
      white: meta.white || "White",
      black: meta.black || "Black",
      result: meta.result || "*",
      event: meta.event,
      date: meta.date,
    };
    onAnalyze(validation.pgn, gameMeta, color);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Upload / capture zone */}
      <div className="rounded-2xl border-2 border-dashed border-border bg-card/40 p-8 text-center transition-colors hover:border-primary/50">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ScanLine className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Scan a physical scoresheet</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Take a photo of your handwritten notation and we'll turn it into a PGN you can review
          and edit before analyzing.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload photo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary"
            onClick={() => {
              fileRef.current?.setAttribute("capture", "environment");
              fileRef.current?.click();
            }}
          >
            <Camera className="h-4 w-4" /> Use camera
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {previews.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {previews.map((src, i) => (
            <div key={i} className="relative animate-fade-up">
              <img
                src={src}
                alt={`Scoresheet ${i + 1}`}
                className="h-24 w-24 rounded-lg border border-border object-cover"
              />
              <button
                onClick={() => setPreviews((p) => p.filter((_, idx) => idx !== i))}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-cls-blunder/40 bg-cls-blunder/10 p-3 text-sm text-cls-blunder">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {previews.length > 0 && !moves && (
        <Button
          variant="hero"
          size="lg"
          className="mt-4 w-full"
          onClick={runScan}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Reading your scoresheet…
            </>
          ) : (
            <>
              <ScanLine className="h-4 w-4" /> Scan &amp; recognize moves
            </>
          )}
        </Button>
      )}

      {/* Recognized moves editor */}
      {moves && validation && (
        <div className="mt-6 animate-fade-up rounded-2xl border border-border bg-card/60 p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Review recognized moves</h3>
            <Button variant="ghost" size="sm" onClick={resetAll}>
              <X className="h-4 w-4" /> Start over
            </Button>
          </div>

          <div className="mt-2 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              We read your notation against the real position. Imperfect but clear moves (like
              "ed5" or "dc") are auto-corrected and shown with a{" "}
              <span className="font-medium text-cls-good">→</span> hint. Only moves we genuinely
              can't place are flagged for you to fix.
            </span>
          </div>

          {(validation.correctedCount > 0 || validation.issueCount > 0) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {validation.correctedCount > 0 && (
                <span className="rounded-full border border-cls-good/40 bg-cls-good/10 px-2.5 py-1 font-medium text-cls-good">
                  {validation.correctedCount} auto-corrected
                </span>
              )}
              {validation.issueCount > 0 && (
                <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-medium text-gold">
                  {validation.issueCount} need{validation.issueCount === 1 ? "s" : ""} your attention
                </span>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {validation.entries.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border bg-background/40 px-2 py-1.5",
                  entry.status === "illegal" && "border-cls-blunder/50 bg-cls-blunder/10",
                  entry.status === "ambiguous" && "border-gold/50 bg-gold/10",
                  entry.status === "corrected" && "border-cls-good/40 bg-cls-good/5",
                  entry.status === "unchecked" && "border-border/40 opacity-70",
                  entry.status === "legal" && "border-border",
                )}
              >
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {entry.color === "white" ? `${entry.moveNumber}.` : ""}
                </span>
                <div className="min-w-0 flex-1">
                  <input
                    value={entry.raw}
                    onChange={(e) => editMove(i, e.target.value)}
                    spellCheck={false}
                    className={cn(
                      "w-full min-w-0 rounded bg-transparent px-1 py-0.5 font-mono text-sm outline-none focus:bg-secondary/40",
                      entry.status === "illegal" && "text-cls-blunder",
                      entry.status === "ambiguous" && "text-gold",
                      (entry.status === "legal" ||
                        entry.status === "corrected" ||
                        entry.status === "unchecked") &&
                        "text-foreground",
                    )}
                  />
                  {entry.corrected && (
                    <span className="block px-1 font-mono text-[11px] text-cls-good">
                      → {entry.san.replace(/[+#]/g, "")}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeMove(i)}
                  className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
                  aria-label="Remove move"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Only the moves that genuinely need a decision */}
          {validation.entries.some(
            (e) => e.status === "ambiguous" || e.status === "illegal",
          ) && (
            <div className="mt-4 space-y-2 rounded-xl border border-gold/30 bg-gold/5 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold">
                <AlertTriangle className="h-3.5 w-3.5" /> Needs your attention
              </div>
              {validation.entries.map((entry, i) =>
                entry.status === "ambiguous" || entry.status === "illegal" ? (
                  <div key={i} className="text-xs">
                    <span className="text-muted-foreground">
                      Move {entry.moveNumber}
                      {entry.color === "black" ? "…" : "."}{" "}
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      "{entry.raw || "—"}"
                    </span>{" "}
                    <span className="text-muted-foreground">{entry.note}</span>
                    {entry.status === "ambiguous" && entry.candidates && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {entry.candidates.map((cand) => (
                          <button
                            key={cand}
                            onClick={() => editMove(i, cand)}
                            className="rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-xs text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                          >
                            {cand}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null,
              )}
            </div>
          )}

          <Button variant="outline" size="sm" className="mt-3" onClick={addMove}>
            + Add move
          </Button>

          {/* PGN preview */}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Generated PGN
              </span>
              {validation.allLegal ? (
                <span className="flex items-center gap-1 text-xs font-medium text-cls-excellent">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Valid — {validation.legalCount} moves
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-cls-blunder">
                  <AlertTriangle className="h-3.5 w-3.5" /> Fix highlighted moves
                </span>
              )}
            </div>
            <pre className="max-h-32 overflow-auto rounded-xl border border-border bg-background/40 p-3 font-mono text-xs text-foreground/90">
              {validation.pgn || "—"}
            </pre>
          </div>

          {/* Side selector + analyze */}
          <div className="mt-5">
            <p className="text-sm font-medium">Which side did you play?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["white", "black"] as Color[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition-colors",
                    color === c
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {c === "white" ? "♔ " : "♚ "}
                  {c} — {c === "white" ? meta.white : meta.black}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="hero"
            size="lg"
            className="mt-5 w-full"
            onClick={startAnalyze}
            disabled={!validation.allLegal}
          >
            {validation.allLegal ? "Analyze My Game" : "Fix the highlighted moves to continue"}
          </Button>
        </div>
      )}
    </div>
  );
}
