// Swiss-system format. Pairings/results per round are produced externally and imported
// as-is (no pairing engine here) - this module just stores and totals them.
// No Buchholz/Sonneborn-Berger tie-break yet since the schema has no tiebreak column;
// plain points total is the documented fallback (see docs/DATA-MODEL.md).
import type { TournamentFormat } from "./types";
import { parsePairingCsv } from "./pairingCsvUtils";
import { sumPointsStandings } from "./standingsUtils";

export const swiss: TournamentFormat = {
  parseCsv: parsePairingCsv,
  computeStandings: sumPointsStandings,
};
