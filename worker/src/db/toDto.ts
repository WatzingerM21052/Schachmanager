// Maps snake_case D1 rows to the camelCase JSON shape the C# client DTOs expect
// (System.Text.Json defaults to case-insensitive PascalCase matching, so the wire format
// should be a normal camelCase JSON API, not a leak of the DB's column naming).
import { ageGroupForBirthYear, ageGroupForBirthdate } from "../ageGroup";
import type { AttendanceRow, ClubRow, PlayerRow, TournamentRow, YouthMemberRow } from "./types";

export function clubToDto(c: ClubRow) {
  return { id: c.id, name: c.name };
}

export function playerToDto(p: PlayerRow) {
  return {
    id: p.id,
    firstname: p.firstname,
    lastname: p.lastname,
    elo: p.elo,
    country: p.country,
    birthYear: p.birth_year,
    clubId: p.club_id,
    ageGroup: p.birth_year ? ageGroupForBirthYear(p.birth_year) : null,
  };
}

export function tournamentToDto(t: TournamentRow) {
  return { id: t.id, name: t.name, date: t.date, format: t.format, season: t.season, notes: t.notes };
}

export function youthMemberToDto(m: YouthMemberRow) {
  return {
    id: m.id,
    firstname: m.firstname,
    lastname: m.lastname,
    birthdate: m.birthdate,
    youthStatus: m.youth_status,
    ageGroup: ageGroupForBirthdate(m.birthdate),
  };
}

export function attendanceToDto(a: AttendanceRow) {
  return { id: a.id, memberId: a.member_id, date: a.date, present: !!a.present };
}
