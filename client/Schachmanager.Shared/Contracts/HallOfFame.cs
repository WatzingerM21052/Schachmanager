namespace Schachmanager.Shared.Contracts;

public class HallOfFameResponse
{
    public int TotalPlayers { get; set; }
    public int TotalTournaments { get; set; }
    public int TotalClubs { get; set; }
    public List<PlayerStatDto> TopByPoints { get; set; } = new();
    public List<PlayerStatDto> TopByGames { get; set; } = new();
    public List<ClubStatDto> TopClubs { get; set; } = new();
}

public class PlayerStatDto
{
    public string Firstname { get; set; } = string.Empty;
    public string Lastname { get; set; } = string.Empty;
    public string ClubName { get; set; } = string.Empty;
    public double TotalPoints { get; set; }
    public int TotalGames { get; set; }
}

public class ClubStatDto
{
    public string Name { get; set; } = string.Empty;
    public int PlayerCount { get; set; }
}
