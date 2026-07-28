import type { IRequest } from "itty-router";
import type { Env } from "../env";
import { error } from "../http";
import { verifyJwt, type JwtPayload, type Role } from "./jwt";

export interface AuthedRequest extends IRequest {
  user?: JwtPayload;
}

const ROLE_RANK: Record<Role, number> = { Member: 1, Organizer: 2, Admin: 3 };

/** Populates request.user if a valid bearer token is present; never blocks by itself. */
export async function attachUser(request: AuthedRequest, env: Env): Promise<void> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return;
  const token = authHeader.slice("Bearer ".length);
  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (payload) request.user = payload;
}

/** Route guard factory: rejects the request unless the caller has at least `minRole`. */
export function requireRole(minRole: Role) {
  return (request: AuthedRequest, env: Env): Response | undefined => {
    if (!request.user) return error(env, "Authentication required", 401);
    if (ROLE_RANK[request.user.role] < ROLE_RANK[minRole]) {
      return error(env, "Insufficient permissions", 403);
    }
    return undefined; // itty-router continues to the next handler when undefined is returned
  };
}
