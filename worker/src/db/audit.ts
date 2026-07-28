import type { Env } from "../env";

export async function logAudit(
  env: Env,
  actorUserId: number | null,
  action: string,
  targetType: string,
  targetId: string | number | null,
  details?: unknown
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO AuditLog (actor_user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(actorUserId, action, targetType, targetId === null ? null : String(targetId), details ? JSON.stringify(details) : null)
    .run();
}
