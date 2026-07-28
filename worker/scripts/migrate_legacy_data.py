"""
One-time migration of real legacy data into the production Schachmanager API.

Sources (all in the SchachWebsites/ parent folder, next to Schachmanager/):
  - SL-KreisMitte-Stand_Runde_7.db   (SchuelerligaManager's exported chess.db: Clubs/Players/Tournaments/PlayerTournaments)
  - youth_data_YouthPage             (SvHofkirchen's exported youth members + attendance, JSON)
  - users_data_YouthPage             (SvHofkirchen's exported user accounts, JSON, PLAINTEXT passwords - never reused)

Run once, manually: python worker/scripts/migrate_legacy_data.py
Requires the Admin account already created via /setup or bootstrap-admin, credentials in
Schachmanager/credentials/admin.txt (gitignored).
"""

import json
import re
import sqlite3
import subprocess
import tempfile
from pathlib import Path

API = "https://schachmanager-api.svhofkirchen-api.workers.dev"

REPO_ROOT = Path(__file__).resolve().parents[2]  # .../Schachmanager
DATA_ROOT = REPO_ROOT.parent  # .../SchachWebsites

CHESS_DB = DATA_ROOT / "SL-KreisMitte-Stand_Runde_7.db"
YOUTH_JSON = DATA_ROOT / "youth_data_YouthPage"
USERS_JSON = DATA_ROOT / "users_data_YouthPage"

ADMIN_CRED_FILE = REPO_ROOT / "credentials" / "admin.txt"
MIGRATED_USERS_FILE = REPO_ROOT / "credentials" / "migrated_users.txt"

# The old chess.db's AgeGroup labels have no birth year attached. Season for this DB's
# tournaments (Oct 2025 - Apr 2026) is "2025/2026" -> seasonYear=2026 in our convention.
# Per user decision: impute the OLDER edge of each band so players roll up correctly
# next season rather than lingering an extra year.
SEASON_YEAR_FOR_IMPUTATION = 2026
AGE_GROUP_TO_AGE = {"U8": 8, "U10": 10, "U12": 12, "U14": 14, "U16": 16, "U18": 18}

ROLE_MAP = {"Admin": "Admin", "Trainer": "Organizer", "Mitglied": "Member"}


def api(method, path, token=None, body=None, raw_body=None, content_type="application/json"):
    # Shelling out to curl instead of urllib - this machine's Python has a broken
    # system CA trust chain (SSLCertVerificationError), while curl verifies fine.
    url = API + path
    data_bytes = None
    if raw_body is not None:
        data_bytes = raw_body.encode("utf-8") if isinstance(raw_body, str) else raw_body
    elif body is not None:
        data_bytes = json.dumps(body).encode("utf-8")
        content_type = "application/json"

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        if data_bytes is not None:
            tmp.write(data_bytes)
        tmp_path = tmp.name

    cmd = ["curl", "-s", "-w", "\n__STATUS__%{http_code}", "-X", method, url]
    if data_bytes is not None:
        cmd += ["--data-binary", f"@{tmp_path}", "-H", f"Content-Type: {content_type}"]
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]

    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    Path(tmp_path).unlink(missing_ok=True)

    output = result.stdout
    body_text, _, status_text = output.rpartition("__STATUS__")
    status = int(status_text.strip()) if status_text.strip() else 0
    try:
        parsed = json.loads(body_text) if body_text.strip() else {}
    except json.JSONDecodeError:
        parsed = {"error": body_text}
    return status, parsed


def read_admin_credentials():
    text = ADMIN_CRED_FILE.read_text(encoding="utf-8")
    username = re.search(r"Username:\s*(\S+)", text).group(1)
    password = re.search(r"Password:\s*(\S+)", text).group(1)
    return username, password


def login(username, password):
    status, res = api("POST", "/api/auth/login", body={"username": username, "password": password})
    if status != 200:
        raise SystemExit(f"Login failed ({status}): {res}")
    return res["token"]


