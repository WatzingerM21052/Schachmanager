# Migrating Data From the Old Apps

Neither old app's data can be migrated automatically end-to-end - both need a manual,
human-supervised step. Do this once, after the new Worker is deployed and reachable.

## SchuelerligaManager's `chess.db` (SQLite)

This database only ever existed inside the browser of whoever was using the app (via
`DatabaseManager.cs`'s import/export-a-file workflow) - there is no central copy to pull
from automatically.

1. Open the old SchuelerligaManager app one last time and export/download `chess.db`
   (the existing "Export Database" feature).
2. Read the file locally (e.g. with `sqlite3` or Node's `better-sqlite3`/`sql.js`) and
   extract `Clubs`, `Players`, `Tournaments`, `PlayerTournaments`.
3. Re-insert that data into the new system via the Worker's admin-authenticated REST
   endpoints (`POST /api/clubs`, `/api/players`, `/api/tournaments`, then
   `POST /api/tournaments/{id}/import` with a CSV built from the old `PlayerTournaments`
   rows for each tournament) - or write a one-off script that calls those endpoints in a
   loop. There is intentionally no bulk-SQL-import endpoint exposed publicly.
4. Spot-check a season's standings in `/auswertung` against the old app's `Auswertung`
   page before decommissioning the old site.

## SvHofkirchen's Cloudflare KV data

This one **is** centrally reachable (it lives in a Cloudflare KV namespace behind the old,
external Worker), so it's scriptable:

1. Use `wrangler kv key list`/`wrangler kv key get` (or the old Worker's existing
   `/api/youth`, `/api/users` endpoints if still reachable) to pull the current
   `LegacyDatabase`/`YouthDataRoot` JSON blob(s).
2. Transform `MemberDto` -> `POST /api/youth` and `PresenceDto` -> `POST /api/attendance`
   calls against the new Worker.
3. User accounts do **not** migrate 1:1 - the old system stored plaintext passwords, which
   must never be carried into the new hashed scheme. Instead, an Admin creates fresh
   accounts in `/admin/users` for each real user and distributes the generated passwords
   through a secure channel (the generated password is shown exactly once).

Dry-run any script against a scratch tournament/club first (or point it at
`wrangler dev --local`) before running it against the real deployed database.
