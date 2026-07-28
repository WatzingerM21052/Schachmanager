import type { Env } from "../env";
import type { AttendanceRow, ClubRow, PlayerRow, TournamentResultRow, TournamentRow, YouthMemberRow } from "../db/types";

/**
 * Backup covers club/tournament/youth data (Clubs, Players, Tournaments, TournamentResults,
 * YouthMembers, Attendance) - deliberately excludes Users/AuditLog, since restoring old
 * password hashes or overwriting the current admin account would be a security footgun.
 */
export interface BackupPayload {
  exportedAt: string;
  clubs: ClubRow[];
  players: PlayerRow[];
  tournaments: TournamentRow[];
  tournamentResults: TournamentResultRow[];
  youthMembers: YouthMemberRow[];
  attendance: AttendanceRow[];
}

export async function exportBackupPayload(env: Env): Promise<BackupPayload> {
  const [clubs, players, tournaments, tournamentResults, youthMembers, attendance] = await Promise.all([
    env.DB.prepare("SELECT * FROM Clubs").all<ClubRow>(),
    env.DB.prepare("SELECT * FROM Players").all<PlayerRow>(),
    env.DB.prepare("SELECT * FROM Tournaments").all<TournamentRow>(),
    env.DB.prepare("SELECT * FROM TournamentResults").all<TournamentResultRow>(),
    env.DB.prepare("SELECT * FROM YouthMembers").all<YouthMemberRow>(),
    env.DB.prepare("SELECT * FROM Attendance").all<AttendanceRow>(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    clubs: clubs.results,
    players: players.results,
    tournaments: tournaments.results,
    tournamentResults: tournamentResults.results,
    youthMembers: youthMembers.results,
    attendance: attendance.results,
  };
}
