import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useTheme, useWeather } from "./AppProviders.jsx";

const KEYFRAME_ID = "__hb_slide_keyframes__";
const THEME_KEYFRAME_ID = "__app_theme_keyframes__";
const SNOWFLAKE_SVG = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(235,248,255,0.95)' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M12 2v20M4 6l16 12M4 18l16-12M5 12h14M7 4l10 16M7 20l10-16'/></svg>"
);
const CLOUD_SVG = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 120' fill='none'><path d='M52 96h124c26 0 48-19 48-42 0-20-16-36-36-40C185 5 167-4 146 4c-14 6-24 18-27 33-6-5-14-8-23-8-21 0-38 15-41 35C32 67 18 79 18 94c0 18 15 32 34 32Z' fill='rgba(255,255,255,0.75)'/></svg>"
);
const SNOWFLAKE_SOFT_SVG = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(215,230,250,0.7)' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><path d='M12 2v20M4 6l16 12M4 18l16-12M5 12h14M7 4l10 16M7 20l10-16'/></svg>"
);
const SNOWFLAKE_URL = `url("data:image/svg+xml;utf8,${SNOWFLAKE_SVG}")`;
const SNOWFLAKE_SOFT_URL = `url("data:image/svg+xml;utf8,${SNOWFLAKE_SOFT_SVG}")`;
const CLOUD_URL = `url("data:image/svg+xml;utf8,${CLOUD_SVG}")`;
const DEFAULT_COORDS = { lat: 34.44532, lon: 35.82705 };
const CELESTIAL_SIZE = 72;
const FALLBACK_SUN_TIMES = { sunrise: 360, sunset: 1080 };

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;
const normalizeAngle = (deg) => ((deg % 360) + 360) % 360;
const clampProgress = (value) => Math.max(0, Math.min(1, value));
const getDayOfYear = (date) => {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today - start) / 86400000);
};

const normalizeSunTimes = (times) => {
  if (!times || typeof times.sunrise !== "number" || typeof times.sunset !== "number") {
    return FALLBACK_SUN_TIMES;
  }
  if (Number.isNaN(times.sunrise) || Number.isNaN(times.sunset) || times.sunset <= times.sunrise) {
    return FALLBACK_SUN_TIMES;
  }
  return times;
};

