/** Compact game entry used in the catalog index for browsing and search. */
export interface CatalogGame {
  /** Deterministic ID: youtuber-playlist-filename-gameIndex (slugified) */
  id: string;
  /** YouTube handle without @ (folder name) */
  youtuber: string;
  /** YouTube display name (resolved from metadata.yaml or oEmbed) */
  youtuberDisplayName: string;
  /** Original YouTube playlist name (folder name) */
  playlist: string;
  /** PGN filename */
  fileName: string;
  /** Index within multi-game PGN (0-based) */
  gameIndex: number;
  /** White player name */
  white: string;
  /** Black player name */
  black: string;
  /** White Elo rating */
  whiteElo?: number;
  /** Black Elo rating */
  blackElo?: number;
  /** Game result */
  result: string;
  /** Game date in PGN format (YYYY.MM.DD) */
  date?: string;
  /** Event name */
  event?: string;
  /** ECO opening code */
  eco?: string;
  /** Opening name */
  opening?: string;
  /** Number of half-moves */
  moveCount: number;
  /** YouTube video title */
  videoTitle?: string;
  /** Whether the PGN has [%ts] timestamp annotations */
  hasTimestamps: boolean;
  /** Tags for filtering */
  tags: string[];
  /** Difficulty level */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  /** Language of video commentary */
  language?: string;
  /** PGN annotator */
  annotator?: string;
  /** Chess variant (if not standard) */
  variant?: string;
}

/** Full catalog index loaded by the SPA. */
export interface CatalogIndex {
  /** Schema version */
  version: number;
  /** ISO timestamp of when the catalog was generated */
  generatedAt: string;
  /** Total number of games */
  totalGames: number;
  /** All game entries */
  games: CatalogGame[];
  /** All unique tags across games */
  tags: string[];
  /** All unique opening names */
  openings: string[];
  /** All unique player names */
  players: string[];
  /** All unique youtuber handles */
  youtubers: string[];
  /** All unique annotator names */
  annotators: string[];
}

/** Detailed per-game data for the detail view. */
export interface GameDetail {
  /** Same ID as CatalogGame */
  id: string;
  /** All PGN headers */
  headers: Record<string, string>;
  /** Full PGN movetext (with annotations) */
  pgn: string;
  /** Relative path to PGN file (e.g., "pgn/AlexBanzea/playlist/video.pgn") */
  pgnPath: string;
  /** First N moves as plain text */
  firstMoves: string;
  /** Starting FEN position */
  startingFen: string;
  /** Optional description */
  description?: string;
}
