// src/components/OccupationScales.jsx
import React, { useEffect, useMemo, useState } from "react";
import { loadOccupations } from "../lib/occupations.js";
import { THEME_COLORS } from "./Chart.jsx";

const COLORS = {
  E: THEME_COLORS?.E || "#3b82f6", // blue
  A: THEME_COLORS?.A || "#f59e0b", // orange
  R: THEME_COLORS?.R || "#ef4444", // red
  I: THEME_COLORS?.I || "#14b8a6", // teal
  S: THEME_COLORS?.S || "#10b981", // green
  C: THEME_COLORS?.C || "#8b5cf6", // purple
};

function scoreFromTheme(themeStr, radarByCode) {
  const weights = [0.6, 0.25, 0.15]; // primary, secondary, tertiary
  const letters = String(themeStr || "")
    .toUpperCase()
    .replace(/[^RIASEC]/g, "")
    .split("");
  if (!letters.length) return 0;

  let score = 0;
  for (let i = 0; i < Math.min(3, letters.length); i++) {
    const L = letters[i];
    const pct = radarByCode[L] ?? 0;
    score += pct * weights[i];
  }
  return score;
}

function BarRow({ label, theme, percent, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 4,
          color: "#374151",
        }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{theme}</div>
        </div>
        <span>{Math.round(percent)}%</span>
      </div>
      <div
        style={{
          height: 10,
          background: "#f3f4f6",
          borderRadius: 6,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}

export default function OccupationScales({ radarByCode = {}, themeOrder }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await loadOccupations();
      if (alive) setRows(Array.isArray(data) ? data : []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const order = useMemo(() => {
    const base = ["E", "A", "R", "I", "S", "C"];
    if (Array.isArray(themeOrder) && themeOrder.length) return themeOrder;
    return base
      .map((L) => ({ L, v: radarByCode[L] ?? 0 }))
      .sort((a, b) => b.v - a.v)
      .map((x) => x.L);
  }, [themeOrder, radarByCode]);

  const byPrimary = useMemo(() => {
    const g = { R: [], I: [], A: [], S: [], E: [], C: [] };
    for (const r of rows) {
      const t = String(r.theme || "").toUpperCase().replace(/\s+/g, "");
      if (!t) continue;
      const primary = t[0];
      if (g[primary]) {
        const sc = scoreFromTheme(t, radarByCode);
        g[primary].push({ ...r, _score: sc });
      }
    }
    Object.keys(g).forEach((k) => g[k].sort((a, b) => b._score - a._score));
    return g;
  }, [rows, radarByCode]);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        padding: 16,
      }}
    >
      <h3 style={{ margin: 0, color: "#111827" }}>OCCUPATIONAL SCALES</h3>
      <p style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
        All occupations scored by your profile (weighted by theme codes like RIC, ASE, etc.).
      </p>

      {/* 2-column responsive grid of theme panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 16,
          marginTop: 12,
        }}
      >
        {order.map((L) => {
          const bucket = byPrimary[L] || [];
          const color = COLORS[L];
          return (
            <div
              key={L}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <h4 style={{ margin: 0, color: "#111827" }}>
                  {L} — {bucket.length ? `${bucket.length} roles` : "No matches"}
                </h4>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: color,
                    display: "inline-block",
                  }}
                />
              </div>

              {bucket.length ? (
                bucket.map((r, idx) => (
                  <BarRow
                    key={`${L}-${idx}`}
                    label={r.occupation}
                    theme={r.theme}
                    percent={r._score}
                    color={color}
                  />
                ))
              ) : (
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  No matching occupations to display.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
