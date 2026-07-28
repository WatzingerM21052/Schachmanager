using System.Net.Http.Json;
using Schachmanager.Shared.Contracts;

namespace Schachmanager.Client.Services;

public class HallOfFameService
{
    private readonly HttpClient _http;
    public HallOfFameService(HttpClient http) => _http = http;

    public async Task<HallOfFameResponse> GetAsync() =>
        await _http.GetFromJsonAsync<HallOfFameResponse>("api/hall-of-fame", ApiJson.Options) ?? new();
}
