import type { Env } from "../env";
import { json } from "../http";
import type { AuthedRequest } from "../auth/middleware";

interface PlayerStatRow {
  firstname: string;
  lastname: string;
  club_name: string;
  total_points: number;
  total_games: number;
}

interface ClubStatRow {
  name: string;
  player_count: number;
}

/**
 * GET /api/hall-of-fame - public, all-time (not season-scoped) aggregate stats across
 * every tournament/format. Ported from SchuelerligaManager's HallOfFame.razor, which
 * computed this by loading every Player+PlayerTournament into memory client-side;
 * here it's a handful of aggregate SQL queries instead.
 */
export async function getHallOfFame(_request: AuthedRequest, env: Env): Promise<Response> {
  const [totalPlayersRes, totalTournamentsRes, totalClubsRes, topByPoints, topByGames, topClubs] = await Promise.all([
    env.DB.prepare(
      "SELECT COUNT(DISTINCT p.id) as count FROM Players p JOIN TournamentResults tr ON tr.player_id = p.id"
    ).first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) as count FROM Tournaments").first<{ count: number }>(),
    env.DB.prepare(
      "SELECT COUNT(DISTINCT c.id) as count FROM Clubs c JOIN Players p ON p.club_id = c.id JOIN TournamentResults tr ON tr.player_id = p.id"
    ).first<{ count: number }>(),
    env.DB.prepare(
      `SELECT p.firstname, p.lastname, COALESCE(c.name, 'Vereinslos') as club_name,
              SUM(tr.points) as total_points, COUNT(tr.id) as total_games
       FROM Players p
       JOIN TournamentResults tr ON tr.player_id = p.id
       LEFT JOIN Clubs c ON c.id = p.club_id
       GROUP BY p.id
       ORDER BY total_points DESC, p.lastname ASC
       LIMIT 10`
    ).all<PlayerStatRow>(),
    env.DB.prepare(
      `SELECT p.firstname, p.lastname, COALESCE(c.name, 'Vereinslos') as club_name,
              SUM(tr.points) as total_points, COUNT(tr.id) as total_games
       FROM Players p
       JOIN TournamentResults tr ON tr.player_id = p.id
       LEFT JOIN Clubs c ON c.id = p.club_id
       GROUP BY p.id
       ORDER BY total_games DESC, p.lastname ASC
       LIMIT 10`
    ).all<PlayerStatRow>(),
    env.DB.prepare(
      `SELECT c.name, COUNT(DISTINCT p.id) as player_count
       FROM Clubs c
       JOIN Players p ON p.club_id = c.id
       JOIN TournamentResults tr ON tr.player_id = p.id
       GROUP BY c.id
       ORDER BY player_count DESC, c.name ASC
       LIMIT 10`
    ).all<ClubStatRow>(),
  ]);

  return json(env, {
    totalPlayers: totalPlayersRes?.count ?? 0,
    totalTournaments: totalTournamentsRes?.count ?? 0,
    totalClubs: totalClubsRes?.count ?? 0,
    topByPoints: topByPoints.results.map((r) => ({
      firstname: r.firstname,
      lastname: r.lastname,
      clubName: r.club_name,
      totalPoints: r.total_points,
    })),
    topByGames: topByGames.results.map((r) => ({
      firstname: r.firstname,
      lastname: r.lastname,
      clubName: r.club_name,
      totalGames: r.total_games,
    })),
    topClubs: topClubs.results.map((r) => ({ name: r.name, playerCount: r.player_count })),
  });
}
