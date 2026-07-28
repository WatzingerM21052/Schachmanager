namespace Schachmanager.Shared.Contracts;

public static class TournamentFormats
{
    public const string SchuelerLiga = "SchuelerLiga";
    public const string Swiss = "Swiss";
    public const string RoundRobin = "RoundRobin";
    public const string TeamLeague = "TeamLeague";
    public const string Knockout = "Knockout";

    public static readonly string[] All = { SchuelerLiga, Swiss, RoundRobin, TeamLeague, Knockout };
}

public class ClubDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class PlayerDto
{
    public int Id { get; set; }
    public string Firstname { get; set; } = string.Empty;
    public string Lastname { get; set; } = string.Empty;
    public int? Elo { get; set; }
    public string? Country { get; set; }
    public int? BirthYear { get; set; }
    public int? ClubId { get; set; }
    public string? AgeGroup { get; set; }
}

public class TournamentDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Format { get; set; } = TournamentFormats.SchuelerLiga;
    public string? Season { get; set; }
    public string? Notes { get; set; }
}

public class StandingRowDto
{
    public int Rank { get; set; }
    public int? PlayerId { get; set; }
    public string? TeamName { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? ClubName { get; set; }
    public string? AgeGroup { get; set; }
    public double Points { get; set; }
    public int TournamentsPlayed { get; set; }
    public Dictionary<string, PerTournamentResultDto> PerTournament { get; set; } = new();
}

public class PerTournamentResultDto
{
    public double Points { get; set; }
    public int? Rank { get; set; }
}

public class ImportResultDto
{
    public bool Success { get; set; }
    public int RowsImported { get; set; }
    public int NewPlayers { get; set; }
    public int NewClubs { get; set; }
    public int Skipped { get; set; }
    public List<string> SkippedRows { get; set; } = new();
}

/// <summary>One raw, individually-editable TournamentResults row - as opposed to
/// StandingRowDto, which is a computed/ranked/aggregated view.</summary>
public class TournamentResultDto
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public int? PlayerId { get; set; }
    public string? TeamName { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? ClubName { get; set; }
    public string? AgeGroup { get; set; }
    public double Points { get; set; }
    public int? Rank { get; set; }
    public int? BoardNo { get; set; }
    public int? RoundNo { get; set; }
    public string? ResultCode { get; set; }
}

public class CreateResultRequest
{
    public int? PlayerId { get; set; }
    public string? Firstname { get; set; }
    public string? Lastname { get; set; }
    public string? ClubName { get; set; }
    public string? TeamName { get; set; }
    public double Points { get; set; }
    public int? Rank { get; set; }
}

public class UpdateResultRequest
{
    public double Points { get; set; }
    public int? Rank { get; set; }
}
