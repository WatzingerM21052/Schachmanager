namespace Schachmanager.Client.Services;

/// <summary>Consistent color-coding for age-group badges across all pages that show them
/// (Auswertung, TournamentStandings, Spieler, Youth) - mirrors the color scheme SvHofkirchen
/// used for its member categories (categoryColor).</summary>
public static class AgeGroupBadge
{
    public static string CssClass(string? ageGroup) => ageGroup switch
    {
        "U8" => "bg-success",
        "U10" => "bg-info text-dark",
        "U12" => "bg-primary",
        "U14" => "bg-warning text-dark",
        "U16" => "bg-danger",
        "U18" => "bg-dark",
        "U20" => "bg-secondary",
        "Ü20" => "bg-secondary",
        _ => "bg-secondary",
    };
}
