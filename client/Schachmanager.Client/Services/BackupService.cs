using System.Net.Http.Json;
using System.Text.Json;
using Schachmanager.Shared.Contracts;

namespace Schachmanager.Client.Services;

public class BackupService
{
    private readonly HttpClient _http;
    public BackupService(HttpClient http) => _http = http;

    /// <summary>Returns the raw JSON export text, ready to be downloaded as a file.</summary>
    public async Task<string> ExportAsJsonAsync()
    {
        var response = await _http.GetAsync("api/backup/export");
        await response.EnsureApiSuccessAsync();
        var raw = await response.Content.ReadFromJsonAsync<JsonElement>(ApiJson.Options);
        return JsonSerializer.Serialize(raw, new JsonSerializerOptions { WriteIndented = true });
    }

    /// <summary>DESTRUCTIVE - wipes and replaces club/tournament/youth data from the uploaded JSON.</summary>
    public async Task ImportFromJsonAsync(string json)
    {
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        var response = await _http.PostAsync("api/backup/import", content);
        await response.EnsureApiSuccessAsync();
    }

    public async Task<GoogleDriveBackupResponse> TriggerGoogleDriveBackupAsync()
    {
        var response = await _http.PostAsync("api/backup/drive", null);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<GoogleDriveBackupResponse>(ApiJson.Options))!;
    }
}
