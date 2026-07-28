import type { TournamentFormatName } from "../db/types";
import type { TournamentFormat } from "./types";
import { schuelerLiga } from "./schuelerLiga";
import { swiss } from "./swiss";
import { roundRobin } from "./roundRobin";
import { teamLeague } from "./teamLeague";
import { knockout } from "./knockout";

export const FORMAT_REGISTRY: Record<TournamentFormatName, TournamentFormat> = {
  SchuelerLiga: schuelerLiga,
  Swiss: swiss,
  RoundRobin: roundRobin,
  TeamLeague: teamLeague,
  Knockout: knockout,
};

export function getFormat(name: TournamentFormatName): TournamentFormat {
  return FORMAT_REGISTRY[name];
}

export type { StandingRow, StandingsContext, ParsedResultRow, TournamentFormat } from "./types";
