import { describe, expect, it } from "vitest";
import { schuelerLiga, seasonLabelForDate } from "../src/formats/schuelerLiga";
import type { PlayerRow, TournamentResultRow, TournamentRow } from "../src/db/types";

function tournament(id: number, date: string): TournamentRow {
  return { id, name: `T${id}`, date, format: "SchuelerLiga", season: null, notes: null };
}

function player(id: number, birthYear: number): PlayerRow {
  return { id, firstname: "F", lastname: `Player${id}`, elo: null, country: null, birth_year: birthYear, club_id: null };
}

function result(tournamentId: number, playerId: number, points: number): TournamentResultRow {
  return { id: 0, tournament_id: tournamentId, player_id: playerId, team_name: null, points, rank: null, board_no: null, opponent_player_id: null, round_no: null, result_code: null };
}

describe("seasonLabelForDate", () => {
  it("assigns September onward to the upcoming season", () => {
    expect(seasonLabelForDate("2026-09-15")).toBe("2026/2027");
    expect(seasonLabelForDate("2027-03-01")).toBe("2026/2027");
    expect(seasonLabelForDate("2027-08-31")).toBe("2026/2027");
  });
});

describe("schuelerLiga.computeStandings", () => {
  it("uses the raw point total when bestOf4 is off", () => {
    const tournaments = [1, 2, 3, 4, 5].map((n) => tournament(n, "2026-10-01"));
    const results = [10, 8, 6, 4, 2].map((pts, i) => result(i + 1, 1, pts));
    const standings = schuelerLiga.computeStandings({
      tournaments,
      results,
      players: [player(1, 2015)],
      clubs: [],
      options: { bestOf4: false },
    });
    expect(standings[0].points).toBe(30);
  });

  it("keeps only the best 4 rounds when bestOf4 is on and more than 4 were played", () => {
    const tournaments = [1, 2, 3, 4, 5].map((n) => tournament(n, "2026-10-01"));
    const results = [10, 8, 6, 4, 2].map((pts, i) => result(i + 1, 1, pts));
    const standings = schuelerLiga.computeStandings({
      tournaments,
      results,
      players: [player(1, 2015)],
      clubs: [],
      options: { bestOf4: true },
    });
    // Drops the worst round (2 points): 10+8+6+4 = 28
    expect(standings[0].points).toBe(28);
  });

  it("ranks ties within an age group with carry-forward placement", () => {
    const tournaments = [tournament(1, "2026-10-01")];
    const results = [result(1, 1, 5), result(1, 2, 5), result(1, 3, 3)];
    const standings = schuelerLiga.computeStandings({
      tournaments,
      results,
      players: [player(1, 2015), player(2, 2015), player(3, 2015)],
      clubs: [],
      options: {},
    });
    const byPlayer = Object.fromEntries(standings.map((s) => [s.playerId, s.rank]));
    expect(byPlayer[1]).toBe(1);
    expect(byPlayer[2]).toBe(1);
    expect(byPlayer[3]).toBe(3);
  });
});
