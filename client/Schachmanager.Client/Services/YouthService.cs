using System.Net.Http.Json;
using Schachmanager.Shared.Contracts;

namespace Schachmanager.Client.Services;

public class YouthService
{
    private readonly HttpClient _http;
    public YouthService(HttpClient http) => _http = http;

    public async Task<List<YouthMemberDto>> GetMembersAsync() =>
        await _http.GetFromJsonAsync<List<YouthMemberDto>>("api/youth", ApiJson.Options) ?? new();

    public async Task<YouthMemberDto> CreateMemberAsync(YouthMemberDto member)
    {
        var response = await _http.PostAsJsonAsync("api/youth", member, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<YouthMemberDto>(ApiJson.Options))!;
    }

    public async Task UpdateMemberAsync(YouthMemberDto member)
    {
        var response = await _http.PutAsJsonAsync($"api/youth/{member.Id}", member, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
    }

    public async Task DeleteMemberAsync(int id)
    {
        var response = await _http.DeleteAsync($"api/youth/{id}");
        await response.EnsureApiSuccessAsync();
    }

    public async Task<List<AttendanceDto>> GetAttendanceAsync(string? date = null)
    {
        var url = string.IsNullOrEmpty(date) ? "api/attendance" : $"api/attendance?date={Uri.EscapeDataString(date)}";
        return await _http.GetFromJsonAsync<List<AttendanceDto>>(url, ApiJson.Options) ?? new();
    }

    public async Task RecordAttendanceAsync(int memberId, string date, bool present)
    {
        var response = await _http.PostAsJsonAsync("api/attendance", new RecordAttendanceRequest { MemberId = memberId, Date = date, Present = present }, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
    }
}
