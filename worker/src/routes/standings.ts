import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import type { ClubRow, PlayerRow, TournamentResultRow, TournamentRow } from "../db/types";
import { getFormat } from "../formats";

async function loadContextTables(env: Env) {
  const [tournaments, results, players, clubs] = await Promise.all([
    env.DB.prepare("SELECT * FROM Tournaments").all<TournamentRow>(),
    env.DB.prepare("SELECT * FROM TournamentResults").all<TournamentResultRow>(),
    env.DB.prepare("SELECT * FROM Players").all<PlayerRow>(),
    env.DB.prepare("SELECT * FROM Clubs").all<ClubRow>(),
  ]);
  return { tournaments: tournaments.results, results: results.results, players: players.results, clubs: clubs.results };
}

/** GET /api/tournaments/{id}/standings - standings for ONE tournament, using its own format module. */
export async function getTournamentStandings(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const tournament = await env.DB.prepare("SELECT * FROM Tournaments WHERE id = ?").bind(id).first<TournamentRow>();
  if (!tournament) return error(env, "Tournament not found", 404);

  const { players, clubs, results } = await loadContextTables(env);
  const format = getFormat(tournament.format);
  const standings = format.computeStandings({
    tournaments: [tournament],
    results: results.filter((r) => r.tournament_id === id),
    players,
    clubs,
  });
  return json(env, standings);
}

/**
 * GET /api/leaderboard?format=SchuelerLiga&season=2026/2027&bestOf4=true&ageFilter=U12&clubFilter=...
 * Public season-wide leaderboard used by the homepage/HallOfFame-style views.
 */
export async function getLeaderboard(request: AuthedRequest, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const formatName = (url.searchParams.get("format") ?? "SchuelerLiga") as TournamentRow["format"];
  const season = url.searchParams.get("season") ?? undefined;
  const bestOf4 = url.searchParams.get("bestOf4") === "true";
  const ageFilter = url.searchParams.get("ageFilter") ?? undefined;
  const clubFilter = url.searchParams.get("clubFilter") ?? undefined;

  const { tournaments, players, clubs, results } = await loadContextTables(env);
  const format = getFormat(formatName);
  const tournamentsForFormat = tournaments.filter((t) => t.format === formatName);

  const standings = format.computeStandings({
    tournaments: tournamentsForFormat,
    results: results.filter((r) => tournamentsForFormat.some((t) => t.id === r.tournament_id)),
    players,
    clubs,
    options: { bestOf4, ageFilter, clubFilter, season },
  });
  return json(env, standings);
}
