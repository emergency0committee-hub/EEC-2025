// src/pages/results/ResultsRiasecBars.jsx
import React from "react";
import { THEME_COLORS } from "../../components/Chart.jsx";
import BarRow from "./components/BarRow.jsx";

const RIASEC_LABELS = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

export default function ResultsRiasecBars({ rows = [] }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, color: "#111827" }}>RIASEC Percentages</h3>
      {(!rows || !rows.length) ? (
        <div style={{ color: "#6b7280" }}>No answered RIASEC items to display.</div>
      ) : (
        rows.map((row) => {
          const code = row.code;
          const color = THEME_COLORS?.[code] || "#2563eb";
          const pct = Math.round(Number(row.percent ?? row.score ?? 0));
          const label = RIASEC_LABELS[code] || code;
          return (
            <BarRow
              key={code}
              label={label}
              subtitle={code}
              percent={pct}
              color={color}
              chipColor={color}
            />
          );
        })
      )}
    </div>
  );
}
