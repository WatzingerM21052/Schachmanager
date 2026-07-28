// CSV helpers for formats that carry round-by-round PAIRING data (Swiss/RoundRobin/Knockout).
// Pairings themselves are always produced by an external tool (per product decision - this
// system never generates pairings), so parsing just needs to recognize per-round result rows.
import { parseCsvLines, splitName, toNumberOrNull } from "./csvUtils";
import type { ParsedResultRow } from "./types";

export interface PairingColumnMap {
  nameCol: number;
  roundCol: number;
  boardCol: number;
  opponentCol: number;
  resultCol: number;
  pointsCol: number;
}

function findPairingColumns(rows: string[][]): { headerRowIndex: number; columns: PairingColumnMap } | null {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const nameCol = row.findIndex((c) => {
      const v = c.toLowerCase();
      return v.includes("name") || v.includes("spieler");
    });
    if (nameCol === -1) continue;

    const columns: PairingColumnMap = { nameCol, roundCol: -1, boardCol: -1, opponentCol: -1, resultCol: -1, pointsCol: -1 };
    row.forEach((cell, j) => {
      const v = cell.toLowerCase();
      if (v.includes("runde") || v.includes("round")) columns.roundCol = j;
      if (v.includes("brett") || v.includes("board")) columns.boardCol = j;
      if (v.includes("gegner") || v.includes("opponent")) columns.opponentCol = j;
      if (v.includes("ergebnis") || v.includes("result")) columns.resultCol = j;
      if (v.includes("punkte") || v.includes("points") || v === "pts") columns.pointsCol = j;
    });
    return { headerRowIndex: r, columns };
  }
  return null;
}

export function parsePairingCsv(fileText: string): ParsedResultRow[] {
  const rows = parseCsvLines(fileText);
  const found = findPairingColumns(rows);
  if (!found) return [];
  const { headerRowIndex, columns } = found;

  const out: ParsedResultRow[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = row[columns.nameCol];
    if (!name || name.toLowerCase().includes("name")) continue;

    const { firstname, lastname } = splitName(name);
    out.push({
      firstname,
      lastname,
      roundNo: columns.roundCol !== -1 ? toNumberOrNull(row[columns.roundCol]) : null,
      boardNo: columns.boardCol !== -1 ? toNumberOrNull(row[columns.boardCol]) : null,
      opponentName: columns.opponentCol !== -1 ? row[columns.opponentCol] || null : null,
      resultCode: columns.resultCol !== -1 ? row[columns.resultCol] || null : null,
      points: columns.pointsCol !== -1 ? (toNumberOrNull(row[columns.pointsCol]) ?? 0) : 0,
    });
  }
  return out;
}
