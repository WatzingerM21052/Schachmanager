using System.Net.Http.Json;
using Schachmanager.Shared.Contracts;

namespace Schachmanager.Client.Services;

public class ClubService
{
    private readonly HttpClient _http;
    public ClubService(HttpClient http) => _http = http;

    public async Task<List<ClubDto>> GetAllAsync() =>
        await _http.GetFromJsonAsync<List<ClubDto>>("api/clubs", ApiJson.Options) ?? new();

    public async Task<ClubDto> CreateAsync(string name)
    {
        var response = await _http.PostAsJsonAsync("api/clubs", new { name }, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<ClubDto>(ApiJson.Options))!;
    }

    public async Task UpdateAsync(int id, string name)
    {
        var response = await _http.PutAsJsonAsync($"api/clubs/{id}", new { name }, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var response = await _http.DeleteAsync($"api/clubs/{id}");
        await response.EnsureApiSuccessAsync();
    }
}
