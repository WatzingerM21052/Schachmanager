namespace Schachmanager.Client.Services;

/// <summary>Mirrors the Worker's seasonLabelForDate (worker/src/formats/schuelerLiga.ts) so the
/// UI can list available seasons without a dedicated endpoint. Chess season starts in September.</summary>
public static class SeasonHelper
{
    public static string SeasonLabelForDate(DateOnly date)
    {
        return date.Month >= 9 ? $"{date.Year}/{date.Year + 1}" : $"{date.Year - 1}/{date.Year}";
    }

    public static string SeasonLabelForDate(string isoDate)
    {
        return DateOnly.TryParse(isoDate, out var date) ? SeasonLabelForDate(date) : "";
    }

    public static string CurrentSeason()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        return SeasonLabelForDate(today);
    }
}
