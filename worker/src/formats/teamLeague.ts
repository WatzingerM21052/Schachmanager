// Generic team league format: like SchuelerLiga's team-scoring idea, but WITHOUT the
// Schuelerliga-specific rules (age classes, best-of-4, September season cutoff). Kept as
// its own module so those rules can't silently leak into a plain team competition.
import type { TournamentFormat, ParsedResultRow, StandingRow, StandingsContext } from "./types";
import { findRosterColumns, parseCsvLines, toNumberOrNull } from "./csvUtils";

export const teamLeague: TournamentFormat = {
  parseCsv(fileText: string): ParsedResultRow[] {
    const rows = parseCsvLines(fileText);
    const found = findRosterColumns(rows);
    if (!found) return [];
    const { headerRowIndex, columns } = found;
    // For team leagues, the "name" column holds the team name rather than a person's name.

    const out: ParsedResultRow[] = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      const teamName = row[columns.nameCol];
      if (!teamName || teamName.toLowerCase().includes("name")) continue;

      const rank = columns.rankCol !== -1 ? toNumberOrNull(row[columns.rankCol]) : out.length + 1;
      const points = columns.pointsCol !== -1 ? (toNumberOrNull(row[columns.pointsCol]) ?? 0) : 0;

      out.push({ teamName, rank, points });
    }
    return out;
  },

  computeStandings(ctx: StandingsContext): StandingRow[] {
    const tournamentIds = new Set(ctx.tournaments.map((t) => t.id));
    const byTeam = new Map<string, { points: number; rank: number | null; tournamentId: number }[]>();

    for (const r of ctx.results) {
      if (!r.team_name || !tournamentIds.has(r.tournament_id)) continue;
      const list = byTeam.get(r.team_name) ?? [];
      list.push({ points: r.points, rank: r.rank, tournamentId: r.tournament_id });
      byTeam.set(r.team_name, list);
    }

    const rows: StandingRow[] = [];
    for (const [teamName, entries] of byTeam) {
      const perTournament: StandingRow["perTournament"] = {};
      for (const e of entries) perTournament[e.tournamentId] = { points: e.points, rank: e.rank };
      rows.push({
        rank: 0,
        teamName,
        displayName: teamName,
        points: entries.reduce((sum, e) => sum + e.points, 0),
        tournamentsPlayed: entries.length,
        perTournament,
      });
    }

    rows.sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
    let currentRank = 1;
    rows.forEach((row, i) => {
      if (i > 0 && rows[i].points < rows[i - 1].points) currentRank = i + 1;
      row.rank = currentRank;
    });
    return rows;
  },
};
