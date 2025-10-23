// src/pages/results/ResultsRadar.jsx
import React from "react";
import { RiasecRadar } from "../../components/Charts.jsx";

export default function ResultsRadar({ data }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, color: "#111827" }}>RIASEC Profile (Radar)</h3>
      {Array.isArray(data) && data.length > 0 ? (
        <RiasecRadar data={data} />
      ) : (
        <div style={{ color: "#6b7280" }}>No answered RIASEC items to display.</div>
      )}
    </div>
  );
}
