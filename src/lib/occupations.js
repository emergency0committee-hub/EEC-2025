// src/lib/occupations.js
import { supabase } from "./supabase.js";
let _cache = null;

function normalizeTheme(s) {
  // Uppercase, strip spaces and non-letters (e.g. " RIC ", "R-I-C")
  return String(s || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

// CSV parser that tolerates:
// - UTF-8 BOM
// - quoted commas in Occupation
// - tabs/semicolons as separators
// Expected header: Occupation,Theme Code
function parseCsv(text) {
  const out = [];
  if (!text || !text.trim()) return out;

  // Remove BOM
  const raw = text.replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return out;

  // detect delimiter by header
  const header = lines[0].trim();
  let delim = ",";
  if (header.includes("\t")) delim = "\t";
  else if (header.includes(";")) delim = ";";

  // parse line safely for quoted fields
  const splitSmart = (line) => {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // toggle quotes or escape ""
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delim && !inQuotes) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map((s) => s.trim());
  };

  const h = splitSmart(header).map((s) => s.toLowerCase());
  const idxOcc = h.indexOf("occupation");
  const idxTheme = h.findIndex((s) => s.startsWith("theme"));
  if (idxOcc === -1 || idxTheme === -1) return out;

  for (let i = 1; i < lines.length; i++) {
    const row = splitSmart(lines[i]);
    const occupation = row[idxOcc] || "";
    const theme = normalizeTheme(row[idxTheme] || "");
    if (!occupation) continue;
    if (!theme) continue; // skip rows with empty theme
    out.push({ occupation, theme });
  }
  return out;
}

/** Load occupations with optional cache bust */
export async function loadOccupations(opts = {}) {
  const { force = false, cacheBuster } = opts || {};
  if (!force && _cache) return _cache;
  if (force) _cache = null;
  try {
    const bust = cacheBuster || import.meta?.env?.VITE_OCCUPATIONS_VERSION || "";
    const q = bust ? `?v=${encodeURIComponent(bust)}` : "";

    // 1) Prefer bundled assets (updated with deploy)
    const base = (import.meta?.env?.BASE_URL || "/").replace(/\/$/, "/");
    const candidates = [
      `${base}occupations.csv${q}`,
      `${base}data/occupations.csv${q}`,
      `/occupations.csv${q}`,
      `/data/occupations.csv${q}`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const text = await res.text();
          const rows = parseCsv(text);
          if (rows.length) {
            _cache = rows;
            return _cache;
          }
        }
      } catch {}
    }

    // 2) Fallback to Supabase Storage bucket
    try {
      const { data, error } = await supabase.storage
        .from("occupations")
        .download(`occupations.csv${bust ? `?v=${bust}` : ""}`);
      if (!error && data) {
        const text = await data.text();
        const rows = parseCsv(text);
        if (rows.length) {
          _cache = rows;
          return _cache;
        }
      }
    } catch {}

    console.warn("[occupations] No occupations.csv found in storage or assets.");
    _cache = [];
    return _cache;
  } catch (e) {
    console.error("[occupations] Unexpected error:", e);
    _cache = [];
    return _cache;
  }
}

/** Match rows where PRIMARY letter (first char) equals letter, e.g. "R" */
export function pickByPrimaryLetter(rows, letter, limit = 12) {
  const L = String(letter || "").toUpperCase().slice(0, 1);
  if (!L || !Array.isArray(rows) || rows.length === 0) return [];
  const out = [];
  for (const r of rows) {
    const t = normalizeTheme(r.theme);
    if (t.startsWith(L)) {
      out.push(r);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Optional: match rows that CONTAIN the letter anywhere (broader) */
export function pickContainingLetter(rows, letter, limit = 12) {
  const L = String(letter || "").toUpperCase().slice(0, 1);
  if (!L || !Array.isArray(rows) || rows.length === 0) return [];
  const out = [];
  for (const r of rows) {
    const t = normalizeTheme(r.theme);
    if (t.includes(L)) {
      out.push(r);
      if (out.length >= limit) break;
    }
  }
  return out;
}

