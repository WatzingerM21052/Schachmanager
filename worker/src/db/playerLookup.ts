import type { Env } from "../env";
import type { ClubRow, PlayerRow } from "./types";

export async function findOrCreateClub(env: Env, name: string | null | undefined): Promise<{ id: number; created: boolean } | null> {
  if (!name || !name.trim()) return null;
  const existing = await env.DB.prepare("SELECT id FROM Clubs WHERE lower(name) = lower(?)").bind(name.trim()).first<ClubRow>();
  if (existing) return { id: existing.id, created: false };
  const result = await env.DB.prepare("INSERT INTO Clubs (name) VALUES (?)").bind(name.trim()).run();
  return { id: result.meta.last_row_id, created: true };
}

export async function findOrCreatePlayer(
  env: Env,
  firstname: string | undefined,
  lastname: string | undefined,
  extra?: { elo?: number | null; country?: string | null; clubId?: number | null }
): Promise<{ id: number; created: boolean } | null> {
  if (!lastname) return null;
  const existing = await env.DB.prepare(
    "SELECT id FROM Players WHERE lower(firstname) = lower(?) AND lower(lastname) = lower(?)"
  )
    .bind(firstname ?? "", lastname)
    .first<PlayerRow>();
  if (existing) return { id: existing.id, created: false };

  const result = await env.DB.prepare(
    "INSERT INTO Players (firstname, lastname, elo, country, club_id) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(firstname ?? "", lastname, extra?.elo ?? null, extra?.country ?? null, extra?.clubId ?? null)
    .run();
  return { id: result.meta.last_row_id, created: true };
}

export function splitPersonName(name: string): { firstname: string; lastname: string } {
  if (name.includes(",")) {
    const [last, first] = name.split(",");
    return { lastname: last.trim(), firstname: (first ?? "").trim() };
  }
  const parts = name.trim().split(/\s+/);
  return { lastname: parts[0] ?? "", firstname: parts.slice(1).join(" ") };
}
