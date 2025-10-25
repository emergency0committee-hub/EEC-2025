// src/pages/results/ResultsRiasecBars.jsx
import React from "react";
import { THEME_COLORS } from "../../components/Chart.jsx";

export default function ResultsRiasecBars({ rows = [] }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, color: "#111827" }}>RIASEC Percentages</h3>
      {(!rows || !rows.length) ? (
        <div style={{ color: "#6b7280" }}>No answered RIASEC items to display.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row) => {
            const code = row.code;
            const color = THEME_COLORS?.[code] || "#2563eb";
            const pct = Math.round(Number(row.percent ?? row.score ?? 0));
            return (
              <div key={code}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#374151" }}>
                  <strong style={{ color: "#111827", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span aria-hidden style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block" }} />
                    {code}
                  </strong>
                  <span>{pct}%</span>
                </div>
                <div style={{ width: "100%", height: 10, background: "#eef2ff", borderRadius: 999 }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(0, Math.min(100, pct))}%`,
                      background: color,
                      borderRadius: 999,
                      transition: "width 180ms ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
