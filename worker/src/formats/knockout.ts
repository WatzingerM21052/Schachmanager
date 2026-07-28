// Knockout/elimination bracket format. No pairing generation - bracket results (who played
// whom, which round, win/loss) are supplied externally via CSV, this module only derives
// placement from how far each player got.
//
// Convention: `result_code` on a TournamentResults row is recorded from THAT player's own
// perspective: "W" (win), "L" (loss), or "D" (draw, e.g. an unresolved/bye round). A player's
// furthest-reached round is their highest round_no; if their result in that round was a win,
// they advanced past it (or are the champion, if it was the final round in the CSV).
import type { TournamentFormat, StandingRow, StandingsContext } from "./types";
import { parsePairingRows } from "./pairingCsvUtils";

function isWin(resultCode: string | null): boolean {
  if (!resultCode) return false;
  const v = resultCode.trim().toUpperCase();
  return v === "W" || v === "1-0" || v === "1";
}

export const knockout: TournamentFormat = {
  parseRows: parsePairingRows,

  computeStandings(ctx: StandingsContext): StandingRow[] {
    const tournamentIds = new Set(ctx.tournaments.map((t) => t.id));
    const playersById = new Map(ctx.players.map((p) => [p.id, p]));

    const byPlayer = new Map<number, { roundNo: number; resultCode: string | null; tournamentId: number; points: number }[]>();
    for (const r of ctx.results) {
      if (r.player_id === null || !tournamentIds.has(r.tournament_id)) continue;
      const list = byPlayer.get(r.player_id) ?? [];
      list.push({ roundNo: r.round_no ?? 0, resultCode: r.result_code, tournamentId: r.tournament_id, points: r.points });
      byPlayer.set(r.player_id, list);
    }

    const rows: (StandingRow & { placementScore: number })[] = [];
    for (const [playerId, entries] of byPlayer) {
      const player = playersById.get(playerId);
      if (!player) continue;

      entries.sort((a, b) => a.roundNo - b.roundNo);
      const lastEntry = entries[entries.length - 1];
      const reachedRound = lastEntry.roundNo;
      const wonLastRound = isWin(lastEntry.resultCode);
      const placementScore = reachedRound * 2 + (wonLastRound ? 1 : 0);

      const perTournament: StandingRow["perTournament"] = {};
      for (const e of entries) perTournament[e.tournamentId] = { points: e.points, rank: null };

      rows.push({
        rank: 0,
        playerId,
        displayName: `${player.lastname} ${player.firstname}`,
        points: entries.reduce((sum, e) => sum + e.points, 0),
        tournamentsPlayed: entries.length,
        perTournament,
        placementScore,
      });
    }

    rows.sort((a, b) => b.placementScore - a.placementScore || a.displayName.localeCompare(b.displayName));
    let currentRank = 1;
    rows.forEach((row, i) => {
      if (i > 0 && rows[i].placementScore < rows[i - 1].placementScore) currentRank = i + 1;
      row.rank = currentRank;
    });
    return rows.map(({ placementScore, ...rest }) => rest);
  },
};
