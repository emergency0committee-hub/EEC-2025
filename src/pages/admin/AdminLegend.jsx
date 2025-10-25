// src/pages/admin/AdminLegend.jsx
import React from "react";

export default function AdminLegend() {
  const chip = (bg, border, label) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, background: bg, border: `1px solid ${border}`, borderRadius: 3 }} />
      {label}
    </span>
  );
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, color: "#374151" }}>
      <span>Legend:</span>
      {chip("#ecfdf5", "#d1fae5", "OK")}
      {chip("#fff7ed", "#ffedd5", "Review")}
      {chip("#fee2e2", "#fecaca", "Invalid")}
    </div>
  );
}
