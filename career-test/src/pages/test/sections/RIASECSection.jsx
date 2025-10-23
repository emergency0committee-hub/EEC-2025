// src/pages/test/sections/RIASECSection.jsx
import React from "react";
import Btn from "../../../components/Btn.jsx";

export default function RIASECSection({
  page,
  R_START,
  A_START,
  shuffledRIASEC,
  currentValueMap,
  onChoose,
  onPrev,
  onNext,
}) {
  const idx = page - R_START;
  const q = shuffledRIASEC?.[idx];
  if (!q) return null;
  const current = currentValueMap[q.id];

  return (
    <>
      <h3 style={{ margin: 0, color: "#111827" }}>{q.text}</h3>
      {q.area && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontSize: 13, fontWeight: 500 }}>
          <span style={{ width: 6, height: 6, background: "#2563eb", borderRadius: 999 }} />
          {q.area}
        </div>
      )}
      <p style={{ color: "#6b7280", marginTop: 8 }}>
        Rate how much this sounds like you (1 = Not at all, 5 = Very much).
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {[1,2,3,4,5].map((v) => (
          <Btn
            key={v}
            variant="secondary"
            selected={current === v}
            onClick={() => onChoose(q.id, v)}
            style={{ minWidth: 48 }}
          >
            {v}
          </Btn>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <Btn variant="back" onClick={onPrev}>Back</Btn>
        <Btn variant="primary" onClick={onNext}>Next</Btn>
      </div>
    </>
  );
}
