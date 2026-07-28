using System.Net.Http.Json;
using Schachmanager.Shared.Contracts;

namespace Schachmanager.Client.Services;

public class TournamentService
{
    private readonly HttpClient _http;
    public TournamentService(HttpClient http) => _http = http;

    public async Task<List<TournamentDto>> GetAllAsync() =>
        await _http.GetFromJsonAsync<List<TournamentDto>>("api/tournaments", ApiJson.Options) ?? new();

    public async Task<TournamentDto> CreateAsync(TournamentDto tournament)
    {
        var response = await _http.PostAsJsonAsync("api/tournaments", tournament, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<TournamentDto>(ApiJson.Options))!;
    }

    public async Task UpdateAsync(TournamentDto tournament)
    {
        var response = await _http.PutAsJsonAsync($"api/tournaments/{tournament.Id}", tournament, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var response = await _http.DeleteAsync($"api/tournaments/{id}");
        await response.EnsureApiSuccessAsync();
    }

    public async Task<List<StandingRowDto>> GetStandingsAsync(int tournamentId) =>
        await _http.GetFromJsonAsync<List<StandingRowDto>>($"api/tournaments/{tournamentId}/standings", ApiJson.Options) ?? new();

    public async Task<List<StandingRowDto>> GetLeaderboardAsync(string format, string? season = null, bool bestOf4 = false, string? ageFilter = null, string? clubFilter = null)
    {
        var query = $"api/leaderboard?format={Uri.EscapeDataString(format)}&bestOf4={bestOf4}";
        if (!string.IsNullOrEmpty(season)) query += $"&season={Uri.EscapeDataString(season)}";
        if (!string.IsNullOrEmpty(ageFilter) && ageFilter != "Alle") query += $"&ageFilter={Uri.EscapeDataString(ageFilter)}";
        if (!string.IsNullOrEmpty(clubFilter) && clubFilter != "Alle") query += $"&clubFilter={Uri.EscapeDataString(clubFilter)}";
        return await _http.GetFromJsonAsync<List<StandingRowDto>>(query, ApiJson.Options) ?? new();
    }

    public async Task<ImportResultDto> ImportCsvAsync(int tournamentId, Stream csvStream, string fileName)
    {
        using var content = new MultipartFormDataContent();
        using var streamContent = new StreamContent(csvStream);
        content.Add(streamContent, "file", fileName);

        var response = await _http.PostAsync($"api/tournaments/{tournamentId}/import", content);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<ImportResultDto>(ApiJson.Options))!;
    }

    public async Task<List<TournamentResultDto>> GetResultsAsync(int tournamentId) =>
        await _http.GetFromJsonAsync<List<TournamentResultDto>>($"api/tournaments/{tournamentId}/results", ApiJson.Options) ?? new();

    public async Task<TournamentResultDto> CreateResultAsync(int tournamentId, CreateResultRequest request)
    {
        var response = await _http.PostAsJsonAsync($"api/tournaments/{tournamentId}/results", request, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<TournamentResultDto>(ApiJson.Options))!;
    }

    public async Task<TournamentResultDto> UpdateResultAsync(int tournamentId, int resultId, double points, int? rank)
    {
        var response = await _http.PutAsJsonAsync($"api/tournaments/{tournamentId}/results/{resultId}", new UpdateResultRequest { Points = points, Rank = rank }, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<TournamentResultDto>(ApiJson.Options))!;
    }

    public async Task DeleteResultAsync(int tournamentId, int resultId)
    {
        var response = await _http.DeleteAsync($"api/tournaments/{tournamentId}/results/{resultId}");
        await response.EnsureApiSuccessAsync();
    }
}
