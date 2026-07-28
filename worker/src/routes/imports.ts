import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../db/audit";
import type { TournamentRow, ClubRow, PlayerRow } from "../db/types";
import { getFormat } from "../formats";
import type { ParsedResultRow } from "../formats/types";

async function findOrCreateClub(env: Env, name: string | null | undefined): Promise<number | null> {
  if (!name || !name.trim()) return null;
  const existing = await env.DB.prepare("SELECT id FROM Clubs WHERE lower(name) = lower(?)").bind(name.trim()).first<ClubRow>();
  if (existing) return existing.id;
  const result = await env.DB.prepare("INSERT INTO Clubs (name) VALUES (?)").bind(name.trim()).run();
  return result.meta.last_row_id;
}

async function findOrCreatePlayer(
  env: Env,
  firstname: string | undefined,
  lastname: string | undefined,
  extra?: { elo?: number | null; country?: string | null; clubId?: number | null }
): Promise<number | null> {
  if (!lastname) return null;
  const existing = await env.DB.prepare(
    "SELECT id FROM Players WHERE lower(firstname) = lower(?) AND lower(lastname) = lower(?)"
  )
    .bind(firstname ?? "", lastname)
    .first<PlayerRow>();
  if (existing) return existing.id;

  const result = await env.DB.prepare(
    "INSERT INTO Players (firstname, lastname, elo, country, club_id) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(firstname ?? "", lastname, extra?.elo ?? null, extra?.country ?? null, extra?.clubId ?? null)
    .run();
  return result.meta.last_row_id;
}

/**
 * POST /api/tournaments/{id}/import - CSV upload (multipart or raw text body).
 * Dispatches parsing to the tournament's format module, resolves player/club names to IDs
 * (creating them if new), and inserts/updates TournamentResults rows.
 */
export async function importCsv(request: AuthedRequest, env: Env): Promise<Response> {
  const tournamentId = Number(request.params?.id);
  const tournament = await env.DB.prepare("SELECT * FROM Tournaments WHERE id = ?").bind(tournamentId).first<TournamentRow>();
  if (!tournament) return error(env, "Tournament not found", 404);

  let fileText: string;
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file") as File | string | null;
    if (!file || typeof file === "string") return error(env, "Missing 'file' field in form data", 400);
    fileText = await file.text();
  } else {
    fileText = await request.text();
  }
  if (!fileText.trim()) return error(env, "Empty CSV content", 400);

  const format = getFormat(tournament.format);
  const parsedRows: ParsedResultRow[] = format.parseCsv(fileText);
  if (parsedRows.length === 0) return error(env, "No recognizable rows found in CSV (check header names)", 400);

  let inserted = 0;
  for (const row of parsedRows) {
    let playerId: number | null = null;
    if (row.lastname) {
      const clubId = await findOrCreateClub(env, row.clubName);
      playerId = await findOrCreatePlayer(env, row.firstname, row.lastname, { elo: row.elo, country: row.country, clubId });
    }

    let opponentId: number | null = null;
    if (row.opponentName) {
      const { firstname, lastname } = splitOpponentName(row.opponentName);
      opponentId = await findOrCreatePlayer(env, firstname, lastname);
    }

    await env.DB.prepare(
      `INSERT INTO TournamentResults
         (tournament_id, player_id, team_name, points, rank, board_no, opponent_player_id, round_no, result_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tournament_id, player_id, round_no) DO UPDATE SET
         points = excluded.points, rank = excluded.rank, board_no = excluded.board_no,
         opponent_player_id = excluded.opponent_player_id, result_code = excluded.result_code`
    )
      .bind(
        tournamentId,
        playerId,
        row.teamName ?? null,
        row.points,
        row.rank ?? null,
        row.boardNo ?? null,
        opponentId,
        row.roundNo ?? null,
        row.resultCode ?? null
      )
      .run();
    inserted++;
  }

  await logAudit(env, request.user!.sub, "import_csv", "Tournament", tournamentId, { rows: inserted, format: tournament.format });
  return json(env, { success: true, rowsImported: inserted });
}

function splitOpponentName(name: string): { firstname: string; lastname: string } {
  if (name.includes(",")) {
    const [last, first] = name.split(",");
    return { lastname: last.trim(), firstname: (first ?? "").trim() };
  }
  const parts = name.trim().split(/\s+/);
  return { lastname: parts[0] ?? "", firstname: parts.slice(1).join(" ") };
}
