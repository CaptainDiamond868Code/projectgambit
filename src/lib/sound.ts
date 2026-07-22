/**
 * Lightweight sound effects synthesized with the Web Audio API — no audio
 * files needed. A single AudioContext is created lazily on first use (all
 * call sites are inside user click/drag handlers, so this satisfies browser
 * autoplay policies).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  context: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(context.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Short, subtle "tap" — played whenever a move is made on the analysis board. */
export function playMoveSound() {
  const context = getCtx();
  if (!context) return;
  tone(context, 520, context.currentTime, 0.09, "triangle", 0.16);
}

/** Slightly different tone for captures — a touch lower and punchier. */
export function playCaptureSound() {
  const context = getCtx();
  if (!context) return;
  tone(context, 300, context.currentTime, 0.11, "square", 0.13);
}

/** Two-note ascending chime — played when a game is successfully uploaded/loaded. */
export function playUploadSound() {
  const context = getCtx();
  if (!context) return;
  const now = context.currentTime;
  tone(context, 440, now, 0.12, "sine", 0.15);
  tone(context, 660, now + 0.09, 0.18, "sine", 0.15);
}
