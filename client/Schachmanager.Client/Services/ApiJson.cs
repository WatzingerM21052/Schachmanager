using System.Text.Json;

namespace Schachmanager.Client.Services;

/// <summary>
/// Shared JSON options so client <-> Worker traffic consistently uses camelCase property
/// names on the wire, matching the TypeScript side (which never uses PascalCase).
/// </summary>
public static class ApiJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };
}
