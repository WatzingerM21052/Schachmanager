namespace Schachmanager.Client.Services;

/// <summary>
/// Covers navigation, common actions, and primary page headers/hero text. Not an
/// exhaustive translation of every label in the app (e.g. table column headers and
/// form field microcopy mostly stay German) - see CultureService for the reasoning.
/// Falls back to the German value (or the key itself) when a translation is missing.
/// </summary>
public static class Translations
{
    private static readonly Dictionary<string, (string De, string En)> Map = new()
    {
        // Navigation
        ["nav.home"] = ("Home", "Home"),
        ["nav.tournaments"] = ("Turniere", "Tournaments"),
        ["nav.players"] = ("Spieler", "Players"),
        ["nav.clubs"] = ("Vereine", "Clubs"),
        ["nav.standings"] = ("Auswertung", "Standings"),
        ["nav.tournamentsGroup"] = ("Turniere", "Tournaments"),
        ["nav.youth"] = ("Jugend", "Youth"),
        ["nav.attendance"] = ("Anwesenheit", "Attendance"),
        ["nav.statistics"] = ("Statistik", "Statistics"),
        ["nav.youthGroup"] = ("Jugend", "Youth"),
        ["nav.users"] = ("Benutzer", "Users"),
        ["nav.login"] = ("Login", "Login"),
        ["nav.logout"] = ("Logout", "Logout"),

        // Common actions
        ["action.save"] = ("Speichern", "Save"),
        ["action.cancel"] = ("Abbrechen", "Cancel"),
        ["action.edit"] = ("Bearbeiten", "Edit"),
        ["action.delete"] = ("Löschen", "Delete"),
        ["action.create"] = ("Anlegen", "Create"),
        ["action.new"] = ("Neu", "New"),

        // Home page
        ["home.title"] = ("Schachmanager", "Schachmanager"),
        ["home.subtitle"] = ("Dein digitales Zuhause für Turniere, Vereine und Jugendarbeit.", "Your digital home for tournaments, clubs, and youth programs."),
        ["home.cta.tournaments"] = ("Turniere ansehen", "View tournaments"),
        ["home.cta.standings"] = ("Auswertung", "Standings"),
        ["home.section.overview"] = ("Auf einen Blick", "At a glance"),
        ["home.section.leaderboard"] = ("Top 5 - Schülerliga Gesamtwertung", "Top 5 - Schülerliga Overall Standings"),
        ["home.stat.clubs"] = ("Vereine", "Clubs"),
        ["home.stat.players"] = ("Spieler", "Players"),
        ["home.stat.tournaments"] = ("Turniere", "Tournaments"),
        ["home.link.tournaments.title"] = ("Turnierverwaltung", "Tournament Management"),
        ["home.link.tournaments.desc"] = ("Turniere anlegen, Ergebnisse importieren, Tabellen einsehen.", "Create tournaments, import results, view standings."),
        ["home.link.youth.title"] = ("Jugendarbeit", "Youth Program"),
        ["home.link.youth.desc"] = ("Mitglieder, Anwesenheit und Trainingsstatistik.", "Members, attendance, and training statistics."),
        ["home.link.clubs.title"] = ("Vereine & Spieler", "Clubs & Players"),
        ["home.link.clubs.desc"] = ("Alle teilnehmenden Vereine und Spieler verwalten.", "Manage all participating clubs and players."),

        // Login/Setup
        ["login.title"] = ("Anmelden", "Sign in"),
        ["login.username"] = ("Benutzername", "Username"),
        ["login.password"] = ("Passwort", "Password"),
        ["login.submit"] = ("Anmelden", "Sign in"),
        ["setup.title"] = ("Ersteinrichtung", "Initial Setup"),
    };

    public static string Get(string key, string language)
    {
        if (!Map.TryGetValue(key, out var pair)) return key;
        return language == "en" ? pair.En : pair.De;
    }
}
