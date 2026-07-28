import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { generateRandomPassword, hashPassword } from "../auth/password";
import { logAudit } from "../db/audit";
import type { Role } from "../auth/jwt";
import type { UserRow } from "../db/types";

function publicUser(u: UserRow) {
  return { id: u.id, username: u.username, email: u.email, role: u.role, isActive: !!u.is_active, createdAt: u.created_at, lastLogin: u.last_login };
}

const VALID_ROLES: Role[] = ["Admin", "Organizer", "Member"];

export async function listUsers(_request: AuthedRequest, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM Users ORDER BY username").all<UserRow>();
  return json(env, results.map(publicUser));
}

/** Admin creates a new account (no self-registration). Returns the generated password ONCE. */
export async function createUser(request: AuthedRequest, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { username?: string; email?: string; role?: string } | null;
  if (!body?.username || !body?.role) return error(env, "username and role are required", 400);
  if (!VALID_ROLES.includes(body.role as Role)) return error(env, `role must be one of: ${VALID_ROLES.join(", ")}`, 400);

  const existing = await env.DB.prepare("SELECT id FROM Users WHERE username = ?").bind(body.username).first();
  if (existing) return error(env, "Username already exists", 409);

  const plaintextPassword = generateRandomPassword();
  const iterations = parseInt(env.PBKDF2_ITERATIONS, 10);
  const { hash, salt } = await hashPassword(plaintextPassword, iterations);

  const result = await env.DB.prepare(
    "INSERT INTO Users (username, email, password_hash, password_salt, role, is_active) VALUES (?, ?, ?, ?, ?, 1)"
  )
    .bind(body.username, body.email ?? null, hash, salt, body.role)
    .run();

  const userId = result.meta.last_row_id;
  await logAudit(env, request.user!.sub, "create_user", "User", userId, { role: body.role });

  return json(env, { id: userId, username: body.username, email: body.email ?? null, role: body.role, isActive: true, generatedPassword: plaintextPassword }, 201);
}

export async function updateUser(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const body = (await request.json().catch(() => null)) as { email?: string; role?: string; isActive?: boolean } | null;
  if (!body) return error(env, "Invalid body", 400);
  if (body.role && !VALID_ROLES.includes(body.role as Role)) return error(env, `role must be one of: ${VALID_ROLES.join(", ")}`, 400);

  const target = await env.DB.prepare("SELECT * FROM Users WHERE id = ?").bind(id).first<UserRow>();
  if (!target) return error(env, "User not found", 404);

  // Prevent an admin from locking themselves out by deactivating/demoting their own last-Admin account.
  if (target.id === request.user!.sub && (body.isActive === false || (body.role && body.role !== "Admin"))) {
    const { count } = (await env.DB.prepare("SELECT COUNT(*) as count FROM Users WHERE role = 'Admin' AND is_active = 1").first()) as { count: number };
    if (count <= 1) return error(env, "Cannot deactivate or demote the last active Admin account", 409);
  }

  await env.DB.prepare("UPDATE Users SET email = COALESCE(?, email), role = COALESCE(?, role), is_active = COALESCE(?, is_active) WHERE id = ?")
    .bind(body.email ?? null, body.role ?? null, body.isActive === undefined ? null : (body.isActive ? 1 : 0), id)
    .run();

  await logAudit(env, request.user!.sub, "update_user", "User", id, body);
  const updated = await env.DB.prepare("SELECT * FROM Users WHERE id = ?").bind(id).first<UserRow>();
  return json(env, publicUser(updated!));
}

/**
 * Admin-triggered password (re)set. With no body (or an empty one), generates a fresh
 * random password. With { password: "..." } in the body, the admin sets that exact
 * password instead - matching the old app's "manual password override", but the value
 * is hashed immediately and never stored/returned in plaintext afterwards (unlike the
 * old app, which round-tripped the current password so the admin could see it later).
 */
export async function resetPassword(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const target = await env.DB.prepare("SELECT id FROM Users WHERE id = ?").bind(id).first();
  if (!target) return error(env, "User not found", 404);

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const manualPassword = body?.password?.trim();
  if (manualPassword && manualPassword.length < 10) {
    return error(env, "Password must be at least 10 characters", 400);
  }

  const plaintextPassword = manualPassword || generateRandomPassword();
  const iterations = parseInt(env.PBKDF2_ITERATIONS, 10);
  const { hash, salt } = await hashPassword(plaintextPassword, iterations);

  await env.DB.prepare("UPDATE Users SET password_hash = ?, password_salt = ? WHERE id = ?").bind(hash, salt, id).run();
  await logAudit(env, request.user!.sub, manualPassword ? "set_manual_password" : "reset_password", "User", id);

  return json(env, { generatedPassword: plaintextPassword });
}

export async function deleteUser(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  if (id === request.user!.sub) return error(env, "Cannot delete your own account", 409);

  const target = await env.DB.prepare("SELECT role FROM Users WHERE id = ?").bind(id).first<{ role: Role }>();
  if (!target) return error(env, "User not found", 404);
  if (target.role === "Admin") {
    const { count } = (await env.DB.prepare("SELECT COUNT(*) as count FROM Users WHERE role = 'Admin' AND is_active = 1").first()) as { count: number };
    if (count <= 1) return error(env, "Cannot delete the last active Admin account", 409);
  }

  await env.DB.prepare("DELETE FROM Users WHERE id = ?").bind(id).run();
  await logAudit(env, request.user!.sub, "delete_user", "User", id);
  return json(env, { success: true });
}
