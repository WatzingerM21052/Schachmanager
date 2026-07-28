using System.Net.Http.Json;
using Schachmanager.Shared.Contracts;

namespace Schachmanager.Client.Services;

public class ApiException : Exception
{
    public ApiException(string message) : base(message) { }
}

public static class HttpResponseExtensions
{
    /// <summary>Throws an ApiException with the server's error message if the response wasn't successful.</summary>
    public static async Task EnsureApiSuccessAsync(this HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode) return;

        string message = $"Request failed ({(int)response.StatusCode})";
        try
        {
            var body = await response.Content.ReadFromJsonAsync<ApiErrorResponse>(ApiJson.Options);
            if (!string.IsNullOrWhiteSpace(body?.Error)) message = body!.Error;
        }
        catch { /* body wasn't JSON - keep the generic message */ }

        throw new ApiException(message);
    }
}
