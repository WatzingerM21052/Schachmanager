// Round-robin (all-play-all) format. The pairing set is closed/complete (everyone plays
// everyone), but since pairings are always supplied externally, standings computation is
// the same "sum of points" as Swiss - kept as its own module so round-robin-specific rules
// (e.g. a different tie-break in the future) don't have to be bolted onto swiss.ts.
import type { TournamentFormat } from "./types";
import { parsePairingCsv } from "./pairingCsvUtils";
import { sumPointsStandings } from "./standingsUtils";

export const roundRobin: TournamentFormat = {
  parseCsv: parsePairingCsv,
  computeStandings: sumPointsStandings,
};