const getSunTimes = (date, lat, lon) => {
  const zenith = 90.833;
  const day = getDayOfYear(date);
  const lngHour = lon / 15;

  const calcTime = (isSunrise) => {
    const t = day + ((isSunrise ? 6 : 18) - lngHour) / 24;
    const M = (0.9856 * t) - 3.289;
    let L =
      M +
      1.916 * Math.sin(toRad(M)) +
      0.020 * Math.sin(toRad(2 * M)) +
      282.634;
    L = normalizeAngle(L);

    let RA = toDeg(Math.atan(0.91764 * Math.tan(toRad(L))));
    RA = normalizeAngle(RA);
    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = (RA + (Lquadrant - RAquadrant)) / 15;

    const sinDec = 0.39782 * Math.sin(toRad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH =
      (Math.cos(toRad(zenith)) - (sinDec * Math.sin(toRad(lat)))) /
      (cosDec * Math.cos(toRad(lat)));

    if (cosH > 1 || cosH < -1) {
      return null;
    }

    let H = isSunrise ? 360 - toDeg(Math.acos(cosH)) : toDeg(Math.acos(cosH));
    H /= 15;

    const T = H + RA - (0.06571 * t) - 6.622;
    let UT = T - lngHour;
    UT = (UT + 24) % 24;

    const minutesUtc = UT * 60;
    const tzOffset = date.getTimezoneOffset();
    let minutesLocal = minutesUtc - tzOffset;
    minutesLocal = (minutesLocal + 1440) % 1440;
    return minutesLocal;
  };

  const sunrise = calcTime(true);
  const sunset = calcTime(false);
  if (sunrise === null || sunset === null) {
    return null;
  }
  return { sunrise, sunset };
};

export function PageWrap({ children, style = {}, className = "", snow = true, clouds }) {
  PageWrap.propTypes = {
    children: PropTypes.node.isRequired,
    style: PropTypes.object,
    className: PropTypes.string,
    snow: PropTypes.bool,
    clouds: PropTypes.bool,
  };
  const { theme } = useTheme();
  const { weather, status } = useWeather();
  const isDark = theme === "dark";
  const pageText = isDark ? "#e2e8f0" : "#111827";
  const pageMuted = isDark ? "#cbd5f5" : "#6b7280";
  const themeStyle = isDark
    ? {
        backgroundColor: "#0b1220",
        backgroundImage:
          "radial-gradient(1200px 700px at 5% 15%, rgba(56, 189, 248, 0.12), transparent 64%)," +
          "radial-gradient(1000px 600px at 95% 10%, rgba(34, 197, 94, 0.12), transparent 64%)," +
          "radial-gradient(1100px 700px at 50% 95%, rgba(59, 130, 246, 0.1), transparent 64%)," +
          "radial-gradient(800px 500px at 70% 50%, rgba(14, 116, 144, 0.12), transparent 70%)," +
          "linear-gradient(135deg, #0b1220 0%, #0f172a 55%, #111827 100%)",
        backgroundBlendMode: "screen, screen, screen, screen, normal",
      }
    : {};
  const showSnow = snow !== false;
  const autoClouds =
    status === "ready" && weather && typeof weather.code === "number" ? weather.code !== 0 : false;
  const showClouds = typeof clouds === "boolean" ? clouds : autoClouds;
  const coords = weather?.coords || DEFAULT_COORDS;
  const [now, setNow] = useState(() => new Date());
  const [celestialDrag, setCelestialDrag] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = React.useRef({ startX: 0, startProgress: 0, width: 1 });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sunTimes = useMemo(() => {
    const baseDate = new Date(now);
    baseDate.setHours(12, 0, 0, 0);
    const prevDate = new Date(baseDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + 1);
    return {
      current: normalizeSunTimes(getSunTimes(baseDate, coords.lat, coords.lon)),
      prev: normalizeSunTimes(getSunTimes(prevDate, coords.lat, coords.lon)),
      next: normalizeSunTimes(getSunTimes(nextDate, coords.lat, coords.lon)),
    };
  }, [now.getFullYear(), now.getMonth(), now.getDate(), coords.lat, coords.lon]);

  const nowMinutes = useMemo(
    () => now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60,
    [now]
  );
  const sunrise = sunTimes.current.sunrise;
  const sunset = sunTimes.current.sunset;
  const dayLength = Math.max(1, sunset - sunrise);
  const sunProgress = clampProgress((nowMinutes - sunrise) / dayLength);
  const prevSunset = sunTimes.prev.sunset - 1440;
  const nextSunrise = sunTimes.next.sunrise + 1440;
  let nightProgress = 0;
  if (nowMinutes < sunrise) {
    const nightLength = Math.max(1, sunrise - prevSunset);
    nightProgress = clampProgress((nowMinutes - prevSunset) / nightLength);
  } else if (nowMinutes >= sunset) {
    const nightLength = Math.max(1, nextSunrise - sunset);
    nightProgress = clampProgress((nowMinutes - sunset) / nightLength);
  }

  const isDaytime = nowMinutes >= sunrise && nowMinutes < sunset;
  const showSun = theme !== "dark" && isDaytime;
  const showMoon = theme === "dark" && !isDaytime;
  const baseProgress = showSun ? sunProgress : showMoon ? nightProgress : sunProgress;
  const arcProgress = clampProgress(
    typeof celestialDrag === "number" ? celestialDrag : baseProgress
  );
  const moonArc = useMemo(() => {
    const progress = arcProgress;
    const left = 5 + progress * 90;
    const arcAmplitude = 26;
    const arcBase = 12;
    const top = arcBase + (1 - Math.sin(Math.PI * progress)) * arcAmplitude;
    return { left, top };
  }, [arcProgress]);
  const celestialVars = useMemo(() => {
    const active = showSun || showMoon;
    const rayColor = active
      ? showSun
        ? "rgba(251, 191, 36, 0.22)"
        : "rgba(148, 197, 255, 0.2)"
      : "rgba(0, 0, 0, 0)";
    const glowColor = active
      ? showSun
        ? "rgba(253, 230, 138, 0.32)"
        : "rgba(186, 215, 255, 0.28)"
      : "rgba(0, 0, 0, 0)";
    const hazeColor = active
      ? showSun
        ? "rgba(253, 230, 138, 0.14)"
        : "rgba(186, 215, 255, 0.14)"
      : "rgba(0, 0, 0, 0)";
    return {
      "--celestial-on": active ? 1 : 0,
      "--celestial-x": `${moonArc.left}%`,
      "--celestial-y": `calc(${moonArc.top}px + ${CELESTIAL_SIZE / 2}px)`,
      "--celestial-ray": rayColor,
      "--celestial-glow": glowColor,
      "--celestial-haze": hazeColor,
    };
  }, [showSun, showMoon, moonArc.left, moonArc.top]);

  const handleCelestialDown = (event) => {
    event.preventDefault();
    setIsDragging(true);
    const width = typeof window !== "undefined" ? window.innerWidth || 1 : 1;
    dragRef.current = {
      startX: event.clientX,
      startProgress: baseProgress,
      width,
    };
    setCelestialDrag(baseProgress);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleCelestialMove = (event) => {
    if (!isDragging) return;
    const { startX, startProgress, width } = dragRef.current;
    const delta = (event.clientX - startX) / Math.max(width, 1);
    setCelestialDrag(clampProgress(startProgress + delta));
  };
  const handleCelestialUp = (event) => {
    if (!isDragging) return;
    setIsDragging(false);
    setCelestialDrag(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const celestialBaseStyle = {
    position: "fixed",
    top: `${moonArc.top}px`,
    left: `${moonArc.left}%`,
    transform: "translate(-50%, 0)",
    opacity: showSun ? 0.85 : 0.7,
    zIndex: 0,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
    pointerEvents: "auto",
    userSelect: "none",
  };
  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleContent = `
@property --celestial-x {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 50%;
}
@property --celestial-y {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}
@keyframes appBgShift {
  0% { background-position: 0% 0%, 100% 0%, 50% 100%, 80% 40%, 0 0; }
  50% { background-position: 100% 70%, 0% 80%, 40% 20%, 10% 60%, 0 0; }
  100% { background-position: 0% 0%, 100% 0%, 50% 100%, 80% 40%, 0 0; }
}
@keyframes appCardSheen {
  0% { background-position: 0 0, -120% 0; }
  100% { background-position: 0 0, 120% 0; }
}
@keyframes appCloudDrift {
  0% { transform: translate3d(var(--cloud-start, -30vw), 0, 0); }
  100% { transform: translate3d(var(--cloud-end, 130vw), 0, 0); }
}
@keyframes appSnowflakeFall {
  0% { transform: translate3d(0, -15vh, 0) rotate(0deg); }
  100% { transform: translate3d(var(--drift), 110vh, 0) rotate(var(--spin)); }
}
`;
    const existing = document.getElementById(THEME_KEYFRAME_ID);
    if (existing) {
      existing.textContent = styleContent;
      return;
    }
    const styleEl = document.createElement("style");
    styleEl.id = THEME_KEYFRAME_ID;
    styleEl.textContent = styleContent;
    document.head.appendChild(styleEl);
  }, []);
  const snowflakes = useMemo(() => {
    if (!showSnow) return [];
    const width = typeof window !== "undefined" ? window.innerWidth : 1200;
    const count = Math.max(34, Math.min(72, Math.round(width / 36)));
    return Array.from({ length: count }, (_, index) => {
      const size = 10 + Math.random() * 8;
      const left = Math.random() * 100;
      const drift = -(60 + Math.random() * 140);
      const duration = 7 + Math.random() * 6;
      const delay = -(Math.random() * duration);
      const opacity = 0.4 + Math.random() * 0.5;
      const spin = (Math.random() * 2 - 1) * 200;
      const soft = Math.random() < 0.5;
      return {
        id: `flake-${index}`,
        size,
        left,
        drift,
        duration,
        delay,
        opacity,
        spin,
        depth: 1,
        soft,
      };
    });
  }, [showSnow]);
  const cloudLayers = useMemo(() => {
    if (!showClouds) return [];
    const width = typeof window !== "undefined" ? window.innerWidth : 1200;
    const count = Math.max(4, Math.min(7, Math.round(width / 320)));
    return Array.from({ length: count }, (_, index) => {
      const scale = 0.6 + Math.random() * 0.9;
      const top = 6 + Math.random() * 28;
      const duration = 60 + Math.random() * 60;
      const delay = -(Math.random() * duration);
      const opacity = 0.12 + Math.random() * 0.18;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const start = dir > 0 ? "-35vw" : "115vw";
      const end = dir > 0 ? "115vw" : "-35vw";
      const widthPx = 220 * scale;
      const heightPx = 110 * scale;
      return {
        id: `cloud-${index}`,
        top,
        duration,
        delay,
        opacity,
        start,
        end,
        widthPx,
        heightPx,
      };
    });
  }, [showClouds]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "40px 0",
        backgroundColor: "#f7f8ff",
        backgroundImage:
          "radial-gradient(1200px 700px at 5% 15%, rgba(59, 130, 246, 0.1), transparent 64%)," +
          "radial-gradient(1000px 600px at 95% 10%, rgba(249, 115, 22, 0.11), transparent 64%)," +
          "radial-gradient(1100px 700px at 50% 95%, rgba(244, 63, 94, 0.09), transparent 64%)," +
          "radial-gradient(800px 500px at 70% 50%, rgba(34, 197, 94, 0.08), transparent 70%)," +
          "linear-gradient(135deg, #f7f8ff 0%, #fff7e6 45%, #fff0f4 100%)",
        backgroundSize: "170% 170%, 170% 170%, 165% 165%, 160% 160%, 100% 100%",
        backgroundPosition: "0% 0%, 100% 0%, 50% 100%, 80% 40%, 0 0",
        backgroundBlendMode: "screen, screen, screen, screen, normal",
        animation: "appBgShift 32s ease-in-out infinite",
        color: pageText,
        ["--app-text"]: pageText,
        ["--app-muted"]: pageMuted,
        transitionProperty: isDragging ? "none" : "--celestial-x, --celestial-y",
        transitionDuration: "0.8s",
        transitionTimingFunction: "linear",
        ...themeStyle,
        ...style,
        ...celestialVars,
      }}
      >
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            opacity: 0.05,
            zIndex: 0,
          }}
        >
          <img
            src="/EEC_Logo.png"
            alt=""
            style={{
              width: "min(92vw, 900px)",
              height: "auto",
              objectFit: "contain",
              mixBlendMode: "multiply",
            }}
          />
        </div>
        {showClouds && (
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
              overflow: "hidden",
            }}
          >
            {cloudLayers.map((cloud) => (
              <div
                key={cloud.id}
                style={{
                  position: "absolute",
                  top: `${cloud.top}vh`,
                  left: 0,
                  width: `${cloud.widthPx}px`,
                  height: `${cloud.heightPx}px`,
                  backgroundImage: CLOUD_URL,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                  opacity: cloud.opacity,
                  filter: "blur(0.3px)",
                  animation: `appCloudDrift ${cloud.duration}s linear ${cloud.delay}s infinite`,
                  ["--cloud-start"]: cloud.start,
                  ["--cloud-end"]: cloud.end,
                }}
              />
            ))}
          </div>
        )}
        {showMoon && (
          <svg
            aria-hidden="true"
            viewBox="0 0 64 64"
            width={CELESTIAL_SIZE}
            height={CELESTIAL_SIZE}
            style={celestialBaseStyle}
            onPointerDown={handleCelestialDown}
            onPointerMove={handleCelestialMove}
            onPointerUp={handleCelestialUp}
            onPointerCancel={handleCelestialUp}
          >
            <defs>
              <mask id="moon-mask-global">
                <rect width="64" height="64" fill="#fff" />
                <circle cx="44" cy="22" r="22" fill="#000" />
              </mask>
            </defs>
            <circle cx="28" cy="36" r="22" fill={pageText} mask="url(#moon-mask-global)" />
            <circle cx="20" cy="28" r="2" fill={pageMuted} opacity="0.7" />
            <circle cx="26" cy="40" r="1.6" fill={pageMuted} opacity="0.6" />
            <circle cx="34" cy="34" r="1.2" fill={pageMuted} opacity="0.5" />
          </svg>
        )}
        {showSun && (
          <svg
            aria-hidden="true"
            viewBox="0 0 64 64"
            width={CELESTIAL_SIZE}
            height={CELESTIAL_SIZE}
            style={celestialBaseStyle}
            onPointerDown={handleCelestialDown}
            onPointerMove={handleCelestialMove}
            onPointerUp={handleCelestialUp}
            onPointerCancel={handleCelestialUp}
          >
            <defs>
              <radialGradient id="sun-glow-global" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
              </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="14" fill="url(#sun-glow-global)" />
            <circle cx="32" cy="32" r="8" fill="#f59e0b" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={`sun-ray-${deg}`}
                x1="32"
                y1="4"
                x2="32"
                y2="14"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${deg} 32 32)`}
              />
            ))}
          </svg>
        )}
        {showSnow && (
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 1,
              overflow: "hidden",
            }}
          >
            {snowflakes.map((flake) => (
              <div
                key={flake.id}
                style={{
                  position: "absolute",
                  top: "-15vh",
                  left: `${flake.left}%`,
                  width: `${flake.size}px`,
                  height: `${flake.size}px`,
                  backgroundImage: flake.soft ? SNOWFLAKE_SOFT_URL : SNOWFLAKE_URL,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                  opacity: flake.opacity,
                  filter: "drop-shadow(0 0 2px rgba(15, 23, 42, 0.22))",
                  animation: `appSnowflakeFall ${flake.duration}s linear ${flake.delay}s infinite`,
                  transform: "translate3d(0, -15vh, 0)",
                  ["--drift"]: `${flake.drift}px`,
                  ["--spin"]: `${flake.spin}deg`,
                  zIndex: flake.depth,
                }}
              />
            ))}
          </div>
        )}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 800, width: "100%", padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

export function HeaderBar({ title, right, lang = "EN" }) {
  HeaderBar.propTypes = {
    title: PropTypes.node.isRequired,
    right: PropTypes.node,
    lang: PropTypes.string,
  };

  const { theme, setTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const isDark = theme === "dark";
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const themeToggle = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      data-header-control="icon"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
        boxShadow: "none",
        outline: "none",
      }}
    >
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="4"
          stroke={isDark ? "#e2e8f0" : "#374151"}
          strokeWidth="1.6"
          fill={isDark ? "#e2e8f0" : "none"}
        />
        <path
          d="M12 3v2M12 19v2M4.22 4.22l1.41 1.41M18.36 18.36l1.41 1.41M3 12h2M19 12h2M4.22 19.78l1.41-1.41M18.36 5.64l1.41-1.41"
          stroke={isDark ? "#e2e8f0" : "#374151"}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!menuOpen) {
      setDrawerVisible(false);
      return;
    }
    setDrawerVisible(false);
    const id = window.requestAnimationFrame(() => setDrawerVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [menuOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (document.getElementById(KEYFRAME_ID)) return undefined;
    const styleEl = document.createElement("style");
    styleEl.id = KEYFRAME_ID;
    styleEl.textContent = `
@keyframes hbItemSlideLTR { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes hbItemSlideRTL { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
`;
    document.head.appendChild(styleEl);
    return undefined;
  }, []);

  const renderBurger = () => (
    <button
      type="button"
      onClick={toggleMenu}
      aria-label={menuOpen ? "Close menu" : "Open menu"}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        border: "1px solid #d1d5db",
        background: "#ffffff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "grid",
          gap: 6,
        }}
      >
        {[0, 1, 2].map((idx) => (
          <span
            key={idx}
            style={{
              display: "block",
              width: 20,
              height: 2,
              borderRadius: 999,
              background: "#374151",
            }}
          />
        ))}
      </span>
    </button>
  );

  const isRTL = lang && typeof lang === "string" ? lang.toUpperCase().startsWith("AR") : false;

  const itemAnimationName = drawerVisible ? (isRTL ? "hbItemSlideRTL" : "hbItemSlideLTR") : null;

  let rightContent = right;
  if (right) {
    if (React.isValidElement(right)) {
      const children = React.Children.toArray(right.props.children);
      rightContent = React.cloneElement(right, right.props, [...children, themeToggle]);
    } else {
      rightContent = (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {right}
          {themeToggle}
        </div>
      );
    }
  } else {
    rightContent = themeToggle;
  }

  let mobilePanel = rightContent;
  const isRightContainer =
    rightContent &&
    React.isValidElement(rightContent) &&
    typeof rightContent.type === "string" &&
    rightContent.type !== "button";
  if (isMobile && rightContent && isRightContainer) {
    const baseStyle = {
      ...(rightContent.props.style || {}),
      display: "flex",
      flexDirection: "column",
        alignItems: "center",
        gap: 24,
    };
    mobilePanel = React.cloneElement(
      rightContent,
      {
        style: baseStyle,
      },
      React.Children.map(rightContent.props.children, (child, index) => {
        if (!React.isValidElement(child)) {
          return child;
        }
        const childType = child.type;
        const isLanguageButton =
          childType &&
          (childType.displayName === "LanguageButton" || childType.name === "LanguageButton");
        const isUserMenu =
          childType && (childType.displayName === "UserMenu" || childType.name === "UserMenu");
        // Stack nav links vertically
        if (child.type === "nav") {
          const navStyle = {
            ...(child.props.style || {}),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          };
          return React.cloneElement(
            child,
            {
              style: navStyle,
            },
            React.Children.map(child.props.children, (navItem, navIdx) => {
              if (!React.isValidElement(navItem)) {
                return navItem;
              }
              const animation =
                drawerVisible && itemAnimationName
                  ? `${itemAnimationName} 260ms ease ${navIdx * 60}ms both`
                  : "none";
              return React.cloneElement(navItem, {
                key: navItem.key ?? `nav-item-${navIdx}`,
                style: {
                  ...(navItem.props.style || {}),
                  width: "100%",
                  justifyContent: "center",
                  textAlign: "center",
                  animation,
                },
              });
            })
          );
        }
        if (isLanguageButton) {
          const animation =
            drawerVisible && itemAnimationName
              ? `${itemAnimationName} 260ms ease ${index * 60}ms both`
              : "none";
          return React.cloneElement(child, {
            key: child.key ?? `header-item-${index}`,
            context: "drawer",
            style: {
              ...(child.props.style || {}),
              width: "100%",
              animation,
            },
          });
        }
        const isIconControl =
          childType === "button" && child.props?.["data-header-control"] === "icon";
        if (isIconControl) {
          const animation =
            drawerVisible && itemAnimationName
              ? `${itemAnimationName} 260ms ease ${index * 60}ms both`
              : "none";
          return React.cloneElement(child, {
            key: child.key ?? `header-item-${index}`,
            style: {
              ...(child.props.style || {}),
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "none",
              background: "transparent",
              boxShadow: "none",
              alignSelf: "center",
              animation,
            },
          });
        }
        if (isUserMenu) {
          const animation =
            drawerVisible && itemAnimationName
              ? `${itemAnimationName} 260ms ease ${index * 60}ms both`
              : "none";
          return React.cloneElement(child, {
            key: child.key ?? `header-item-${index}`,
            variant: "drawer",
            style: {
              ...(child.props.style || {}),
              width: "100%",
              animation,
            },
          });
        }
        // Default: ensure each item stretches full width
        const animation =
          drawerVisible && itemAnimationName
            ? `${itemAnimationName} 260ms ease ${index * 60}ms both`
            : "none";
        return React.cloneElement(child, {
          key: child.key ?? `header-item-${index}`,
          style: {
            ...(child.props.style || {}),
            width: "100%",
            textAlign: "center",
            justifyContent: "center",
            animation,
          },
        });
      })
    );
  } else if (isMobile && rightContent) {
    mobilePanel = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
        {rightContent}
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {typeof title === "string" ? (
            <h1 style={{ margin: 0 }}>{title}</h1>
          ) : (
            React.cloneElement(title, {
              style: {
                ...(title.props?.style || {}),
              },
            })
          )}
        </div>
        {isMobile ? (rightContent ? renderBurger() : null) : rightContent}
      </div>
      {isMobile && rightContent && menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.45)",
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
            position: "absolute",
            top: 0,
            right: isRTL ? "auto" : 0,
            left: isRTL ? 0 : "auto",
            width: "min(260px, 78vw)",
            height: "100%",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.2))",
            border: "1px solid rgba(255, 255, 255, 0.45)",
            borderRadius: isRTL ? "0 16px 16px 0" : "16px 0 0 16px",
            boxShadow: isRTL
              ? "8px 0 24px rgba(15, 23, 42, 0.2)"
              : "-8px 0 24px rgba(15, 23, 42, 0.2)",
            backdropFilter: "blur(10px) saturate(140%)",
            WebkitBackdropFilter: "blur(10px) saturate(140%)",
            padding: "24px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
            transform: drawerVisible
              ? "translateX(0)"
              : isRTL
                ? "translateX(-100%)"
                : "translateX(100%)",
            transition: "transform 220ms ease",
            overflowY: "auto",
          }}
        >
            {mobilePanel}
          </div>
        </div>
      )}
    </>
  );
}

export function Card({ children, style = {} }) {
  Card.propTypes = {
    children: PropTypes.node.isRequired,
    style: PropTypes.object,
  };
  const toGlassColor = (color, alpha = 0.45) => {
    if (!color || typeof color !== "string") return color;
    const trimmed = color.trim();
    if (trimmed.startsWith("rgba(")) return trimmed;
    if (trimmed.startsWith("rgb(")) {
      return trimmed.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
    }
    if (trimmed.startsWith("#")) {
      const hex = trimmed.slice(1);
      const normalized =
        hex.length === 3
          ? hex.split("").map((c) => c + c).join("")
          : hex.length === 6
            ? hex
            : null;
      if (normalized) {
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    return color;
  };
  const [hovered, setHovered] = useState(false);
  const cardRef = React.useRef(null);
  const baseBackground = "linear-gradient(135deg, rgba(255, 255, 255, 0.015), rgba(255, 255, 255, 0.0))";
  const baseShadow = style?.boxShadow || "0 16px 40px rgba(15, 23, 42, 0.18)";
  const hoverShadow = style?.boxShadow || "0 22px 50px rgba(15, 23, 42, 0.22)";
  const edgeShadow = hovered
    ? "inset 0 0 0 1px rgba(255, 255, 255, 0.55), inset 0 1px 2px rgba(255, 255, 255, 0.35), inset 0 -1px 2px rgba(15, 23, 42, 0.1)"
    : "inset 0 0 0 1px rgba(255, 255, 255, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.28), inset 0 -1px 1px rgba(15, 23, 42, 0.08)";
  const combinedShadow = `${hovered ? hoverShadow : baseShadow}, ${edgeShadow}`;
  const rawBackground = typeof style?.background === "string" ? style.background : "";
  const customBackgroundImage =
    style?.backgroundImage ||
    (rawBackground && (rawBackground.includes("gradient") || rawBackground.includes("url")) ? rawBackground : "");
  const customFill =
    rawBackground && !rawBackground.includes("gradient") && !rawBackground.includes("url")
      ? rawBackground
      : style?.backgroundColor;
  const glassFill = customFill ? toGlassColor(customFill, 0.42) : customFill;
  const highlightOpacity = hovered ? 0.55 : 0;
  const hazeOpacity = hovered ? 0.28 : 0;
  const highlightGradient = `radial-gradient(180px 180px at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, ${highlightOpacity}), rgba(255, 255, 255, 0) 70%)`;
  const hazeGradient = `radial-gradient(360px 360px at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, ${hazeOpacity}), rgba(255, 255, 255, 0) 75%)`;
  const celestialGlow = `radial-gradient(220px 220px at var(--celestial-x, 50vw) var(--celestial-y, 0px), var(--celestial-glow, rgba(255, 255, 255, 0)), transparent 70%)`;
  const celestialHaze = `radial-gradient(520px 420px at var(--celestial-x, 50vw) var(--celestial-y, 0px), var(--celestial-haze, rgba(255, 255, 255, 0)), transparent 75%)`;
  const borderGradient = hovered
    ? "linear-gradient(135deg, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.2) 42%, rgba(255, 255, 255, 0.55) 68%, rgba(255, 255, 255, 0.12) 100%)"
    : "linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.14) 42%, rgba(255, 255, 255, 0.36) 68%, rgba(255, 255, 255, 0.1) 100%)";
  const baseLayer = customBackgroundImage
    ? customBackgroundImage
    : glassFill
      ? `linear-gradient(135deg, ${glassFill}, ${glassFill})`
      : baseBackground;
  const backgroundImage = `${highlightGradient}, ${hazeGradient}, ${celestialGlow}, ${celestialHaze}, ${baseLayer}, ${borderGradient}`;

  const updateLightPosition = (clientX, clientY) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(-10, Math.min(110, x));
    const clampedY = Math.max(-10, Math.min(110, y));
    cardRef.current.style.setProperty("--mx", `${clampedX}%`);
    cardRef.current.style.setProperty("--my", `${clampedY}%`);
    const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
    const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
    const distance = Math.hypot(dx, dy);
    setHovered(distance <= 100);
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleMove = (event) => {
      updateLightPosition(event.clientX, event.clientY);
    };
    const handleLeave = () => setHovered(false);
    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={(event) => {
        updateLightPosition(event.clientX, event.clientY);
      }}
      onMouseMove={(event) => updateLightPosition(event.clientX, event.clientY)}
      onMouseLeave={() => {
        setHovered(false);
      }}
      style={{
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        boxShadow: combinedShadow,
        backdropFilter: "blur(4px) saturate(120%)",
        WebkitBackdropFilter: "blur(4px) saturate(120%)",
        boxSizing: "border-box",
        transition: "box-shadow 180ms ease",
        ...style,
        border: "1px solid transparent",
        backgroundColor: "transparent",
        backgroundImage,
        backgroundSize: "100% 100%, 100% 100%, 100vw 100vh, 100vw 100vh, 100% 100%, 100% 100%",
        backgroundPosition: "0 0",
        backgroundAttachment: "scroll, scroll, fixed, fixed, scroll, scroll",
        backgroundOrigin: "padding-box, padding-box, padding-box, padding-box, padding-box, border-box",
        backgroundClip: "padding-box, padding-box, padding-box, padding-box, padding-box, border-box",
      }}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  invalid = false,
  autoComplete,
  inputMode,
  endAdornment = null,
  name,
  maxLength,
  readOnly = false,
  disabled = false,
  style = {},
  labelStyle = {},
  children,
  ...rest
}) {
  Field.propTypes = {
    label: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    children: PropTypes.node,
    type: PropTypes.string,
    invalid: PropTypes.bool,
    autoComplete: PropTypes.string,
    inputMode: PropTypes.string,
    endAdornment: PropTypes.node,
    name: PropTypes.string,
    maxLength: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,
    style: PropTypes.object,
    labelStyle: PropTypes.object,
  };

  if (value !== undefined && onChange) {
    const { onFocus: externalFocus, onBlur: externalBlur, ...inputRest } = rest;
    const baseBorder = invalid ? "#dc2626" : "#d1d5db";
    const direction =
      inputRest.dir ||
      (style && style.direction) ||
      "ltr";
    const isRTLDirection = direction === "rtl";
    const handleFocus = (e) => {
      e.target.style.borderColor = "#2563eb";
      e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.12)";
      if (typeof externalFocus === "function") externalFocus(e);
    };
    const handleBlur = (e) => {
      e.target.style.borderColor = invalid ? "#dc2626" : "#d1d5db";
      e.target.style.boxShadow = "none";
      if (typeof externalBlur === "function") externalBlur(e);
    };

    return (
      <div style={{ marginBottom: 16 }}>
        {label && (
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: "#374151",
              ...labelStyle,
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: "relative" }}>
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            name={name}
            maxLength={maxLength}
            readOnly={readOnly}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "10px 12px",
              paddingRight: endAdornment && !isRTLDirection ? 44 : 12,
              paddingLeft: endAdornment && isRTLDirection ? 44 : 12,
              border: `1px solid ${baseBorder}`,
              borderRadius: 8,
              fontSize: 14,
              lineHeight: "20px",
              background: disabled ? "#f3f4f6" : "#ffffff",
              boxShadow: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              ...style,
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...inputRest}
          />
          {endAdornment && (
            <div
              style={{
                position: "absolute",
                right: isRTLDirection ? "auto" : 10,
                left: isRTLDirection ? 10 : "auto",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {endAdornment}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", marginBottom: 4 }}>{label}</label>}
      {children}
    </div>
  );
}

export function ProgressBar({ value, max }) {
  ProgressBar.propTypes = {
    value: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
  };

  return (
    <div style={{ width: "100%", height: 8, background: "#e5e7eb", borderRadius: 4 }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: "#3b82f6", borderRadius: 4 }} />
    </div>
  );
}
