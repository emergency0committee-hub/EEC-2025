// src/pages/test/sections/WorkSection.jsx
import React from "react";
import Btn from "../../../components/Btn.jsx";

export default function WorkSection({
  page,
  W_START,
  I_START,
  items,
  currentValueMap,
  onChoose,
  onPrev,
  onNext,
}) {
  const idx = page - W_START;
  const q = items?.[idx];
  if (!q) return null;
  const val = currentValueMap[q.id];

  return (
    <>
      <h3 style={{ margin: 0, color: "#111827" }}>{q.text}</h3>
      <div style={{ marginTop: 16, marginBottom: 18 }}>
        <Btn variant="secondary" selected={val === 1} onClick={() => onChoose(q.id, 1)}>Like</Btn>
        <Btn variant="secondary" selected={val === 0} onClick={() => onChoose(q.id, 0)} style={{ marginLeft: 6 }}>Dislike</Btn>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <Btn variant="back" onClick={onPrev}>Back</Btn>
        <Btn variant="primary" onClick={onNext}>Next</Btn>
      </div>
    </>
  );
}
