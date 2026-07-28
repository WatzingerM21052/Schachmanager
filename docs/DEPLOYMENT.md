# Deployment

## One-time setup

1. **Create the D1 database:**
   ```
   cd worker
   npx wrangler login
   npx wrangler d1 create schachmanager-db
   ```
   Copy the returned `database_id` into `worker/wrangler.toml` (replacing
   `REPLACE_WITH_REAL_D1_DATABASE_ID`).

2. **Set the JWT signing secret** (never commit this):
   ```
   npx wrangler secret put JWT_SECRET
   ```
   Use a long random value, e.g. `openssl rand -base64 48`.

3. **Set the allowed CORS origin** in `worker/wrangler.toml` (`ALLOWED_ORIGIN`) to your
   actual GitHub Pages URL, e.g. `https://<username>.github.io`.

4. **Apply migrations to the real (remote) database:**
   ```
   npx wrangler d1 migrations apply schachmanager-db --remote
   ```

5. **Deploy the Worker once manually** to get its `*.workers.dev` URL:
   ```
   npx wrangler deploy
   ```
   Put that URL into `client/Schachmanager.Client/wwwroot/appsettings.json`
   (`ApiBaseUrl`).

6. **Create the GitHub repo**, push this code, and add these repo secrets (Settings ->
   Secrets and variables -> Actions) so `deploy-worker.yml` can deploy on push:
   - `CLOUDFLARE_API_TOKEN` (a token scoped to Workers + D1 edit)
   - `CLOUDFLARE_ACCOUNT_ID`

7. Enable GitHub Pages (Settings -> Pages -> Source: GitHub Actions) so
   `deploy-client.yml` can publish the Blazor client.

8. Visit the deployed site's `/setup` page once to create the first Admin account
   (`POST /api/auth/bootstrap-admin` only works while zero users exist).

## Optional: Google Drive backup (Settings page)

The "Jetzt sichern" button on `/settings` uploads a full data export to Google Drive.
This requires OAuth credentials the club itself must create (a Cloudflare-only setup
can't do this - it needs your Google account):

1. In [Google Cloud Console](https://console.cloud.google.com), create a project, enable
   the **Google Drive API**, and create an **OAuth 2.0 Client ID** (type: Desktop app -
   simplest for generating a refresh token via the flow below).
2. Use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground):
   - Gear icon -> "Use your own OAuth credentials" -> paste your Client ID/Secret.
   - Authorize scope `https://www.googleapis.com/auth/drive.file`.
   - Exchange the authorization code for tokens - copy the **refresh token**.
3. Set the secrets/vars on the Worker:
   ```
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put GOOGLE_REFRESH_TOKEN
   ```
4. Optionally add `GOOGLE_DRIVE_FOLDER_ID` (a specific Drive folder's ID from its URL) to
   `[vars]` in `wrangler.toml` to keep backups organized; omit it to upload to Drive root.

Without these set, the button returns a clear "not configured" message instead of failing
silently.

## Ongoing deploys

Pushing to `main`:
- Changes under `client/**` -> `deploy-client.yml` rebuilds and republishes to GitHub
  Pages.
- Changes under `worker/**` -> `deploy-worker.yml` runs typecheck + tests, applies any new
  D1 migrations, then deploys the Worker.

Both run independently (path-filtered), so a client-only change doesn't redeploy the
Worker and vice versa.

## Local development

```
# Terminal 1 - backend
cd worker
npx wrangler d1 migrations apply schachmanager-db --local
echo "JWT_SECRET=local-dev-secret" > .dev.vars   # never commit this file
npx wrangler dev --local --port 8787

# Terminal 2 - frontend
cd client/Schachmanager.Client
dotnet run
```

The client's `wwwroot/appsettings.Development.json` already points at
`http://127.0.0.1:8787/` for local dev.
