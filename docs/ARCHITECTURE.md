# Architecture

Schachmanager unifies two previously separate projects (SchuelerligaManager and
SvHofkirchenHomepage-Web) into one app with real authentication.

```
Browser (Blazor WebAssembly SPA, hosted on GitHub Pages)
   |  HTTPS + JWT bearer token
   v
Cloudflare Worker (TypeScript, REST API)
   |
   v
Cloudflare D1 (SQLite-compatible relational database)
```

## Why this shape

- **Frontend stays Blazor WASM on GitHub Pages** - free static hosting, no server to run,
  both source projects already used this successfully.
- **Backend moved to a real server-side API** (Cloudflare Worker + D1) instead of the old
  browser-local SQLite (SchuelerligaManager) or external, undocumented Worker + KV
  (SvHofkirchen). Free tier, globally reachable, and lets password hashing/JWT verification
  happen somewhere a client can't tamper with.
- **TypeScript on the Worker, not C#.** This is a genuine platform shift for both source
  projects - Cloudflare Workers' native runtime is JS/TS. `client/Schachmanager.Shared`
  mirrors the API's JSON shapes as C# DTOs for the client's convenience, but there is no
  shared assembly between client and server.

## Auth

- Passwords are hashed with PBKDF2-HMAC-SHA256 (per-user salt, 100k iterations) via the
  Workers-native `crypto.subtle` API - see `worker/src/auth/password.ts`. 100k is a hard
  platform ceiling: Workers' `deriveBits` throws `NotSupportedError` above 100,000
  iterations (discovered in production during initial deploy), below the 210k+ OWASP
  baseline for general PBKDF2-SHA256 use elsewhere. `deriveBits` clamps defensively in
  case the configured value is ever raised by mistake.
- Sessions are signed HS256 JWTs (`worker/src/auth/jwt.ts`), returned on login and sent
  back as `Authorization: Bearer <token>`. Chosen over cookies because the GitHub
  Pages client and the Worker live on different origins/sites, and cross-site cookies run
  into `SameSite`/third-party-cookie restrictions that a bearer token sidesteps entirely.
- Roles: `Admin` > `Organizer` > `Member`, enforced server-side in
  `worker/src/auth/middleware.ts` (`requireRole`) on every write/sensitive route, and
  mirrored client-side via `Auth/JwtAuthenticationStateProvider.cs` for `<AuthorizeView>`/
  `[Authorize]` UI gating (the client-side check is UX only - the server is the real
  authorization boundary).
- Accounts are **admin-created only** (see `worker/src/routes/users.ts`); there is no
  self-registration. The very first Admin account is created once via
  `POST /api/auth/bootstrap-admin` (`/setup` in the client), which refuses to run again
  once any user exists.

## Tournament formats

`Tournament.format` is a discriminator (`SchuelerLiga | Swiss | RoundRobin | TeamLeague |
Knockout`). Each format has its own small module under `worker/src/formats/` implementing
a shared `TournamentFormat` interface (`parseCsv` + `computeStandings`) - see
`worker/src/formats/types.ts` and `worker/src/formats/index.ts` for the registry. This
keeps each format's rules isolated instead of one large branching class, per the goal of
supporting multiple tournament models "but still keep them split and not all in 1."

`schuelerLiga.ts` is a direct, tested port of the real business logic that used to live in
`SchuelerligaManager`'s `Auswertung.razor` code-behind (best-of-4 scoring toggle, September
season cutoff, age-class grouping with tie-aware ranking) - not the older, simpler
`SchuelerligaService.cs`, which computed a different total and was not what the UI
actually used.

## Client structure

- `Pages/` - Home (public), Turniere/Spieler/Vereine/Auswertung (tournament manager, ported
  from SchuelerligaManager but rewritten to call the API instead of local EF Core), Youth/
  Attendance (ported from SvHofkirchen), Admin/Users (rewritten against real per-user REST
  endpoints instead of the old "fetch-whole-list-mutate-POST-back" pattern that kept
  plaintext passwords in circulation).
- `Auth/` - `JwtAuthenticationStateProvider`, `AuthTokenHandler` (attaches the bearer token
  to every request).
- `Services/` - one `HttpClient`-backed service per resource (`ClubService`,
  `PlayerService`, `TournamentService`, `YouthService`, `UserAdminService`, `AuthService`).
