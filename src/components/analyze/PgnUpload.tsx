import { useCallback, useRef, useState } from "react";
import { FileUp, CheckCircle2, AlertTriangle, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validatePgn } from "@/lib/chess/pgn";
import { SAMPLE_PGN } from "@/lib/chess/samples";
import type { Color, GameMeta } from "@/lib/chess/types";

interface PgnUploadProps {
  onAnalyze: (pgn: string, meta: GameMeta, color: Color) => void;
}

export function PgnUpload({ onAnalyze }: PgnUploadProps) {
  const [pgn, setPgn] = useState("");
  const [dragging, setDragging] = useState(false);
  const [color, setColor] = useState<Color>("white");
  const fileRef = useRef<HTMLInputElement>(null);

  const result = pgn.trim() ? validatePgn(pgn) : null;
  const meta = result?.valid ? result.game!.meta : null;

  const readFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPgn(String(reader.result ?? ""));
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [readFile],
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card/40 hover:border-primary/50",
        )}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileUp className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Upload your game</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag &amp; drop a <span className="font-medium text-foreground">.pgn</span> file, or
          paste the moves below.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Browse files
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPgn(SAMPLE_PGN)}
            className="text-primary hover:text-primary"
          >
            <Sparkles className="h-4 w-4" /> Try a sample game
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pgn,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
          }}
        />
      </div>

      <textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        placeholder={'Paste PGN here, e.g.\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...'}
        spellCheck={false}
        className="mt-4 h-40 w-full resize-none rounded-xl border border-input bg-card/60 p-4 font-mono text-sm text-foreground outline-none ring-ring placeholder:text-muted-foreground/60 focus-visible:ring-1"
      />

      {pgn.trim() && result && !result.valid && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-cls-blunder/40 bg-cls-blunder/10 p-3 text-sm text-cls-blunder">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {meta && (
        <div className="mt-4 rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-cls-excellent">
            <CheckCircle2 className="h-4 w-4" /> Valid PGN — ready to analyze
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Meta label="White" value={meta.white} />
            <Meta label="Black" value={meta.black} />
            <Meta label="Result" value={meta.result} />
            <Meta label="Moves" value={String(result!.game!.moveCount)} />
            {meta.opening && <Meta label="Opening" value={meta.opening} />}
            {meta.date && <Meta label="Date" value={meta.date} />}
          </div>

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
            onClick={() => onAnalyze(result!.game!.pgn, meta, color)}
          >
            Analyze My Game
          </Button>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/40 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  );
}