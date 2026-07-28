import type { ClubRow, PlayerRow, TournamentResultRow, TournamentRow } from "../db/types";

/** One row parsed out of an uploaded CSV, ready to be resolved to a player/team and inserted. */
export interface ParsedResultRow {
  /** Matched by "lastname, firstname" or "firstname lastname" against existing Players, created if not found. */
  firstname?: string;
  lastname?: string;
  teamName?: string;
  elo?: number | null;
  country?: string | null;
  clubName?: string | null;
  points: number;
  rank?: number | null;
  boardNo?: number | null;
  opponentName?: string | null;
  roundNo?: number | null;
  resultCode?: string | null;
}

export interface StandingRow {
  rank: number;
  playerId?: number;
  teamName?: string;
  displayName: string;
  clubName?: string;
  ageGroup?: string;
  points: number;
  tournamentsPlayed: number;
  /** tournament_id -> that tournament's rank/points for matrix-style display, mirrors today's Auswertung.razor table */
  perTournament: Record<number, { points: number; rank: number | null }>;
}

export interface StandingsContext {
  tournaments: TournamentRow[];
  results: TournamentResultRow[];
  players: PlayerRow[];
  clubs: ClubRow[];
  /** Format-specific knobs, e.g. { bestOf4: true, ageFilter: "U12", clubFilter: "..." } */
  options?: Record<string, unknown>;
}

export interface TournamentFormat {
  /** Parses an uploaded CSV's text content into rows ready for insertion for ONE tournament. */
  parseCsv(fileText: string): ParsedResultRow[];
  /** Computes the leaderboard/standings for a set of tournaments+results belonging to this format. */
  computeStandings(ctx: StandingsContext): StandingRow[];
}
