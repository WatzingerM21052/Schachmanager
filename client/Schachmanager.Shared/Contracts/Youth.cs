namespace Schachmanager.Shared.Contracts;

public class YouthMemberDto
{
    public int Id { get; set; }
    public string Firstname { get; set; } = string.Empty;
    public string Lastname { get; set; } = string.Empty;
    public string Birthdate { get; set; } = string.Empty;
    public string YouthStatus { get; set; } = "active";
    public string? AgeGroup { get; set; }
}

public class AttendanceDto
{
    public int Id { get; set; }
    public int MemberId { get; set; }
    public string Date { get; set; } = string.Empty;
    public bool Present { get; set; }
}

public class RecordAttendanceRequest
{
    public int MemberId { get; set; }
    public string Date { get; set; } = string.Empty;
    public bool Present { get; set; }
}
