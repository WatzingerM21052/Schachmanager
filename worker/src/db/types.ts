import type { Role } from "../auth/jwt";

export interface UserRow {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  password_salt: string;
  role: Role;
  is_active: number;
  created_at: string;
  last_login: string | null;
}

export interface ClubRow {
  id: number;
  name: string;
  created_at: string;
}

export interface PlayerRow {
  id: number;
  firstname: string;
  lastname: string;
  elo: number | null;
  country: string | null;
  birth_year: number | null;
  club_id: number | null;
}

export type TournamentFormatName = "SchuelerLiga" | "Swiss" | "RoundRobin" | "TeamLeague" | "Knockout";

export interface TournamentRow {
  id: number;
  name: string;
  date: string;
  format: TournamentFormatName;
  season: string | null;
  notes: string | null;
}

export interface TournamentResultRow {
  id: number;
  tournament_id: number;
  player_id: number | null;
  team_name: string | null;
  points: number;
  rank: number | null;
  board_no: number | null;
  opponent_player_id: number | null;
  round_no: number | null;
  result_code: string | null;
}

export interface YouthMemberRow {
  id: number;
  firstname: string;
  lastname: string;
  birthdate: string;
  youth_status: string;
  created_at: string;
}

export interface AttendanceRow {
  id: number;
  member_id: number;
  date: string;
  present: number;
}
