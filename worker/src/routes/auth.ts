import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { hashPassword, verifyPassword } from "../auth/password";
import { signJwt } from "../auth/jwt";
import { logAudit } from "../db/audit";
import type { UserRow } from "../db/types";

function publicUser(u: UserRow) {
  return { id: u.id, username: u.username, email: u.email, role: u.role, isActive: !!u.is_active, lastLogin: u.last_login };
}

export async function login(request: AuthedRequest, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  if (!body?.username || !body?.password) return error(env, "Username and password are required", 400);

  const user = await env.DB.prepare("SELECT * FROM Users WHERE username = ?")
    .bind(body.username)
    .first<UserRow>();

  // Same generic error whether the user doesn't exist or the password is wrong - avoids username enumeration.
  if (!user || !user.is_active) return error(env, "Invalid username or password", 401);

  const iterations = parseInt(env.PBKDF2_ITERATIONS, 10);
  const ok = await verifyPassword(body.password, user.password_hash, user.password_salt, iterations);
  if (!ok) return error(env, "Invalid username or password", 401);

  await env.DB.prepare("UPDATE Users SET last_login = datetime('now') WHERE id = ?").bind(user.id).run();
  await logAudit(env, user.id, "login", "User", user.id);

  const token = await signJwt({ sub: user.id, username: user.username, role: user.role }, env.JWT_SECRET);
  return json(env, { token, user: publicUser(user) });
}

/**
 * One-time bootstrap: creates the first Admin account. Only works while the Users table
 * is empty, so it cannot be used to create additional accounts later (accounts are
 * admin-created only from that point on, via routes/users.ts).
 */
export async function bootstrapAdmin(request: AuthedRequest, env: Env): Promise<Response> {
  const { count } = (await env.DB.prepare("SELECT COUNT(*) as count FROM Users").first()) as { count: number };
  if (count > 0) return error(env, "Setup already completed", 403);

  const body = (await request.json().catch(() => null)) as { username?: string; password?: string; email?: string } | null;
  if (!body?.username || !body?.password) return error(env, "Username and password are required", 400);
  if (body.password.length < 10) return error(env, "Password must be at least 10 characters", 400);

  const iterations = parseInt(env.PBKDF2_ITERATIONS, 10);
  const { hash, salt } = await hashPassword(body.password, iterations);

  const result = await env.DB.prepare(
    "INSERT INTO Users (username, email, password_hash, password_salt, role, is_active) VALUES (?, ?, ?, ?, 'Admin', 1)"
  )
    .bind(body.username, body.email ?? null, hash, salt)
    .run();

  const userId = result.meta.last_row_id;
  await logAudit(env, userId, "bootstrap_admin", "User", userId);

  const token = await signJwt({ sub: userId, username: body.username, role: "Admin" }, env.JWT_SECRET);
  return json(env, { token, user: { id: userId, username: body.username, email: body.email ?? null, role: "Admin", isActive: true, lastLogin: null } }, 201);
}

export async function me(request: AuthedRequest, env: Env): Promise<Response> {
  if (!request.user) return error(env, "Authentication required", 401);
  const user = await env.DB.prepare("SELECT * FROM Users WHERE id = ?").bind(request.user.sub).first<UserRow>();
  if (!user) return error(env, "User not found", 404);
  return json(env, publicUser(user));
}
