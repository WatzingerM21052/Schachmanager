import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../db/audit";
import type { ClubRow } from "../db/types";

export async function listClubs(_request: AuthedRequest, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM Clubs ORDER BY name").all<ClubRow>();
  return json(env, results);
}

export async function createClub(request: AuthedRequest, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  if (!body?.name) return error(env, "name is required", 400);

  const result = await env.DB.prepare("INSERT INTO Clubs (name) VALUES (?)").bind(body.name).run();
  const id = result.meta.last_row_id;
  await logAudit(env, request.user!.sub, "create_club", "Club", id, body);
  return json(env, { id, name: body.name }, 201);
}

export async function updateClub(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  if (!body?.name) return error(env, "name is required", 400);

  const existing = await env.DB.prepare("SELECT id FROM Clubs WHERE id = ?").bind(id).first();
  if (!existing) return error(env, "Club not found", 404);

  await env.DB.prepare("UPDATE Clubs SET name = ? WHERE id = ?").bind(body.name, id).run();
  await logAudit(env, request.user!.sub, "update_club", "Club", id, body);
  return json(env, { id, name: body.name });
}

export async function deleteClub(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const existing = await env.DB.prepare("SELECT id FROM Clubs WHERE id = ?").bind(id).first();
  if (!existing) return error(env, "Club not found", 404);

  await env.DB.prepare("DELETE FROM Clubs WHERE id = ?").bind(id).run();
  await logAudit(env, request.user!.sub, "delete_club", "Club", id);
  return json(env, { success: true });
}
