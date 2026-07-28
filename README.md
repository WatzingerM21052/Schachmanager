# Schachmanager

A unified chess club platform combining tournament management (formerly
SchuelerligaManager) and club/member administration (formerly
SvHofkirchenHomepage-Web) into one app with real authentication.

- **Client**: Blazor WebAssembly SPA (`client/Schachmanager.Client`), hosted free on
  GitHub Pages.
- **Backend**: Cloudflare Worker + D1 (`worker/`), hosted free on Cloudflare's free tier -
  globally reachable, no server to run yourself.
- **Auth**: PBKDF2 password hashing, signed JWT sessions, role-based access
  (Admin/Organizer/Member), admin-created accounts only.
- **Tournaments**: pluggable formats (SchuelerLiga, Swiss, RoundRobin, TeamLeague,
  Knockout) - see `docs/ARCHITECTURE.md`.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - how it fits together and why
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) - the D1 schema
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) - one-time setup + ongoing deploys
- [`docs/MIGRATION.md`](docs/MIGRATION.md) - moving data out of the two old apps

## Quick start (local dev)

```
cd worker
npx wrangler d1 migrations apply schachmanager-db --local
echo "JWT_SECRET=local-dev-secret" > .dev.vars
npx wrangler dev --local --port 8787
```

```
cd client/Schachmanager.Client
dotnet run
```

Then open the client's URL and visit `/setup` once to create the first Admin account.

## Tests

```
cd worker
npm test        # vitest - password hashing, JWT, CSV parsing, standings logic
npm run typecheck
```

## Repo history note

This is a fresh repository. The two original projects (`SchuelerligaManager` and
`SvHofkirchenHomepage-Web`) remain in place as historical references and were not merged
or deleted.
