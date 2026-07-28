import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../db/audit";
import type { TournamentRow } from "../db/types";
import { tournamentToDto } from "../db/toDto";

const VALID_FORMATS = ["SchuelerLiga", "Swiss", "RoundRobin", "TeamLeague", "Knockout"];

export async function listTournaments(_request: AuthedRequest, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM Tournaments ORDER BY date DESC").all<TournamentRow>();
  return json(env, results.map(tournamentToDto));
}

export async function getTournament(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const tournament = await env.DB.prepare("SELECT * FROM Tournaments WHERE id = ?").bind(id).first<TournamentRow>();
  if (!tournament) return error(env, "Tournament not found", 404);
  return json(env, tournamentToDto(tournament));
}

export async function createTournament(request: AuthedRequest, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Partial<TournamentRow> | null;
  if (!body?.name || !body?.date || !body?.format) return error(env, "name, date and format are required", 400);
  if (!VALID_FORMATS.includes(body.format)) return error(env, `format must be one of: ${VALID_FORMATS.join(", ")}`, 400);

  const result = await env.DB.prepare("INSERT INTO Tournaments (name, date, format, season, notes) VALUES (?, ?, ?, ?, ?)")
    .bind(body.name, body.date, body.format, body.season ?? null, body.notes ?? null)
    .run();

  const id = result.meta.last_row_id;
  await logAudit(env, request.user!.sub, "create_tournament", "Tournament", id, body);
  const created = await env.DB.prepare("SELECT * FROM Tournaments WHERE id = ?").bind(id).first<TournamentRow>();
  return json(env, tournamentToDto(created!), 201);
}

export async function updateTournament(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const body = (await request.json().catch(() => null)) as Partial<TournamentRow> | null;
  if (!body) return error(env, "Invalid body", 400);
  if (body.format && !VALID_FORMATS.includes(body.format)) return error(env, `format must be one of: ${VALID_FORMATS.join(", ")}`, 400);

  const existing = await env.DB.prepare("SELECT * FROM Tournaments WHERE id = ?").bind(id).first<TournamentRow>();
  if (!existing) return error(env, "Tournament not found", 404);

  await env.DB.prepare("UPDATE Tournaments SET name = ?, date = ?, format = ?, season = ?, notes = ? WHERE id = ?")
    .bind(
      body.name ?? existing.name,
      body.date ?? existing.date,
      body.format ?? existing.format,
      body.season ?? existing.season,
      body.notes ?? existing.notes,
      id
    )
    .run();

  await logAudit(env, request.user!.sub, "update_tournament", "Tournament", id, body);
  const updated = await env.DB.prepare("SELECT * FROM Tournaments WHERE id = ?").bind(id).first<TournamentRow>();
  return json(env, tournamentToDto(updated!));
}

export async function deleteTournament(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const existing = await env.DB.prepare("SELECT id FROM Tournaments WHERE id = ?").bind(id).first();
  if (!existing) return error(env, "Tournament not found", 404);

  await env.DB.prepare("DELETE FROM Tournaments WHERE id = ?").bind(id).run();
  await logAudit(env, request.user!.sub, "delete_tournament", "Tournament", id);
  return json(env, { success: true });
}
