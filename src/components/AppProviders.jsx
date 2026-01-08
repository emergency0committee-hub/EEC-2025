import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { supabase } from "../lib/supabase.js";

const ThemeContext = React.createContext({ theme: "light", setTheme: () => {} });
const WeatherContext = React.createContext({
  weather: null,
  status: "idle",
  error: "",
  refresh: () => {},
});
const AppSettingsContext = React.createContext({
  animationsEnabled: true,
  setAnimationsEnabled: async () => {},
  settingsLoading: false,
  settingsSaving: false,
  settingsError: "",
  refreshSettings: async () => {},
});

const THEME_KEY = "cg_theme";
const LEGACY_THEME_KEY = "cg_home_theme";
const SETTINGS_TABLE = "cg_site_settings";
const ANIMATIONS_KEY = "animations_enabled";

export function useTheme() {
  return React.useContext(ThemeContext);
}

export function useWeather() {
  return React.useContext(WeatherContext);
}

export function useAppSettings() {
  return React.useContext(AppSettingsContext);
}

export function AppProviders({ children }) {
  AppProviders.propTypes = {
    children: PropTypes.node.isRequired,
  };

  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
      return stored === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [animationsEnabled, setAnimationsEnabledState] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const nonEnglishPattern = /[^\x09\x0A\x0D\x20-\x7E]/;
    let toastTimer = null;
    let toastEl = null;

    const ensureToast = () => {
      if (toastEl) return toastEl;
      const el = document.createElement("div");
      el.id = "english-only-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      Object.assign(el.style, {
        position: "fixed",
        left: "50%",
        bottom: "22px",
        transform: "translate(-50%, 12px)",
        background: "rgba(15, 23, 42, 0.92)",
        color: "#f8fafc",
        padding: "8px 14px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "600",
        letterSpacing: "0.2px",
        zIndex: "9999",
        opacity: "0",
        transition: "opacity 160ms ease, transform 160ms ease",
        pointerEvents: "none",
      });
      el.textContent = "English input only.";
      document.body.appendChild(el);
      toastEl = el;
      return el;
    };

    const showToast = () => {
      const el = ensureToast();
      el.textContent = "English input only.";
      el.style.opacity = "1";
      el.style.transform = "translate(-50%, 0)";
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        if (!toastEl) return;
        toastEl.style.opacity = "0";
        toastEl.style.transform = "translate(-50%, 12px)";
      }, 1800);
    };

    const isTextTarget = (target) => {
      if (!target || !(target instanceof Element)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      if (tag === "TEXTAREA") return true;
      if (tag !== "INPUT") return false;
      const type = (target.getAttribute("type") || "text").toLowerCase();
      if (["button", "submit", "checkbox", "radio", "range", "file", "color"].includes(type)) return false;
      return true;
    };

    const allowNonEnglish = (target) => {
      if (document.documentElement?.dataset?.allowNonEnglish === "true") return true;
      return Boolean(target?.closest?.('[data-allow-non-english="true"]'));
    };

    const handleBeforeInput = (event) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (!isTextTarget(target)) return;
      if (allowNonEnglish(target)) return;
      const text = event.data;
      if (!text) return;
      if (nonEnglishPattern.test(text)) {
        event.preventDefault();
        showToast();
      }
    };

    const handlePaste = (event) => {
      const target = event.target;
      if (!isTextTarget(target)) return;
      if (allowNonEnglish(target)) return;
      const text = event.clipboardData?.getData?.("text") || "";
      if (!text) return;
      if (nonEnglishPattern.test(text)) {
        event.preventDefault();
        showToast();
      }
    };

    document.addEventListener("beforeinput", handleBeforeInput, true);
    document.addEventListener("paste", handlePaste, true);
    return () => {
      document.removeEventListener("beforeinput", handleBeforeInput, true);
      document.removeEventListener("paste", handlePaste, true);
      if (toastTimer) clearTimeout(toastTimer);
      if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem(LEGACY_THEME_KEY, theme);
      document.documentElement.dataset.theme = theme;
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      document.documentElement.dataset.animations = animationsEnabled ? "on" : "off";
    } catch {}
  }, [animationsEnabled]);

  const refreshSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError("");
    try {
      const { data, error: fetchError } = await supabase
        .from(SETTINGS_TABLE)
        .select("value")
        .eq("key", ANIMATIONS_KEY)
        .maybeSingle();
      if (fetchError) throw fetchError;
      const value = data?.value;
      setAnimationsEnabledState(value == null ? true : Boolean(value));
    } catch (err) {
      console.error("settings load", err);
      setSettingsError(err?.message || "Unable to load settings.");
      setAnimationsEnabledState(true);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setStatus("unsupported");
      setError("Location not supported.");
      return;
    }
    setStatus("loading");
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url =
            "https://api.open-meteo.com/v1/forecast" +
            `?latitude=${latitude}` +
            `&longitude=${longitude}` +
            "&current=temperature_2m,weather_code,wind_speed_10m" +
            "&timezone=auto";
          const res = await fetch(url);
          if (!res.ok) throw new Error("Weather unavailable.");
          const data = await res.json();
          const current = data.current || data.current_weather;
          if (!current) throw new Error("Weather unavailable.");
          const temperature = current.temperature_2m ?? current.temperature;
          const code = current.weather_code ?? current.weathercode;
          const wind = current.wind_speed_10m ?? current.windspeed;
          setWeather({
            temperature,
            code,
            wind,
            coords: { lat: latitude, lon: longitude },
          });
          setStatus("ready");
        } catch (err) {
          setStatus("error");
          setError(err?.message || "Weather unavailable.");
        }
      },
      (err) => {
        if (err?.code === 1) {
          setStatus("denied");
          setError("Location permission blocked.");
        } else {
          setStatus("error");
          setError("Unable to access location.");
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const setAnimationsEnabled = useCallback(
    async (nextValue) => {
      const resolved = Boolean(nextValue);
      const prev = animationsEnabled;
      setAnimationsEnabledState(resolved);
      setSettingsSaving(true);
      setSettingsError("");
      try {
        const { error: saveError } = await supabase
          .from(SETTINGS_TABLE)
          .upsert({ key: ANIMATIONS_KEY, value: resolved }, { onConflict: "key" });
        if (saveError) throw saveError;
      } catch (err) {
        console.error("settings save", err);
        setAnimationsEnabledState(prev);
        setSettingsError(err?.message || "Unable to save settings.");
      } finally {
        setSettingsSaving(false);
      }
    },
    [animationsEnabled]
  );

  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  const weatherValue = useMemo(
    () => ({ weather, status, error, refresh }),
    [weather, status, error, refresh]
  );
  const settingsValue = useMemo(
    () => ({
      animationsEnabled,
      setAnimationsEnabled,
      settingsLoading,
      settingsSaving,
      settingsError,
      refreshSettings,
    }),
    [animationsEnabled, setAnimationsEnabled, settingsLoading, settingsSaving, settingsError, refreshSettings]
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <WeatherContext.Provider value={weatherValue}>
        <AppSettingsContext.Provider value={settingsValue}>{children}</AppSettingsContext.Provider>
      </WeatherContext.Provider>
    </ThemeContext.Provider>
  );
}
