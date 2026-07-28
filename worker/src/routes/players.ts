import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../db/audit";
import type { PlayerRow } from "../db/types";
import { playerToDto } from "../db/toDto";

interface PlayerInput {
  firstname?: string;
  lastname?: string;
  elo?: number | null;
  country?: string | null;
  birthYear?: number | null;
  clubId?: number | null;
}

export async function listPlayers(_request: AuthedRequest, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM Players ORDER BY lastname, firstname").all<PlayerRow>();
  return json(env, results.map(playerToDto));
}

export async function createPlayer(request: AuthedRequest, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as PlayerInput | null;
  if (!body?.firstname || !body?.lastname) return error(env, "firstname and lastname are required", 400);

  const result = await env.DB.prepare(
    "INSERT INTO Players (firstname, lastname, elo, country, birth_year, club_id) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(body.firstname, body.lastname, body.elo ?? null, body.country ?? null, body.birthYear ?? null, body.clubId ?? null)
    .run();

  const id = result.meta.last_row_id;
  await logAudit(env, request.user!.sub, "create_player", "Player", id, body);
  const created = await env.DB.prepare("SELECT * FROM Players WHERE id = ?").bind(id).first<PlayerRow>();
  return json(env, playerToDto(created!), 201);
}

export async function updatePlayer(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const body = (await request.json().catch(() => null)) as PlayerInput | null;
  if (!body) return error(env, "Invalid body", 400);

  const existing = await env.DB.prepare("SELECT * FROM Players WHERE id = ?").bind(id).first<PlayerRow>();
  if (!existing) return error(env, "Player not found", 404);

  await env.DB.prepare(
    "UPDATE Players SET firstname = ?, lastname = ?, elo = ?, country = ?, birth_year = ?, club_id = ? WHERE id = ?"
  )
    .bind(
      body.firstname ?? existing.firstname,
      body.lastname ?? existing.lastname,
      body.elo ?? existing.elo,
      body.country ?? existing.country,
      body.birthYear ?? existing.birth_year,
      body.clubId ?? existing.club_id,
      id
    )
    .run();

  await logAudit(env, request.user!.sub, "update_player", "Player", id, body);
  const updated = await env.DB.prepare("SELECT * FROM Players WHERE id = ?").bind(id).first<PlayerRow>();
  return json(env, playerToDto(updated!));
}

export async function deletePlayer(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const existing = await env.DB.prepare("SELECT id FROM Players WHERE id = ?").bind(id).first();
  if (!existing) return error(env, "Player not found", 404);

  await env.DB.prepare("DELETE FROM Players WHERE id = ?").bind(id).run();
  await logAudit(env, request.user!.sub, "delete_player", "Player", id);
  return json(env, { success: true });
}
