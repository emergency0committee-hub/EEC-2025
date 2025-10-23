// src/pages/test/sections/AptitudeSection.jsx
import React from "react";
import Btn from "../../../components/Btn.jsx";

export default function AptitudeSection({
  page,
  A_START,
  W_START,
  items,
  currentValueMap,
  onChoose,
  onPrev,
  onNext,
}) {
  const idx = page - A_START;
  const q = items?.[idx];
  if (!q) return null;
  const chosen = currentValueMap[q.id];

  return (
    <>
      <h3 style={{ margin: 0, color: "#111827" }}>{q.text}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16, marginBottom: 18 }}>
        {q.options.map((opt, i) => (
          <Btn key={i} variant="secondary" selected={chosen === i} onClick={() => onChoose(q.id, i)}>
            {opt}
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
