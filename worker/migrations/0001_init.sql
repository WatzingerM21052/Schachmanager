-- Initial schema for Schachmanager (D1 / SQLite dialect)

CREATE TABLE Users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT NOT NULL UNIQUE,
  email          TEXT,
  password_hash  TEXT NOT NULL,
  password_salt  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('Admin', 'Organizer', 'Member')),
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_login     TEXT
);

CREATE TABLE Clubs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE Players (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  firstname  TEXT NOT NULL,
  lastname   TEXT NOT NULL,
  elo        INTEGER,
  country    TEXT,
  birth_year INTEGER,
  club_id    INTEGER REFERENCES Clubs(id) ON DELETE SET NULL
);

CREATE TABLE Tournaments (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT NOT NULL,
  date   TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('SchuelerLiga', 'Swiss', 'RoundRobin', 'TeamLeague', 'Knockout')),
  season TEXT,
  notes  TEXT
);

-- One generalized results table for both individual and team-based formats.
-- player_id is used for individual results; team_name for team-based results.
-- round_no/board_no/opponent_player_id/result_code are only populated for
-- formats that carry round-by-round pairing data (Swiss/RoundRobin/Knockout).
CREATE TABLE TournamentResults (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id       INTEGER NOT NULL REFERENCES Tournaments(id) ON DELETE CASCADE,
  player_id           INTEGER REFERENCES Players(id) ON DELETE CASCADE,
  team_name           TEXT,
  points              REAL NOT NULL DEFAULT 0,
  rank                INTEGER,
  board_no            INTEGER,
  opponent_player_id  INTEGER REFERENCES Players(id) ON DELETE SET NULL,
  round_no            INTEGER,
  result_code         TEXT,
  UNIQUE (tournament_id, player_id, round_no)
);

CREATE TABLE YouthMembers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  firstname    TEXT NOT NULL,
  lastname     TEXT NOT NULL,
  birthdate    TEXT NOT NULL,
  youth_status TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE Attendance (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES YouthMembers(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  present   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (member_id, date)
);

CREATE TABLE AuditLog (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES Users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  target_type   TEXT NOT NULL,
  target_id     TEXT,
  details       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_players_club ON Players(club_id);
CREATE INDEX idx_results_tournament ON TournamentResults(tournament_id);
CREATE INDEX idx_results_player ON TournamentResults(player_id);
CREATE INDEX idx_attendance_member ON Attendance(member_id);
