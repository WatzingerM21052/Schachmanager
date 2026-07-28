import type { Env } from "../env";
import { error, json } from "../http";
import type { AuthedRequest } from "../auth/middleware";
import { logAudit } from "../db/audit";
import type { AttendanceRow, YouthMemberRow } from "../db/types";
import { attendanceToDto, youthMemberToDto } from "../db/toDto";

interface YouthMemberInput {
  firstname?: string;
  lastname?: string;
  birthdate?: string;
  youthStatus?: string;
}

export async function listYouthMembers(_request: AuthedRequest, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM YouthMembers ORDER BY lastname, firstname").all<YouthMemberRow>();
  return json(env, results.map(youthMemberToDto));
}

export async function createYouthMember(request: AuthedRequest, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as YouthMemberInput | null;
  if (!body?.firstname || !body?.lastname || !body?.birthdate) {
    return error(env, "firstname, lastname and birthdate are required", 400);
  }

  const result = await env.DB.prepare(
    "INSERT INTO YouthMembers (firstname, lastname, birthdate, youth_status) VALUES (?, ?, ?, ?)"
  )
    .bind(body.firstname, body.lastname, body.birthdate, body.youthStatus ?? "active")
    .run();

  const id = result.meta.last_row_id;
  await logAudit(env, request.user!.sub, "create_youth_member", "YouthMember", id, body);
  const created = await env.DB.prepare("SELECT * FROM YouthMembers WHERE id = ?").bind(id).first<YouthMemberRow>();
  return json(env, youthMemberToDto(created!), 201);
}

export async function updateYouthMember(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const body = (await request.json().catch(() => null)) as YouthMemberInput | null;
  if (!body) return error(env, "Invalid body", 400);

  const existing = await env.DB.prepare("SELECT * FROM YouthMembers WHERE id = ?").bind(id).first<YouthMemberRow>();
  if (!existing) return error(env, "Youth member not found", 404);

  await env.DB.prepare("UPDATE YouthMembers SET firstname = ?, lastname = ?, birthdate = ?, youth_status = ? WHERE id = ?")
    .bind(
      body.firstname ?? existing.firstname,
      body.lastname ?? existing.lastname,
      body.birthdate ?? existing.birthdate,
      body.youthStatus ?? existing.youth_status,
      id
    )
    .run();

  await logAudit(env, request.user!.sub, "update_youth_member", "YouthMember", id, body);
  const updated = await env.DB.prepare("SELECT * FROM YouthMembers WHERE id = ?").bind(id).first<YouthMemberRow>();
  return json(env, youthMemberToDto(updated!));
}

export async function deleteYouthMember(request: AuthedRequest, env: Env): Promise<Response> {
  const id = Number(request.params?.id);
  const existing = await env.DB.prepare("SELECT id FROM YouthMembers WHERE id = ?").bind(id).first();
  if (!existing) return error(env, "Youth member not found", 404);

  await env.DB.prepare("DELETE FROM YouthMembers WHERE id = ?").bind(id).run();
  await logAudit(env, request.user!.sub, "delete_youth_member", "YouthMember", id);
  return json(env, { success: true });
}

export async function listAttendance(request: AuthedRequest, env: Env): Promise<Response> {
  const date = new URL(request.url).searchParams.get("date");
  const stmt = date
    ? env.DB.prepare("SELECT * FROM Attendance WHERE date = ?").bind(date)
    : env.DB.prepare("SELECT * FROM Attendance ORDER BY date DESC");
  const { results } = await stmt.all<AttendanceRow>();
  return json(env, results.map(attendanceToDto));
}

export async function recordAttendance(request: AuthedRequest, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { memberId?: number; date?: string; present?: boolean } | null;
  if (!body?.memberId || !body?.date) return error(env, "memberId and date are required", 400);

  await env.DB.prepare(
    `INSERT INTO Attendance (member_id, date, present) VALUES (?, ?, ?)
     ON CONFLICT(member_id, date) DO UPDATE SET present = excluded.present`
  )
    .bind(body.memberId, body.date, body.present ? 1 : 0)
    .run();

  await logAudit(env, request.user!.sub, "record_attendance", "Attendance", body.memberId, body);
  return json(env, { success: true });
}
