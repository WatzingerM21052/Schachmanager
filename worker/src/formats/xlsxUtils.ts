import * as XLSX from "xlsx";

/**
 * Parses an uploaded .xlsx workbook (e.g. a chess-results.com export) into the same
 * string[][] row shape that parseCsvLines() produces, so every format's column-sniffing
 * logic (findRosterColumns etc.) works identically regardless of whether the organizer
 * uploaded a CSV or an actual Excel file.
 */
export function xlsxToRows(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  return rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim())));
}