def migrate_chess_db(token):
    print("\n=== Migrating chess.db (clubs, players, tournaments, results) ===")
    conn = sqlite3.connect(str(CHESS_DB))
    cur = conn.cursor()

    club_id_map = {}
    cur.execute("SELECT ClubId, Name FROM Clubs")
    for old_id, name in cur.fetchall():
        status, res = api("POST", "/api/clubs", token=token, body={"name": name})
        if status == 201:
            club_id_map[old_id] = res["id"]
        else:
            print(f"  ! club '{name}' failed ({status}): {res}")
    print(f"  clubs migrated: {len(club_id_map)}")

    player_id_map = {}
    cur.execute("SELECT PlayerId, Firstname, Lastname, Elo, Country, BirthYear, AgeGroup, ClubId FROM Players")
    imputed_count = 0
    for old_id, fn, ln, elo, country, birth_year, age_group, club_id in cur.fetchall():
        if birth_year is None and age_group in AGE_GROUP_TO_AGE:
            birth_year = SEASON_YEAR_FOR_IMPUTATION - AGE_GROUP_TO_AGE[age_group]
            imputed_count += 1
        body = {
            "firstname": fn,
            "lastname": ln,
            "elo": elo,
            "country": country,
            "birthYear": birth_year,
            "clubId": club_id_map.get(club_id),
        }
        status, res = api("POST", "/api/players", token=token, body=body)
        if status == 201:
            player_id_map[old_id] = res["id"]
        else:
            print(f"  ! player '{fn} {ln}' failed ({status}): {res}")
    print(f"  players migrated: {len(player_id_map)} (birth year imputed for {imputed_count})")

    tournament_id_map = {}
    cur.execute("SELECT TournamentId, Name, Date FROM Tournaments")
    for old_id, name, date in cur.fetchall():
        date_only = date.split(" ")[0]
        status, res = api("POST", "/api/tournaments", token=token, body={"name": name, "date": date_only, "format": "SchuelerLiga"})
        if status == 201:
            tournament_id_map[old_id] = res["id"]
        else:
            print(f"  ! tournament '{name}' failed ({status}): {res}")
    print(f"  tournaments migrated: {len(tournament_id_map)}")

    total_rows = 0
    for old_tid, new_tid in tournament_id_map.items():
        cur.execute(
            """
            SELECT p.Firstname, p.Lastname, p.Elo, p.Country, c.Name, pt.Rank, pt.Points
            FROM PlayerTournaments pt
            JOIN Players p ON p.PlayerId = pt.PlayerId
            LEFT JOIN Clubs c ON c.ClubId = p.ClubId
            WHERE pt.TournamentId = ?
            """,
            (old_tid,),
        )
        rows = cur.fetchall()
        lines = ["Name;Elo;Verein;Land;Rang;Punkte"]
        for fn, ln, elo, country, club, rank, points in rows:
            lines.append(f"{ln}, {fn};{elo or ''};{club or ''};{country or ''};{rank};{points}")
        csv_text = "\n".join(lines)
        status, res = api("POST", f"/api/tournaments/{new_tid}/import", token=token, raw_body=csv_text, content_type="text/csv")
        if status == 200:
            total_rows += res.get("rowsImported", 0)
        else:
            print(f"  ! import for tournament {new_tid} failed ({status}): {res}")
    print(f"  results imported: {total_rows}")

    conn.close()


def normalize_presence_date(d):
    if re.match(r"^\d{4}-\d{2}-\d{2}$", d):
        return d
    dd, mm, yyyy = d.split(".")
    return f"{yyyy}-{mm}-{dd}"


def migrate_youth_data(token):
    print("\n=== Migrating youth members + attendance ===")
    data = json.loads(YOUTH_JSON.read_text(encoding="utf-8"))

    member_id_map = {}
    for m in data["members"]:
        birthdate_iso = m["birthDate"].split("T")[0]
        status_str = "active" if m.get("youthStatus") == 1 else "inactive"
        body = {"firstname": m["MemberFirstName"], "lastname": m["MemberLastName"], "birthdate": birthdate_iso, "youthStatus": status_str}
        status, res = api("POST", "/api/youth", token=token, body=body)
        if status == 201:
            member_id_map[m["memberId"]] = res["id"]
        else:
            print(f"  ! member '{m['MemberFirstName']} {m['MemberLastName']}' failed ({status}): {res}")
    print(f"  members migrated: {len(member_id_map)}")

    presence_count = 0
    skipped = 0
    for p in data["presences"]:
        new_member_id = member_id_map.get(p["memberId"])
        if new_member_id is None:
            skipped += 1
            continue
        date_iso = normalize_presence_date(p["PresenceDate"])
        status, res = api("POST", "/api/attendance", token=token, body={"memberId": new_member_id, "date": date_iso, "present": True})
        if status == 200:
            presence_count += 1
        else:
            print(f"  ! presence for member {p['memberId']} on {p['PresenceDate']} failed ({status}): {res}")
    print(f"  presences migrated: {presence_count} (skipped {skipped} with unknown member id)")


def migrate_users(token, skip_username):
    print("\n=== Migrating user accounts (fresh passwords, old plaintext NOT reused) ===")
    users = json.loads(USERS_JSON.read_text(encoding="utf-8"))

    new_creds = []
    for u in users:
        if u["userName"] == skip_username:
            print(f"  skipping '{u['userName']}' (already created as the bootstrap Admin)")
            continue
        role = ROLE_MAP.get(u["role"], "Member")
        body = {"username": u["userName"], "email": u.get("email") or None, "role": role}
        status, res = api("POST", "/api/users", token=token, body=body)
        if status == 201:
            new_creds.append((u["userName"], res["generatedPassword"], role))
        else:
            print(f"  ! user '{u['userName']}' failed ({status}): {res}")

    MIGRATED_USERS_FILE.parent.mkdir(exist_ok=True)
    with open(MIGRATED_USERS_FILE, "w", encoding="utf-8") as f:
        f.write("Migrated accounts - new passwords generated fresh (old plaintext passwords were discarded):\n\n")
        for username, pw, role in new_creds:
            f.write(f"{username} ({role}): {pw}\n")
    print(f"  users migrated: {len(new_creds)} - passwords written to {MIGRATED_USERS_FILE}")


def main():
    username, password = read_admin_credentials()
    token = login(username, password)
    print(f"Logged in as {username}")

    migrate_chess_db(token)
    migrate_youth_data(token)
    migrate_users(token, skip_username=username)

    print("\nDone.")


if __name__ == "__main__":
    main()
