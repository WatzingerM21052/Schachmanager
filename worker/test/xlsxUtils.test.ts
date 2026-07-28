import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { xlsxToRows } from "../src/formats/xlsxUtils";
import { schuelerLiga } from "../src/formats/schuelerLiga";

function buildTestWorkbook(rows: (string | number)[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  const buf = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return buf;
}

describe("xlsxToRows", () => {
  it("converts a workbook's first sheet into string[][] rows", () => {
    const buffer = buildTestWorkbook([
      ["Aus der Turnierdatenbank von Chess-Results https://chess-results.com"],
      ["Rg.", "Snr", "", "Name", "Land", "Elo", "Verein/Ort", "Pkt. ", "Wtg1"],
      [1, 1, "", "Maier, Anna", "AUT", 1512, "Sv Ried Im Innkreis", 4.5, 14.5],
    ]);

    const rows = xlsxToRows(buffer);
    // Cell whitespace is trimmed, consistent with how splitCsvLine() trims CSV cells too.
    expect(rows[1]).toEqual(["Rg.", "Snr", "", "Name", "Land", "Elo", "Verein/Ort", "Pkt.", "Wtg1"]);
    expect(rows[2][3]).toBe("Maier, Anna");
    expect(rows[2][5]).toBe("1512");
  });

  it("feeds directly into schuelerLiga.parseRows just like a CSV would", () => {
    const buffer = buildTestWorkbook([
      ["Rg.", "Name", "Land", "Elo", "Verein/Ort", "Pkt. "],
      [1, "Maier, Anna", "AUT", 1512, "Sv Ried Im Innkreis", 4.5],
      [2, "Schiemer, Paul", "AUT", 1329, "Sk Taufkirchen/Pram", 4],
    ]);

    const rows = xlsxToRows(buffer);
    const parsed = schuelerLiga.parseRows(rows);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ firstname: "Anna", lastname: "Maier", elo: 1512, clubName: "Sv Ried Im Innkreis", points: 4.5 });
  });
});
