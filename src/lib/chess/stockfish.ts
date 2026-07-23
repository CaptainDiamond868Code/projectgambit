import type { Evaluation } from "./types";

/**
 * Thin wrapper around the single-threaded Stockfish 18 WASM build that ships in
 * /public/stockfish. This is the ONLY source of chess evaluation in the app.
 * Runs entirely in the browser via a Web Worker — never on the server.
 */

const ENGINE_URL = "/stockfish/stockfish-18-lite-single.js";

function sideToMoveFromFen(fen: string): "w" | "b" {
  return (fen.split(" ")[1] as "w" | "b") ?? "w";
}

interface PendingEval {
  fen: string;
  depth: number;
  resolve: (evaluation: Evaluation) => void;
  reject: (err: Error) => void;
  latest: { cp: number | null; mate: number | null; pv: string[]; depth: number };
}

/** One line of a MultiPV live analysis, updated as the engine searches deeper. */
export interface MultiPvLine {
  /** 1-based line rank (1 = best line found so far). */
  multipv: number;
  cp: number | null;
  mate: number | null;
  /** Principal variation in UCI notation. */
  pv: string[];
  depth: number;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private current: PendingEval | null = null;
  /** Bumped every startAnalysis() call so stale async handshakes never touch a newer session. */
  private streamGeneration = 0;

