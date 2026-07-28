// Shared CSV parsing helpers used by the individual/team-roster style formats
// (SchuelerLiga, TeamLeague). Ported from SchuelerligaManager's
// ExcelImportService.cs column-sniffing heuristics, generalized to plain CSV text.

/**
 * Picks ONE delimiter for the whole file from the header line, rather than treating
 * "," and ";" as interchangeable per-line. That dual-delimiter approach silently
 * corrupted semicolon-delimited files whose name column uses the "Lastname, Firstname"
 * convention (the exact format this app uses) - an unquoted comma inside the name would
 * get treated as a field separator too, shifting every column after it by one.
 */
export function detectDelimiter(headerLine: string): "," | ";" {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

export function splitCsvLine(line: string, delimiter: "," | ";" = ";"): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsvLines(fileText: string): string[][] {
  const lines = fileText.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => splitCsvLine(line, delimiter));
}

export interface RosterColumnMap {
  nameCol: number;
  eloCol: number;
  countryCol: number;
  clubCol: number;
  rankCol: number;
  pointsCol: number;
}

/** Finds the header row and sniffs out column indices, same heuristic as the old ExcelImportService. */
export function findRosterColumns(rows: string[][]): { headerRowIndex: number; columns: RosterColumnMap } | null {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const nameCol = row.findIndex((cell) => cell.toLowerCase().includes("name"));
    if (nameCol === -1) continue;

    const columns: RosterColumnMap = { nameCol, eloCol: -1, countryCol: -1, clubCol: -1, rankCol: -1, pointsCol: -1 };
    row.forEach((cell, j) => {
      const v = cell.toLowerCase();
      if (v.includes("elo") || v === "rg") columns.eloCol = j;
      if (v === "land" || v === "fed") columns.countryCol = j;
      if (v.includes("verein") || v.includes("club") || v.includes("ort")) columns.clubCol = j;
      if (v.startsWith("rg") || v.startsWith("rk") || v.startsWith("rang")) columns.rankCol = j;
      if (v.includes("punkte") || v.includes("points") || v === "pts" || v.includes("pkt")) columns.pointsCol = j;
    });
    return { headerRowIndex: r, columns };
  }
  return null;
}

export function splitName(name: string): { firstname: string; lastname: string } {
  if (name.includes(",")) {
    const [last, first] = name.split(",");
    return { lastname: last.trim(), firstname: (first ?? "").trim() };
  }
  const parts = name.trim().split(/\s+/);
  return { lastname: parts[0] ?? "", firstname: parts.slice(1).join(" ") };
}

export function toNumberOrNull(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
