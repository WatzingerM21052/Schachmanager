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

interface MergePlayersInput {
  survivorId?: number;
  victimIds?: number[];
  firstname?: string;
  lastname?: string;
}

/**
 * POST /api/players/merge - ported from DatenDetektiv.razor's "merge duplicate players"
 * feature. Re-parents every TournamentResults row from the victim players onto the
 * survivor (dropping a victim's row instead if the survivor already has a result for
 * that exact tournament+round), optionally renames the survivor, adopts a club if the
 * survivor didn't have one, then deletes the victim player rows.
 */
export async function mergePlayers(request: AuthedRequest, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as MergePlayersInput | null;
  const survivorId = body?.survivorId;
  const victimIds = body?.victimIds;
  if (!survivorId || !Array.isArray(victimIds) || victimIds.length === 0) {
    return error(env, "survivorId and a non-empty victimIds array are required", 400);
  }
  if (victimIds.includes(survivorId)) return error(env, "survivorId cannot also be a victim", 400);

  const survivor = await env.DB.prepare("SELECT * FROM Players WHERE id = ?").bind(survivorId).first<PlayerRow>();
  if (!survivor) return error(env, "Survivor player not found", 404);

  let mergedResults = 0;
  let survivorClubId = survivor.club_id;

  for (const victimId of victimIds) {
    const { results: victimResults } = await env.DB.prepare("SELECT * FROM TournamentResults WHERE player_id = ?")
      .bind(victimId)
      .all<{ id: number; tournament_id: number; round_no: number | null }>();

    for (const r of victimResults) {
      const conflict = await env.DB.prepare(
        "SELECT id FROM TournamentResults WHERE tournament_id = ? AND player_id = ? AND round_no IS ?"
      )
        .bind(r.tournament_id, survivorId, r.round_no)
        .first();

      if (conflict) {
        await env.DB.prepare("DELETE FROM TournamentResults WHERE id = ?").bind(r.id).run();
      } else {
        await env.DB.prepare("UPDATE TournamentResults SET player_id = ? WHERE id = ?").bind(survivorId, r.id).run();
        mergedResults++;
      }
    }

    if (!survivorClubId) {
      const victim = await env.DB.prepare("SELECT club_id FROM Players WHERE id = ?").bind(victimId).first<{ club_id: number | null }>();
      if (victim?.club_id) survivorClubId = victim.club_id;
    }

    await env.DB.prepare("DELETE FROM Players WHERE id = ?").bind(victimId).run();
  }

  await env.DB.prepare("UPDATE Players SET firstname = COALESCE(?, firstname), lastname = COALESCE(?, lastname), club_id = ? WHERE id = ?")
    .bind(body?.firstname ?? null, body?.lastname ?? null, survivorClubId, survivorId)
    .run();

  await logAudit(env, request.user!.sub, "merge_players", "Player", survivorId, { victimIds, mergedResults });
  const updated = await env.DB.prepare("SELECT * FROM Players WHERE id = ?").bind(survivorId).first<PlayerRow>();
  return json(env, { player: playerToDto(updated!), mergedResults, deletedPlayers: victimIds.length });
}
