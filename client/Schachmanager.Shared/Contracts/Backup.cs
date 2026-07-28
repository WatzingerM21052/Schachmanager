namespace Schachmanager.Shared.Contracts;

public class MergePlayersRequest
{
    public int SurvivorId { get; set; }
    public List<int> VictimIds { get; set; } = new();
    public string? Firstname { get; set; }
    public string? Lastname { get; set; }
}

public class MergePlayersResponse
{
    public PlayerDto Player { get; set; } = new();
    public int MergedResults { get; set; }
    public int DeletedPlayers { get; set; }
}

public class GoogleDriveBackupResponse
{
    public bool Success { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileId { get; set; } = string.Empty;
}
