using System.Net.Http.Headers;
using Schachmanager.Client.Services;

namespace Schachmanager.Client.Auth;

/// <summary>Attaches the stored JWT as a Bearer token to every outgoing API request.</summary>
public class AuthTokenHandler : DelegatingHandler
{
    private readonly TokenStorage _tokenStorage;

    public AuthTokenHandler(TokenStorage tokenStorage)
    {
        _tokenStorage = tokenStorage;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        await _tokenStorage.EnsureInitializedAsync();
        if (!string.IsNullOrEmpty(_tokenStorage.Token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _tokenStorage.Token);
        }
        return await base.SendAsync(request, cancellationToken);
    }
}
