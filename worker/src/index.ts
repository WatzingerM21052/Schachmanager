import { AutoRouter } from "itty-router";
import type { Env } from "./env";
import { corsHeaders, error, json } from "./http";
import { attachUser, requireRole, type AuthedRequest } from "./auth/middleware";
import * as auth from "./routes/auth";
import * as users from "./routes/users";
import * as clubs from "./routes/clubs";
import * as players from "./routes/players";
import * as tournaments from "./routes/tournaments";
import * as imports from "./routes/imports";
import * as standings from "./routes/standings";
import * as youth from "./routes/youth";
import * as hallOfFame from "./routes/hallOfFame";
import * as backup from "./routes/backup";
import * as googleDriveBackup from "./routes/googleDriveBackup";

const router = AutoRouter<AuthedRequest, [Env]>();

router.get("/api/health", (_request, env: Env) => json(env, { status: "ok" }));

// --- Auth (public) ---
router.post("/api/auth/login", auth.login);
router.post("/api/auth/bootstrap-admin", auth.bootstrapAdmin);
router.get("/api/auth/me", auth.me);

// --- Public read endpoints ---
router.get("/api/clubs", clubs.listClubs);
router.get("/api/players", players.listPlayers);
router.get("/api/tournaments", tournaments.listTournaments);
router.get("/api/tournaments/:id", tournaments.getTournament);
router.get("/api/tournaments/:id/standings", standings.getTournamentStandings);
router.get("/api/leaderboard", standings.getLeaderboard);
router.get("/api/hall-of-fame", hallOfFame.getHallOfFame);

// --- Organizer+ write endpoints (clubs/players/tournaments/import) ---
const organizer = requireRole("Organizer");
router.post("/api/clubs", organizer, clubs.createClub);
router.put("/api/clubs/:id", organizer, clubs.updateClub);
router.delete("/api/clubs/:id", organizer, clubs.deleteClub);

router.post("/api/players", organizer, players.createPlayer);
router.put("/api/players/:id", organizer, players.updatePlayer);
router.delete("/api/players/:id", organizer, players.deletePlayer);
router.post("/api/players/merge", organizer, players.mergePlayers);

router.post("/api/tournaments", organizer, tournaments.createTournament);
router.put("/api/tournaments/:id", organizer, tournaments.updateTournament);
router.delete("/api/tournaments/:id", organizer, tournaments.deleteTournament);
router.post("/api/tournaments/:id/import", organizer, imports.importCsv);

// --- Member+ youth/attendance endpoints (contains member PII, not public) ---
const member = requireRole("Member");
router.get("/api/youth", member, youth.listYouthMembers);
router.post("/api/youth", organizer, youth.createYouthMember);
router.put("/api/youth/:id", organizer, youth.updateYouthMember);
router.delete("/api/youth/:id", organizer, youth.deleteYouthMember);
router.get("/api/attendance", member, youth.listAttendance);
router.post("/api/attendance", organizer, youth.recordAttendance);

// --- Admin-only user management ---
const admin = requireRole("Admin");
router.get("/api/users", admin, users.listUsers);
router.post("/api/users", admin, users.createUser);
router.put("/api/users/:id", admin, users.updateUser);
router.delete("/api/users/:id", admin, users.deleteUser);
router.post("/api/users/:id/reset-password", admin, users.resetPassword);

router.get("/api/backup/export", admin, backup.exportBackup);
router.post("/api/backup/import", admin, backup.importBackup);
router.post("/api/backup/drive", admin, googleDriveBackup.triggerGoogleDriveBackup);

router.all("*", (_request, env: Env) => error(env, "Not found", 404));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const authedRequest = request as AuthedRequest;

    try {
      await attachUser(authedRequest, env);
      return await router.fetch(authedRequest, env, ctx);
    } catch (err) {
      console.error(err);
      return error(env, "Internal server error", 500);
    }
  },
};
