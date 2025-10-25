// src/pages/results/ResultsRadar.jsx
import React from "react";
import { RadarBlock } from "../../components/Chart.jsx";

export default function ResultsRadar({ data }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, color: "#111827" }}>RIASEC Profile (Radar)</h3>
      {data && data.length > 0 ? (
        <RadarBlock data={data} />
      ) : (
        <div style={{ color: "#6b7280" }}>No answered RIASEC items to display.</div>
      )}
    </div>
  );
}
