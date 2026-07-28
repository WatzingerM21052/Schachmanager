import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../db/audit";
import { exportBackupPayload } from "./backupData";

/**
 * POST /api/backup/drive - uploads a fresh export to Google Drive via a pre-authorized
 * OAuth2 refresh token. Requires GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN
 * secrets (and optionally GOOGLE_DRIVE_FOLDER_ID) to be configured - see
 * docs/DEPLOYMENT.md for the one-time Google Cloud OAuth setup (this can't be done from
 * code; it requires the club's own Google account).
 */
export async function triggerGoogleDriveBackup(request: AuthedRequest, env: Env): Promise<Response> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return error(
      env,
      "Google Drive backup is not configured. An Admin needs to set up OAuth credentials first - see docs/DEPLOYMENT.md.",
      501
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenResponse.ok) {
    return error(env, `Google auth failed: ${await tokenResponse.text()}`, 502);
  }
  const { access_token } = (await tokenResponse.json()) as { access_token: string };

  const payload = await exportBackupPayload(env);
  const fileName = `schachmanager-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const metadata: Record<string, unknown> = { name: fileName, mimeType: "application/json" };
  if (env.GOOGLE_DRIVE_FOLDER_ID) metadata.parents = [env.GOOGLE_DRIVE_FOLDER_ID];

  const boundary = "schachmanager_backup_boundary";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n` +
    `--${boundary}--`;

  const uploadResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!uploadResponse.ok) {
    return error(env, `Google Drive upload failed: ${await uploadResponse.text()}`, 502);
  }

  const uploaded = (await uploadResponse.json()) as { id: string; name: string };
  await logAudit(env, request.user!.sub, "google_drive_backup", "Backup", null, { fileId: uploaded.id, fileName: uploaded.name });
  return json(env, { success: true, fileName: uploaded.name, fileId: uploaded.id });
}
