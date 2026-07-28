import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../db/audit";
import type { TournamentRow } from "../db/types";
import { getFormat } from "../formats";
import type { ParsedResultRow } from "../formats/types";
import { parseCsvLines } from "../formats/csvUtils";
import { xlsxToRows } from "../formats/xlsxUtils";
import { findOrCreateClub, findOrCreatePlayer, splitPersonName } from "../db/playerLookup";

/** .xlsx files are ZIP archives, which always start with the "PK" magic bytes - checking
 * this (rather than trusting only the filename/content-type) means a mislabeled upload
 * still gets parsed correctly. */
function looksLikeXlsx(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

/**
 * POST /api/tournaments/{id}/import - CSV or .xlsx upload (multipart or raw body).
 * Dispatches parsing to the tournament's format module, resolves player/club names to IDs
 * (creating them if new), and inserts/updates TournamentResults rows. Reports back how
 * many players/clubs were newly created vs matched to existing ones, and which rows (if
 * any) couldn't be resolved to a name at all, so an organizer can immediately sanity-check
 * an import instead of only finding out something's off once they look at the standings.
 */
export async function importCsv(request: AuthedRequest, env: Env): Promise<Response> {
  const tournamentId = Number(request.params?.id);
  const tournament = await env.DB.prepare("SELECT * FROM Tournaments WHERE id = ?").bind(tournamentId).first<TournamentRow>();
  if (!tournament) return error(env, "Tournament not found", 404);

  let fileBuffer: ArrayBuffer;
  let fileName = "";
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file") as File | string | null;
    if (!file || typeof file === "string") return error(env, "Missing 'file' field in form data", 400);
    fileBuffer = await file.arrayBuffer();
    fileName = file.name ?? "";
  } else {
    fileBuffer = await request.arrayBuffer();
  }
  if (fileBuffer.byteLength === 0) return error(env, "Empty file content", 400);

  const isXlsx = /\.xlsx?$/i.test(fileName) || looksLikeXlsx(new Uint8Array(fileBuffer.slice(0, 2)));
  const rows: string[][] = isXlsx ? xlsxToRows(fileBuffer) : parseCsvLines(new TextDecoder("utf-8").decode(fileBuffer));

  const format = getFormat(tournament.format);
  const parsedRows: ParsedResultRow[] = format.parseRows(rows);
  if (parsedRows.length === 0) return error(env, "No recognizable rows found in the uploaded file (check header names)", 400);

  let inserted = 0;
  let newPlayers = 0;
  let newClubs = 0;
  let skipped = 0;
  const skippedRows: string[] = [];

  for (const row of parsedRows) {
    let playerId: number | null = null;
    if (row.lastname) {
      const club = await findOrCreateClub(env, row.clubName);
      if (club?.created) newClubs++;
      const player = await findOrCreatePlayer(env, row.firstname, row.lastname, { elo: row.elo, country: row.country, clubId: club?.id ?? null });
      if (player?.created) newPlayers++;
      playerId = player?.id ?? null;
    } else if (!row.teamName) {
      // Neither an individual name nor a team name - this row couldn't be resolved at all.
      skipped++;
      skippedRows.push(JSON.stringify(row));
      continue;
    }

    let opponentId: number | null = null;
    if (row.opponentName) {
      const { firstname, lastname } = splitPersonName(row.opponentName);
      const opponent = await findOrCreatePlayer(env, firstname, lastname);
      opponentId = opponent?.id ?? null;
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

  await logAudit(env, request.user!.sub, "import_csv", "Tournament", tournamentId, { rows: inserted, newPlayers, newClubs, skipped, format: tournament.format });
  return json(env, { success: true, rowsImported: inserted, newPlayers, newClubs, skipped, skippedRows: skippedRows.slice(0, 10) });
}
