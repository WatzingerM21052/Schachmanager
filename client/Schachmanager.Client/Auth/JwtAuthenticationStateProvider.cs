using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Components.Authorization;
using Schachmanager.Client.Services;

namespace Schachmanager.Client.Auth;

/// <summary>
/// Decodes the JWT issued by the Worker into a ClaimsPrincipal for Blazor's
/// AuthorizeView/[Authorize] role-gating. The token's signature was already verified
/// server-side; this client-side decode is only for driving the UI, never a trust boundary.
/// </summary>
public class JwtAuthenticationStateProvider : AuthenticationStateProvider
{
    private readonly TokenStorage _tokenStorage;
    private static readonly AuthenticationState Anonymous = new(new ClaimsPrincipal(new ClaimsIdentity()));

    public JwtAuthenticationStateProvider(TokenStorage tokenStorage)
    {
        _tokenStorage = tokenStorage;
    }

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        await _tokenStorage.EnsureInitializedAsync();
        var token = _tokenStorage.Token;
        if (string.IsNullOrEmpty(token)) return Anonymous;

        try
        {
            var identity = new ClaimsIdentity(ParseClaimsFromJwt(token), "jwt");
            return new AuthenticationState(new ClaimsPrincipal(identity));
        }
        catch
        {
            return Anonymous;
        }
    }

    /// <summary>Call after login/logout to refresh AuthorizeView/[Authorize] immediately.</summary>
    public void NotifyChanged() => NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());

    private static IEnumerable<Claim> ParseClaimsFromJwt(string jwt)
    {
        var payloadSegment = jwt.Split('.')[1];
        var json = Convert.FromBase64String(PadBase64Url(payloadSegment));
        using var doc = JsonDocument.Parse(json);

        var claims = new List<Claim>();
        foreach (var prop in doc.RootElement.EnumerateObject())
        {
            if (prop.NameEquals("role"))
            {
                claims.Add(new Claim(ClaimTypes.Role, prop.Value.GetString() ?? ""));
            }
            else if (prop.NameEquals("username"))
            {
                claims.Add(new Claim(ClaimTypes.Name, prop.Value.GetString() ?? ""));
            }
            else
            {
                claims.Add(new Claim(prop.Name, prop.Value.ToString()));
            }
        }
        return claims;
    }

    private static string PadBase64Url(string base64Url)
    {
        var base64 = base64Url.Replace('-', '+').Replace('_', '/');
        return base64.PadRight(base64.Length + ((4 - (base64.Length % 4)) % 4), '=');
    }
}