  async init(): Promise<void> {
    if (this.ready) return;
    if (typeof window === "undefined") {
      throw new Error("Stockfish can only run in the browser.");
    }

    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (e: MessageEvent) => this.onMessage(e);

    await this.waitFor("uciok", () => this.send("uci"));
    await this.waitFor("readyok", () => this.send("isready"));
    this.send("setoption name Threads value 1");
    this.send("setoption name Hash value 32");
    this.ready = true;
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private waitFor(token: string, trigger: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Stockfish timed out waiting for "${token}"`)),
        20000,
      );
      const handler = (e: MessageEvent) => {
        const line = typeof e.data === "string" ? e.data : "";
        if (line.includes(token)) {
          clearTimeout(timer);
          this.worker?.removeEventListener("message", handler);
          resolve();
        }
      };
      this.worker?.addEventListener("message", handler);
      trigger();
    });
  }

  private onMessage(e: MessageEvent) {
    const line = typeof e.data === "string" ? e.data : "";
    if (!line || !this.current) return;

    if (line.startsWith("info") && line.includes(" score ")) {
      this.parseInfo(line);
      return;
    }

    if (line.startsWith("bestmove")) {
      const parts = line.split(/\s+/);
      const bestMove = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
      this.resolveCurrent(bestMove);
    }
  }

  private parseInfo(line: string) {
    if (!this.current) return;
    const tokens = line.split(/\s+/);

    const depthIdx = tokens.indexOf("depth");
    const depth = depthIdx >= 0 ? Number(tokens[depthIdx + 1]) : this.current.latest.depth;

    const scoreIdx = tokens.indexOf("score");
    let cp: number | null = null;
    let mate: number | null = null;
    if (scoreIdx >= 0) {
      const kind = tokens[scoreIdx + 1];
      const value = Number(tokens[scoreIdx + 2]);
      const stm = sideToMoveFromFen(this.current.fen);
      const sign = stm === "w" ? 1 : -1; // normalize to White POV
      if (kind === "cp") cp = sign * value;
      else if (kind === "mate") mate = sign * value;
    }

    const pvIdx = tokens.indexOf("pv");
    const pv = pvIdx >= 0 ? tokens.slice(pvIdx + 1) : this.current.latest.pv;

    // Only keep the deepest completed line.
    if (depth >= this.current.latest.depth) {
      this.current.latest = { cp, mate, pv, depth };
    }
  }

  private resolveCurrent(bestMove: string | null) {
    if (!this.current) return;
    const { latest, resolve } = this.current;
    const pv = latest.pv.length ? latest.pv : bestMove ? [bestMove] : [];
    resolve({
      cp: latest.cp,
      mate: latest.mate,
      bestMove: bestMove ?? pv[0] ?? null,
      pv,
      depth: latest.depth,
    });
    this.current = null;
  }

  /** Evaluate a single FEN to a fixed depth. Returns a White-POV evaluation. */
  evaluate(fen: string, depth: number): Promise<Evaluation> {
    if (!this.worker || !this.ready) {
      return Promise.reject(new Error("Stockfish engine is not initialized."));
    }
    return new Promise<Evaluation>((resolve, reject) => {
      this.current = {
        fen,
        depth,
        resolve,
        reject,
        latest: { cp: null, mate: null, pv: [], depth: 0 },
      };
      this.send("ucinewgame");
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  /**
   * Sends "stop" and waits for the engine's "bestmove" acknowledgement (or a
   * short timeout) before resolving. UCI engines expect a running search to
   * be fully halted before you issue a new "position"/"go" — sending them
   * back to back without waiting can desync the engine so it never emits
   * further info lines at all. This is what makes startAnalysis() safe to
   * call repeatedly in quick succession (e.g. every time the user moves a
   * piece, or changes depth/line-count on the analysis board).
   */
  private stopAndWaitBestmove(timeoutMs = 1500): Promise<void> {
    if (!this.worker) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.worker?.removeEventListener("message", handler);
        clearTimeout(timer);
        resolve();
      };
      const handler = (e: MessageEvent) => {
        const line = typeof e.data === "string" ? e.data : "";
        if (line.startsWith("bestmove")) finish();
      };
      this.worker?.addEventListener("message", handler);
      const timer = setTimeout(finish, timeoutMs);
      this.send("stop");
    });
  }

  /**
   * Streams the top N ("MultiPV") engine lines for a position as the search
   * deepens, calling onUpdate with the current best-known lines every time
   * one improves — this is what powers the analysis board's live engine
   * panel, similar to chess.com's analysis view. Independent of evaluate();
   * uses its own message listener so it never interferes with single-line
   * evaluation calls elsewhere in the app (e.g. during full-game analysis).
   *
   * Safely stops and waits for any previous search on this engine instance
   * to fully halt before starting the new one, so repeated calls (new
   * position, new depth, new line count) never desync the engine.
   *
   * Returns a stop() function — call it to cancel the search early or when
   * unmounting.
   */
  startAnalysis(
    fen: string,
    options: { multiPv?: number; depth?: number } = {},
    onUpdate: (lines: MultiPvLine[]) => void,
  ): () => void {
    if (!this.worker || !this.ready) {
      throw new Error("Stockfish engine is not initialized.");
    }
    const multiPv = options.multiPv ?? 3;
    const depth = options.depth ?? 20;
    const generation = ++this.streamGeneration;
    const lines = new Map<number, MultiPvLine>();
    let stopped = false;

    const handler = (e: MessageEvent) => {
      if (stopped || generation !== this.streamGeneration) return;
      const line = typeof e.data === "string" ? e.data : "";
      if (!line || !line.startsWith("info") || !line.includes(" score ")) return;

      const tokens = line.split(/\s+/);
      const mpvIdx = tokens.indexOf("multipv");
      const mpv = mpvIdx >= 0 ? Number(tokens[mpvIdx + 1]) : 1;

      const depthIdx = tokens.indexOf("depth");
      const d = depthIdx >= 0 ? Number(tokens[depthIdx + 1]) : 0;

      const scoreIdx = tokens.indexOf("score");
      let cp: number | null = null;
      let mate: number | null = null;
      if (scoreIdx >= 0) {
        const kind = tokens[scoreIdx + 1];
        const value = Number(tokens[scoreIdx + 2]);
        const stm = sideToMoveFromFen(fen);
        const sign = stm === "w" ? 1 : -1;
        if (kind === "cp") cp = sign * value;
        else if (kind === "mate") mate = sign * value;
      }

      const pvIdx = tokens.indexOf("pv");
      const pv = pvIdx >= 0 ? tokens.slice(pvIdx + 1) : [];
      if (pv.length === 0) return;

      const existing = lines.get(mpv);
      if (!existing || d >= existing.depth) {
        lines.set(mpv, { multipv: mpv, cp, mate, pv, depth: d });
        onUpdate(Array.from(lines.values()).sort((a, b) => a.multipv - b.multipv));
      }
    };

    this.worker.addEventListener("message", handler);

    // Always fully stop whatever the engine was doing before starting the
    // next search — this is the critical fix that prevents the engine from
    // silently hanging when the position/depth/line-count changes quickly.
    void this.stopAndWaitBestmove().then(() => {
      if (stopped || generation !== this.streamGeneration || !this.worker) return;
      this.send(`setoption name MultiPV value ${multiPv}`);
      this.send("ucinewgame");
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });

    return () => {
      stopped = true;
      this.worker?.removeEventListener("message", handler);
      this.send("stop");
    };
  }

  quit() {
    try {
      this.send("quit");
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
    this.ready = false;
    this.current = null;
  }
}
