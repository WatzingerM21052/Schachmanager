import type { PlayerRow } from "../db/types";
import type { StandingRow, StandingsContext } from "./types";

/** Shared "sum of points across in-scope tournaments, ranked with tied places" computation,
 *  used by formats whose standings are a plain points total (Swiss, RoundRobin). */
export function sumPointsStandings(ctx: StandingsContext): StandingRow[] {
  const tournamentIds = new Set(ctx.tournaments.map((t) => t.id));
  const playersById = new Map<number, PlayerRow>(ctx.players.map((p) => [p.id, p]));

  const byPlayer = new Map<number, { points: number; tournamentId: number; rank: number | null }[]>();
  for (const r of ctx.results) {
    if (r.player_id === null || !tournamentIds.has(r.tournament_id)) continue;
    const list = byPlayer.get(r.player_id) ?? [];
    list.push({ points: r.points, tournamentId: r.tournament_id, rank: r.rank });
    byPlayer.set(r.player_id, list);
  }

  const rows: StandingRow[] = [];
  for (const [playerId, entries] of byPlayer) {
    const player = playersById.get(playerId);
    if (!player) continue;
    const perTournament: StandingRow["perTournament"] = {};
    for (const e of entries) {
      perTournament[e.tournamentId] = { points: (perTournament[e.tournamentId]?.points ?? 0) + e.points, rank: e.rank };
    }
    const points = entries.reduce((sum, e) => sum + e.points, 0);
    rows.push({ rank: 0, playerId, displayName: `${player.lastname} ${player.firstname}`, points, tournamentsPlayed: entries.length, perTournament });
  }

  rows.sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
  let currentRank = 1;
  rows.forEach((row, i) => {
    if (i > 0 && rows[i].points < rows[i - 1].points) currentRank = i + 1;
    row.rank = currentRank;
  });
  return rows;
}
