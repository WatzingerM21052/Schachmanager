export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  PBKDF2_ITERATIONS: string;
  JWT_SECRET: string;
  // Optional: only needed for the Google Drive backup feature (Settings page).
  // See docs/DEPLOYMENT.md for the one-time OAuth setup - requires the club's Google account.
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
}
