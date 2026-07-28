using System.Net.Http.Json;
using Schachmanager.Client.Auth;
using Schachmanager.Shared.Contracts;

namespace Schachmanager.Client.Services;

public class AuthService
{
    private readonly HttpClient _http;
    private readonly TokenStorage _tokenStorage;
    private readonly JwtAuthenticationStateProvider _authStateProvider;

    public AuthService(HttpClient http, TokenStorage tokenStorage, JwtAuthenticationStateProvider authStateProvider)
    {
        _http = http;
        _tokenStorage = tokenStorage;
        _authStateProvider = authStateProvider;
    }

    public async Task<UserDto> LoginAsync(string username, string password)
    {
        var response = await _http.PostAsJsonAsync("api/auth/login", new LoginRequest { Username = username, Password = password }, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>(ApiJson.Options)
            ?? throw new ApiException("Empty response from server");

        await _tokenStorage.SetTokenAsync(result.Token);
        _authStateProvider.NotifyChanged();
        return result.User;
    }

    /// <summary>One-time setup: creates the first Admin account. Only works while no users exist yet.</summary>
    public async Task<UserDto> BootstrapAdminAsync(string username, string password, string? email)
    {
        var response = await _http.PostAsJsonAsync("api/auth/bootstrap-admin", new { username, password, email }, ApiJson.Options);
        await response.EnsureApiSuccessAsync();
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>(ApiJson.Options)
            ?? throw new ApiException("Empty response from server");

        await _tokenStorage.SetTokenAsync(result.Token);
        _authStateProvider.NotifyChanged();
        return result.User;
    }

    public async Task LogoutAsync()
    {
        await _tokenStorage.SetTokenAsync(null);
        _authStateProvider.NotifyChanged();
    }
}
