export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  PBKDF2_ITERATIONS: string;
  JWT_SECRET: string;
}
