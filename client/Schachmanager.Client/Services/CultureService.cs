using System.Globalization;
using Microsoft.JSInterop;

namespace Schachmanager.Client.Services;

/// <summary>
/// Tracks the UI language (de/en), persists it in localStorage, and provides
/// culture-aware date formatting. This is a lightweight custom i18n layer rather than
/// full .resx/satellite-assembly localization - covers navigation, common actions, and
/// primary page headers; less critical microcopy stays German-only for now.
/// </summary>
public class CultureService
{
    private const string StorageKey = "sm_lang";
    private readonly IJSRuntime _js;
    private bool _initialized;

    public string Language { get; private set; } = "de";
    public event Action? OnChange;

    public CultureService(IJSRuntime js)
    {
        _js = js;
    }

    public async Task EnsureInitializedAsync()
    {
        if (_initialized) return;
        var stored = await _js.InvokeAsync<string?>("localStorage.getItem", StorageKey);
        if (stored is "de" or "en") Language = stored;
        _initialized = true;
    }

    public async Task SetLanguageAsync(string language)
    {
        Language = language is "en" ? "en" : "de";
        await _js.InvokeVoidAsync("localStorage.setItem", StorageKey, Language);
        OnChange?.Invoke();
    }

    public string T(string key) => Translations.Get(key, Language);

    /// <summary>German: dd.MM.yyyy, English: dd/MM/yyyy (day-first is used both ways here
    /// to stay unambiguous for a European audience - only the separator/labels change).</summary>
    public string FormatDate(DateOnly date) =>
        Language == "en" ? date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) : date.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);

    public string FormatDate(string isoDate) =>
        DateOnly.TryParse(isoDate, out var d) ? FormatDate(d) : isoDate;
}
