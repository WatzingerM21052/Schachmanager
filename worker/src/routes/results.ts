import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../db/audit";
import type { TournamentResultRow } from "../db/types";
import { ageGroupForBirthYear } from "../ageGroup";
import { findOrCreateClub, findOrCreatePlayer } from "../db/playerLookup";

interface ResultWithPlayerRow extends TournamentResultRow {
  firstname: string | null;
  lastname: string | null;
  club_name: string | null;
  birth_year: number | null;
}

function toDto(r: ResultWithPlayerRow) {
  return {
    id: r.id,
    tournamentId: r.tournament_id,
    playerId: r.player_id,
    teamName: r.team_name,
    displayName: r.player_id ? `${r.lastname} ${r.firstname}` : r.team_name ?? "",
    clubName: r.club_name,
    ageGroup: r.birth_year ? ageGroupForBirthYear(r.birth_year) : null,
    points: r.points,
    rank: r.rank,
    boardNo: r.board_no,
    roundNo: r.round_no,
    resultCode: r.result_code,
  };
}

/**
 * GET /api/tournaments/{id}/results - raw, individually-editable rows (as opposed to
 * /standings, which returns computed/ranked/grouped aggregates). Backs the manual
 * correction UI: fixing a bad import, or entering results by hand when there's no file
 * to import at all.
 */
export async function listResults(request: AuthedRequest, env: Env): Promise<Response> {
  const tournamentId = Number(request.params?.id);
  const { results } = await env.DB.prepare(
    `SELECT tr.*, p.firstname, p.lastname, p.birth_year, c.name as club_name
     FROM TournamentResults tr
     LEFT JOIN Players p ON p.id = tr.player_id
     LEFT JOIN Clubs c ON c.id = p.club_id
     WHERE tr.tournament_id = ?
     ORDER BY p.lastname, p.firstname, tr.team_name`
  )
    .bind(tournamentId)
    .all<ResultWithPlayerRow>();

  return json(env, results.map(toDto));
}

interface CreateResultInput {
  playerId?: number;
  firstname?: string;
  lastname?: string;
  clubName?: string;
  teamName?: string;
  points?: number;
  rank?: number | null;
  roundNo?: number | null;
}

/** Manually add one result row - for tournaments with no import file, or to add a
 * player the importer missed. */
export async function createResult(request: AuthedRequest, env: Env): Promise<Response> {
  const tournamentId = Number(request.params?.id);
  const tournament = await env.DB.prepare("SELECT id FROM Tournaments WHERE id = ?").bind(tournamentId).first();
  if (!tournament) return error(env, "Tournament not found", 404);

  const body = (await request.json().catch(() => null)) as CreateResultInput | null;
  if (!body) return error(env, "Invalid body", 400);
  if (!body.playerId && !body.lastname && !body.teamName) {
    return error(env, "playerId, lastname, or teamName is required", 400);
  }

  let playerId: number | null = body.playerId ?? null;
  if (!playerId && body.lastname) {
    const club = await findOrCreateClub(env, body.clubName);
    const player = await findOrCreatePlayer(env, body.firstname, body.lastname, { clubId: club?.id ?? null });
    playerId = player?.id ?? null;
  }

  const result = await env.DB.prepare(
    `INSERT INTO TournamentResults (tournament_id, player_id, team_name, points, rank, round_no)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(tournamentId, playerId, body.teamName ?? null, body.points ?? 0, body.rank ?? null, body.roundNo ?? null)
    .run();

  await logAudit(env, request.user!.sub, "create_result", "TournamentResult", result.meta.last_row_id, body);

  const created = await env.DB.prepare(
    `SELECT tr.*, p.firstname, p.lastname, p.birth_year, c.name as club_name
     FROM TournamentResults tr
     LEFT JOIN Players p ON p.id = tr.player_id
     LEFT JOIN Clubs c ON c.id = p.club_id
     WHERE tr.id = ?`
  )
    .bind(result.meta.last_row_id)
    .first<ResultWithPlayerRow>();

  return json(env, toDto(created!), 201);
}

interface UpdateResultInput {
  points?: number;
  rank?: number | null;
}

/** Adjust points/rank on an existing row - the main "fix a bad import" tool. */
export async function updateResult(request: AuthedRequest, env: Env): Promise<Response> {
  const resultId = Number(request.params?.resultId);
  const existing = await env.DB.prepare("SELECT * FROM TournamentResults WHERE id = ?").bind(resultId).first<TournamentResultRow>();
  if (!existing) return error(env, "Result not found", 404);

  const body = (await request.json().catch(() => null)) as UpdateResultInput | null;
  if (!body) return error(env, "Invalid body", 400);

  await env.DB.prepare("UPDATE TournamentResults SET points = ?, rank = ? WHERE id = ?")
    .bind(body.points ?? existing.points, body.rank === undefined ? existing.rank : body.rank, resultId)
    .run();

  await logAudit(env, request.user!.sub, "update_result", "TournamentResult", resultId, body);

  const updated = await env.DB.prepare(
    `SELECT tr.*, p.firstname, p.lastname, p.birth_year, c.name as club_name
     FROM TournamentResults tr
     LEFT JOIN Players p ON p.id = tr.player_id
     LEFT JOIN Clubs c ON c.id = p.club_id
     WHERE tr.id = ?`
  )
    .bind(resultId)
    .first<ResultWithPlayerRow>();

  return json(env, toDto(updated!));
}

export async function deleteResult(request: AuthedRequest, env: Env): Promise<Response> {
  const resultId = Number(request.params?.resultId);
  const existing = await env.DB.prepare("SELECT id FROM TournamentResults WHERE id = ?").bind(resultId).first();
  if (!existing) return error(env, "Result not found", 404);

  await env.DB.prepare("DELETE FROM TournamentResults WHERE id = ?").bind(resultId).run();
  await logAudit(env, request.user!.sub, "delete_result", "TournamentResult", resultId);
  return json(env, { success: true });
}
