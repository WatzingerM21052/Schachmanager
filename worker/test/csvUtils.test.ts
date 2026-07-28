import { describe, expect, it } from "vitest";
import { schuelerLiga } from "../src/formats/schuelerLiga";
import { parseCsvLines } from "../src/formats/csvUtils";

describe("schuelerLiga.parseRows - delimiter handling", () => {
  it("does not corrupt columns when a semicolon-delimited file has commas inside 'Lastname, Firstname' names", () => {
    // Regression test: a naive parser that treats both ',' and ';' as delimiters
    // splits "Mustermann, Max" into two cells, shifting every later column by one
    // (Elo silently becomes the club, Rang silently becomes the points).
    const csv = [
      "Name;Elo;Verein;Land;Rang;Punkte",
      "Mustermann, Max;1200;SV Hofkirchen;AUT;1;10",
      "Musterfrau, Lisa;1100;SV Hofkirchen;AUT;2;8",
    ].join("\n");

    const rows = schuelerLiga.parseRows(parseCsvLines(csv));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ firstname: "Max", lastname: "Mustermann", elo: 1200, clubName: "SV Hofkirchen", country: "AUT", rank: 1, points: 10 });
    expect(rows[1]).toMatchObject({ firstname: "Lisa", lastname: "Musterfrau", elo: 1100, clubName: "SV Hofkirchen", country: "AUT", rank: 2, points: 8 });
  });

  it("still handles comma-delimited files correctly", () => {
    const csv = ["Name,Elo,Verein,Land,Rang,Punkte", "Beispiel Tom,1000,Schachclub Linz,AUT,3,6"].join("\n");
    const rows = schuelerLiga.parseRows(parseCsvLines(csv));
    expect(rows[0]).toMatchObject({ firstname: "Tom", lastname: "Beispiel", elo: 1000, clubName: "Schachclub Linz", points: 6 });
  });

  it("recognizes a real chess-results.com export header (leading title rows, 'Pkt.' points column)", () => {
    // Regression test: chess-results.com exports use "Pkt." (with trailing space and a
    // period, not "Punkte"/"Points"/"pts") for the points column, and prefix the real
    // header row with several title/metadata lines.
    const csv = [
      "Aus der Turnierdatenbank von Chess-Results https://chess-results.com",
      "Schuelerligaturnier Kreis Mitte",
      "Die Seite wurde zuletzt aktualisiert am 25.04.2026 17:30:48",
      "Endstand nach 5 Runden",
      "Rg.;Snr;;Name;Land;Elo;Verein/Ort;Pkt. ;Wtg1",
      "1;1;;Maier, Anna;AUT;1512;Sv Ried Im Innkreis;4.5;14.5",
    ].join("\n");

    const rows = schuelerLiga.parseRows(parseCsvLines(csv));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ firstname: "Anna", lastname: "Maier", elo: 1512, clubName: "Sv Ried Im Innkreis", country: "AUT", rank: 1, points: 4.5 });
  });
});
