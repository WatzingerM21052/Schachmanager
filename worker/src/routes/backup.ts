import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../db/audit";
import { exportBackupPayload, type BackupPayload } from "./backupData";

export async function exportBackup(request: AuthedRequest, env: Env): Promise<Response> {
  const payload = await exportBackupPayload(env);
  await logAudit(env, request.user!.sub, "export_backup", "Backup", null);
  return json(env, payload);
}

/**
 * DESTRUCTIVE: wipes and replaces Clubs/Players/Tournaments/TournamentResults/
 * YouthMembers/Attendance from an uploaded export. Admin-only, matches the old app's
 * explicit "current data will be overwritten" warning.
 */
export async function importBackup(request: AuthedRequest, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Partial<BackupPayload> | null;
  if (!body || !Array.isArray(body.clubs) || !Array.isArray(body.players)) {
    return error(env, "Invalid backup file", 400);
  }

  // Children first, then parents, to respect foreign keys during the wipe.
  await env.DB.batch([
    env.DB.prepare("DELETE FROM Attendance"),
    env.DB.prepare("DELETE FROM TournamentResults"),
    env.DB.prepare("DELETE FROM YouthMembers"),
    env.DB.prepare("DELETE FROM Tournaments"),
    env.DB.prepare("DELETE FROM Players"),
    env.DB.prepare("DELETE FROM Clubs"),
  ]);

  for (const c of body.clubs ?? []) {
    await env.DB.prepare("INSERT INTO Clubs (id, name, created_at) VALUES (?, ?, ?)").bind(c.id, c.name, c.created_at).run();
  }
  for (const p of body.players ?? []) {
    await env.DB.prepare(
      "INSERT INTO Players (id, firstname, lastname, elo, country, birth_year, club_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(p.id, p.firstname, p.lastname, p.elo, p.country, p.birth_year, p.club_id)
      .run();
  }
  for (const t of body.tournaments ?? []) {
    await env.DB.prepare(
      "INSERT INTO Tournaments (id, name, date, format, season, notes) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(t.id, t.name, t.date, t.format, t.season, t.notes)
      .run();
  }
  for (const r of body.tournamentResults ?? []) {
    await env.DB.prepare(
      `INSERT INTO TournamentResults
         (id, tournament_id, player_id, team_name, points, rank, board_no, opponent_player_id, round_no, result_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(r.id, r.tournament_id, r.player_id, r.team_name, r.points, r.rank, r.board_no, r.opponent_player_id, r.round_no, r.result_code)
      .run();
  }
  for (const m of body.youthMembers ?? []) {
    await env.DB.prepare(
      "INSERT INTO YouthMembers (id, firstname, lastname, birthdate, youth_status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(m.id, m.firstname, m.lastname, m.birthdate, m.youth_status, m.created_at)
      .run();
  }
  for (const a of body.attendance ?? []) {
    await env.DB.prepare("INSERT INTO Attendance (id, member_id, date, present) VALUES (?, ?, ?, ?)")
      .bind(a.id, a.member_id, a.date, a.present)
      .run();
  }

  await logAudit(env, request.user!.sub, "import_backup", "Backup", null, {
    clubs: body.clubs?.length ?? 0,
    players: body.players?.length ?? 0,
    tournaments: body.tournaments?.length ?? 0,
    tournamentResults: body.tournamentResults?.length ?? 0,
    youthMembers: body.youthMembers?.length ?? 0,
    attendance: body.attendance?.length ?? 0,
  });

  return json(env, { success: true });
}
