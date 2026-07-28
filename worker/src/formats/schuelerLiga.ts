// SchuelerLiga format: the original tournament model this whole system grew out of.
// Ported from SchuelerligaManager's Auswertung.razor code-behind, which held the REAL
// "best of 4 rounds" business logic (the separate SchuelerligaService.cs computed a
// simpler, different total and was not what the UI actually used).
import type { TournamentFormat, ParsedResultRow, StandingRow, StandingsContext } from "./types";
import { findRosterColumns, parseCsvLines, splitName, toNumberOrNull } from "./csvUtils";
import { ageGroupForBirthYear, currentSeasonYear } from "../ageGroup";
import type { PlayerRow } from "../db/types";

export function seasonLabelForDate(dateIso: string): string {
  const d = new Date(dateIso);
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function parseSeasonEndYear(season: string): number {
  const parts = season.split("/");
  return Number(parts[1] ?? parts[0]);
}

export const schuelerLiga: TournamentFormat = {
  parseCsv(fileText: string): ParsedResultRow[] {
    const rows = parseCsvLines(fileText);
    const found = findRosterColumns(rows);
    if (!found) return [];
    const { headerRowIndex, columns } = found;

    const out: ParsedResultRow[] = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[columns.nameCol];
      if (!name || name.toLowerCase().includes("name")) continue;

      const { firstname, lastname } = splitName(name);
      const elo = columns.eloCol !== -1 ? toNumberOrNull(row[columns.eloCol]) : null;
      const country = columns.countryCol !== -1 ? row[columns.countryCol] || null : null;
      const clubName = columns.clubCol !== -1 ? row[columns.clubCol] || null : null;
      const rank = columns.rankCol !== -1 ? toNumberOrNull(row[columns.rankCol]) : out.length + 1;
      const points = columns.pointsCol !== -1 ? (toNumberOrNull(row[columns.pointsCol]) ?? 0) : 0;

      out.push({ firstname, lastname, elo, country, clubName, rank, points });
    }
    return out;
  },

  computeStandings(ctx: StandingsContext): StandingRow[] {
    const bestOf4 = Boolean(ctx.options?.bestOf4);
    const ageFilter = ctx.options?.ageFilter as string | undefined;
    const clubFilter = ctx.options?.clubFilter as string | undefined;
    const season = ctx.options?.season as string | undefined;

    const tournamentsInScope = season
      ? ctx.tournaments.filter((t) => seasonLabelForDate(t.date) === season)
      : ctx.tournaments;
    const tournamentIds = new Set(tournamentsInScope.map((t) => t.id));
    const seasonYear = season ? parseSeasonEndYear(season) : currentSeasonYear();

    const playersById = new Map<number, PlayerRow>(ctx.players.map((p) => [p.id, p]));
    const clubsById = new Map(ctx.clubs.map((c) => [c.id, c.name]));

    const byPlayer = new Map<number, { points: number; rank: number | null; tournamentId: number }[]>();
    for (const r of ctx.results) {
      if (r.player_id === null || !tournamentIds.has(r.tournament_id)) continue;
      const list = byPlayer.get(r.player_id) ?? [];
      list.push({ points: r.points, rank: r.rank, tournamentId: r.tournament_id });
      byPlayer.set(r.player_id, list);
    }

    type Row = StandingRow & { rawPoints: number; lastname: string };
    let rows: Row[] = [];
    for (const [playerId, entries] of byPlayer) {
      const player = playersById.get(playerId);
      if (!player) continue;

      const ageGroup = player.birth_year ? ageGroupForBirthYear(player.birth_year, seasonYear) : "Ohne";
      const clubName = player.club_id ? clubsById.get(player.club_id) ?? "Vereinslos" : "Vereinslos";
      if (ageFilter && ageFilter !== "Alle" && ageGroup !== ageFilter) continue;
      if (clubFilter && clubFilter !== "Alle" && clubName !== clubFilter) continue;

      const rawPoints = entries.reduce((sum, e) => sum + e.points, 0);
      const effectivePoints =
        bestOf4 && entries.length > 4
          ? [...entries].sort((a, b) => b.points - a.points).slice(0, 4).reduce((sum, e) => sum + e.points, 0)
          : rawPoints;

      const perTournament: StandingRow["perTournament"] = {};
      for (const e of entries) perTournament[e.tournamentId] = { points: e.points, rank: e.rank };

      rows.push({
        rank: 0,
        playerId,
        displayName: `${player.lastname} ${player.firstname}`,
        clubName,
        ageGroup,
        points: effectivePoints,
        tournamentsPlayed: entries.length,
        perTournament,
        rawPoints,
        lastname: player.lastname,
      });
    }

    // Rank within each age group, ties share a rank (carry-forward), mirroring the original UI logic.
    const byAgeGroup = new Map<string, Row[]>();
    for (const row of rows) {
      const list = byAgeGroup.get(row.ageGroup!) ?? [];
      list.push(row);
      byAgeGroup.set(row.ageGroup!, list);
    }

    const finalRows: StandingRow[] = [];
    for (const [, group] of byAgeGroup) {
      group.sort((a, b) => b.points - a.points || b.tournamentsPlayed - a.tournamentsPlayed || a.lastname.localeCompare(b.lastname));
      let currentRank = 1;
      group.forEach((row, i) => {
        if (i > 0 && group[i].points < group[i - 1].points) currentRank = i + 1;
        row.rank = currentRank;
        finalRows.push(row);
      });
    }

    finalRows.sort((a, b) => (a.ageGroup ?? "").localeCompare(b.ageGroup ?? "") || a.rank - b.rank);
    return finalRows;
  },
};
