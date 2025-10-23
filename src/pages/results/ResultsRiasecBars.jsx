// src/pages/results/ResultsRiasecBars.jsx
import React from "react";

export default function ResultsRiasecBars({ rows = [] }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, color: "#111827" }}>RIASEC Percentages</h3>
      {(!rows || !rows.length) ? (
        <div style={{ color: "#6b7280" }}>No answered RIASEC items to display.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row) => (
            <div key={row.code}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#374151" }}>
                <strong style={{ color: "#111827" }}>{row.code}</strong>
                <span>{row.percent}%</span>
              </div>
              <div style={{ width: "100%", height: 10, background: "#eef2ff", borderRadius: 999 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(0, Math.min(100, row.percent))}%`,
                    background: "#2563eb",
                    borderRadius: 999,
                    transition: "width 180ms ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
