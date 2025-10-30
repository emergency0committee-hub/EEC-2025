// src/lib/routes.js
export function normalizeRoute(route) {
  let normalized = String(route || "").trim();
  if (!normalized || normalized === "/") return "home";
  normalized = normalized.replace(/^\/+/, "").replace(/\/+$/, "");
  return normalized || "home";
}

function basePath() {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") return "/";
  return base.endsWith("/") ? base : `${base}/`;
}

export function routeHref(route) {
  const normalized = normalizeRoute(route);
  const base = basePath();
  if (!normalized || normalized === "home") {
    return base;
  }
  return `${base}${normalized}`;
}

export function isModifiedEvent(event) {
  return !!(
    event?.metaKey ||
    event?.ctrlKey ||
    event?.shiftKey ||
    event?.altKey ||
    (event?.nativeEvent && event.nativeEvent.which === 2) ||
    event?.button === 1
  );
}
