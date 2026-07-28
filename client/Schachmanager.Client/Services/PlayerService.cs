using System.Net.Http.Json;
using Schachmanager.Shared.Contracts;

namespace Schachmanager.Client.Services;

public class PlayerService
{
    private readonly HttpClient _http;
    public PlayerService(HttpClient http) => _http = http;

    public async Task<List<PlayerDto>> GetAllAsync() =>
        await _http.GetFromJsonAsync<List<PlayerDto>>("api/players", ApiJson.Options) ?? new();

    public async Task<PlayerDto> CreateAsync(PlayerDto player)
    {
        var response = await _http.PostAsJsonAsync("api/players", player, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<PlayerDto>(ApiJson.Options))!;
    }

    public async Task UpdateAsync(PlayerDto player)
    {
        var response = await _http.PutAsJsonAsync($"api/players/{player.Id}", player, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var response = await _http.DeleteAsync($"api/players/{id}");
        await response.EnsureApiSuccessAsync();
    }

    public async Task<MergePlayersResponse> MergeAsync(int survivorId, List<int> victimIds, string? firstname = null, string? lastname = null)
    {
        var body = new MergePlayersRequest { SurvivorId = survivorId, VictimIds = victimIds, Firstname = firstname, Lastname = lastname };
        var response = await _http.PostAsJsonAsync("api/players/merge", body, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<MergePlayersResponse>(ApiJson.Options))!;
    }
}
