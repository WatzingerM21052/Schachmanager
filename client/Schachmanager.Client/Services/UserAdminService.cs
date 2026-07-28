using System.Net.Http.Json;
using Schachmanager.Shared.Contracts;

namespace Schachmanager.Client.Services;

/// <summary>Admin-only per-user CRUD. Replaces the old "fetch whole list, mutate, POST whole list
/// back" pattern that kept plaintext passwords in circulation - every call here is a real
/// per-resource REST request and passwords are only ever returned once, right after (re)set.</summary>
public class UserAdminService
{
    private readonly HttpClient _http;
    public UserAdminService(HttpClient http) => _http = http;

    public async Task<List<UserDto>> GetAllAsync() =>
        await _http.GetFromJsonAsync<List<UserDto>>("api/users", ApiJson.Options) ?? new();

    public async Task<CreateUserResponse> CreateAsync(string username, string? email, string role)
    {
        var response = await _http.PostAsJsonAsync("api/users", new CreateUserRequest { Username = username, Email = email, Role = role }, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        return (await response.Content.ReadFromJsonAsync<CreateUserResponse>(ApiJson.Options))!;
    }

    public async Task UpdateAsync(int id, UpdateUserRequest update)
    {
        var response = await _http.PutAsJsonAsync($"api/users/{id}", update, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
    }

    public async Task<string> ResetPasswordAsync(int id)
    {
        var response = await _http.PostAsync($"api/users/{id}/reset-password", null);
        await response.EnsureApiSuccessAsync();
        var result = await response.Content.ReadFromJsonAsync<ResetPasswordResponse>(ApiJson.Options);
        return result?.GeneratedPassword ?? "";
    }

    public async Task DeleteAsync(int id)
    {
        var response = await _http.DeleteAsync($"api/users/{id}");
        await response.EnsureApiSuccessAsync();
    }
}
