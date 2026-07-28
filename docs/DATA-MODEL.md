# Data Model

D1 (SQLite) schema, defined in `worker/migrations/0001_init.sql`.

| Table | Purpose |
|---|---|
| `Users` | Login accounts. `password_hash`/`password_salt` (PBKDF2), `role` (Admin/Organizer/Member). Admin-created only. |
| `Clubs` | Chess clubs. |
| `Players` | Individual players. `birth_year` is stored; **age group is always computed on read** (`worker/src/ageGroup.ts`), never stored - the old apps each stored/duplicated an age-group string that could go stale across a birthday or season rollover. |
| `Tournaments` | One row per tournament/event. `format` discriminates which module in `worker/src/formats/` owns its CSV parsing and standings computation. |
| `TournamentResults` | One generalized results table for **both** individual and team-based formats: `player_id` (individual) or `team_name` (team), plus optional `round_no`/`board_no`/`opponent_player_id`/`result_code` for formats that carry round-by-round pairing data (Swiss/RoundRobin/Knockout). Unused columns stay `NULL` for formats that don't need them. |
| `YouthMembers` / `Attendance` | Club membership + attendance tracking, carried over from SvHofkirchen's `MemberDto`/`PresenceDto`. |
| `AuditLog` | Who did what (create/update/delete/import/login), for accountability - see `worker/src/db/audit.ts`. |

## Why one `TournamentResults` table instead of one per format

The formats share the same underlying concept - "this player/team scored these points in
this tournament" - and only differ in whether there's round-by-round pairing detail behind
that score. Splitting the *business logic* by format (see `worker/src/formats/`) achieves
the "keep them split" goal without needing five near-identical tables and the joins that
would come with querying across them (e.g. a season leaderboard that mixes formats).

## Wire format

The Worker returns/accepts **camelCase JSON** (`birthYear`, `clubId`, `youthStatus`, ...),
not the DB's snake_case column names - see `worker/src/db/toDto.ts`. The C# client uses
`JsonSerializerOptions` with `PropertyNamingPolicy = JsonNamingPolicy.CamelCase` and
case-insensitive matching (`Services/ApiJson.cs`) so its PascalCase DTOs round-trip
correctly against that wire format.
