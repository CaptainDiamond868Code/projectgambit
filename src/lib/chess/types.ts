// Shared chess-analysis types. Every evaluation value in the app originates
// from Stockfish — the AI layer only ever explains these numbers.

export type Color = "white" | "black";

export type MoveClassification =
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type GamePhase = "opening" | "middlegame" | "endgame";

/** Raw evaluation from Stockfish, normalized to White's point of view. */
export interface Evaluation {
  /** Centipawns from White's perspective (null when a forced mate is found). */
  cp: number | null;
  /** Moves-to-mate from White's perspective (positive = White mates). */
  mate: number | null;
  /** Best move in UCI notation (e.g. "e2e4"). */
  bestMove: string | null;
  /** Principal variation in UCI notation. */
  pv: string[];
  /** Depth the evaluation was searched to. */
  depth: number;
}

export interface AnalyzedMove {
  /** 0-based ply index. */
  ply: number;
  /** Full-move number (1, 1, 2, 2, ...). */
  moveNumber: number;
  color: Color;
  san: string;
  uci: string;
  /** FEN before the move was played. */
  fenBefore: string;
  /** FEN after the move was played. */
  fenAfter: string;
  /** Evaluation of the position before the move, White POV. */
  evalBefore: Evaluation;
  /** Evaluation of the resulting position, White POV. */
  evalAfter: Evaluation;
  /** Engine's best move at fenBefore, in SAN. */
  bestMoveSan: string | null;
  /** Engine's best move at fenBefore, in UCI. */
  bestMoveUci: string | null;
  /** Principal variation from fenBefore, in SAN. */
  bestLineSan: string[];
  /** Centipawn loss vs. the engine's best move (>= 0). */
  centipawnLoss: number;
  classification: MoveClassification;
  phase: GamePhase;
}

export interface PlayerStats {
  color: Color;
  accuracy: number;
  averageCentipawnLoss: number;
  counts: Record<MoveClassification, number>;
}

export interface GameMeta {
  white: string;
  black: string;
  result: string;
  event?: string;
  date?: string;
  opening?: string;
  eco?: string;
}

export interface GameAnalysis {
  meta: GameMeta;
  moves: AnalyzedMove[];
  fens: string[];
  stats: Record<Color, PlayerStats>;
  depth: number;
}

/** The three biggest mistakes for a given player, fed to the coach. */
export interface KeyMistake {
  ply: number;
  moveNumber: number;
  color: Color;
  san: string;
  bestMoveSan: string | null;
  bestLineSan: string[];
  centipawnLoss: number;
  classification: MoveClassification;
  phase: GamePhase;
  evalBeforeText: string;
  evalAfterText: string;
  fenBefore: string;
  fenAfter: string;
}

export interface CoachingReport {
  /** Quick-read profile cards shown above the report. */
  playerSnapshot: {
    playingStyle: string;
    biggestStrength: string;
    biggestWeakness: string;
    recommendedFocus: string;
    estimatedLevel: string;
    /** 0-100 how confident the coach is in this read of the player. */
    confidenceScore: number;
  };
  /** Phase-by-phase written summary of the game. */
  gameSummary: {
    opening: string;
    middlegame: string;
    endgame: string;
    tacticalAwareness: string;
    strategicPlanning: string;
    pieceActivity: string;
    kingSafety: string;
    decisionMaking: string;
    timeManagement: string;
    /** One sentence describing the player's overall style. */
    playingStyle: string;
  };
  biggestStrength: { title: string; detail: string };
  biggestWeakness: { title: string; detail: string };
  mistakes: Array<{
    whatHappened: string;
    whyItHappened: string;
    betterPlan: string;
    keyLesson: string;
    patternCategory: string;
  }>;
  /** Actionable practice plan before the next game. */
  homework: {
    tacticalExercise: string;
    strategicGoal: string;
    habit: string;
    estimatedTime: string;
  };
}