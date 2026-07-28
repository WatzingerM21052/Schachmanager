using Microsoft.JSInterop;

namespace Schachmanager.Client.Services;

/// <summary>
/// Holds the current JWT in memory and mirrors it to localStorage so login survives a
/// page reload (the old SvHofkirchen app kept auth state in memory only, which lost the
/// session on every refresh - this fixes that).
/// </summary>
public class TokenStorage
{
    private const string StorageKey = "sm_token";
    private readonly IJSRuntime _js;
    private bool _initialized;

    public string? Token { get; private set; }

    public TokenStorage(IJSRuntime js)
    {
        _js = js;
    }

    public async Task EnsureInitializedAsync()
    {
        if (_initialized) return;
        Token = await _js.InvokeAsync<string?>("localStorage.getItem", StorageKey);
        _initialized = true;
    }

    public async Task SetTokenAsync(string? token)
    {
        Token = token;
        _initialized = true;
        if (string.IsNullOrEmpty(token))
        {
            await _js.InvokeVoidAsync("localStorage.removeItem", StorageKey);
        }
        else
        {
            await _js.InvokeVoidAsync("localStorage.setItem", StorageKey, token);
        }
    }
}
