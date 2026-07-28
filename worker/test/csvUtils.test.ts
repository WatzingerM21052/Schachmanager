import { describe, expect, it } from "vitest";
import { schuelerLiga } from "../src/formats/schuelerLiga";

describe("schuelerLiga.parseCsv - delimiter handling", () => {
  it("does not corrupt columns when a semicolon-delimited file has commas inside 'Lastname, Firstname' names", () => {
    // Regression test: a naive parser that treats both ',' and ';' as delimiters
    // splits "Mustermann, Max" into two cells, shifting every later column by one
    // (Elo silently becomes the club, Rang silently becomes the points).
    const csv = [
      "Name;Elo;Verein;Land;Rang;Punkte",
      "Mustermann, Max;1200;SV Hofkirchen;AUT;1;10",
      "Musterfrau, Lisa;1100;SV Hofkirchen;AUT;2;8",
    ].join("\n");

    const rows = schuelerLiga.parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ firstname: "Max", lastname: "Mustermann", elo: 1200, clubName: "SV Hofkirchen", country: "AUT", rank: 1, points: 10 });
    expect(rows[1]).toMatchObject({ firstname: "Lisa", lastname: "Musterfrau", elo: 1100, clubName: "SV Hofkirchen", country: "AUT", rank: 2, points: 8 });
  });

  it("still handles comma-delimited files correctly", () => {
    const csv = ["Name,Elo,Verein,Land,Rang,Punkte", "Beispiel Tom,1000,Schachclub Linz,AUT,3,6"].join("\n");
    const rows = schuelerLiga.parseCsv(csv);
    expect(rows[0]).toMatchObject({ firstname: "Tom", lastname: "Beispiel", elo: 1000, clubName: "Schachclub Linz", points: 6 });
  });
});
