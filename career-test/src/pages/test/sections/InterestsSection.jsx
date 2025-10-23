// src/pages/test/sections/InterestsSection.jsx
import React from "react";
import Btn from "../../../components/Btn.jsx";

export default function InterestsSection({
  page,
  I_START,
  LAST,
  items,
  currentValueMap,
  onChoose,
  onPrev,
  onNext,
  onEnd,
}) {
  const idx = page - I_START;
  const q = items?.[idx];
  if (!q) return null;
  const val = currentValueMap[q.id];
  const isLast = page === LAST;

  return (
    <>
      <h3 style={{ margin: 0, color: "#111827" }}>{q.text}</h3>
      <div style={{ marginTop: 16, marginBottom: 18 }}>
        <Btn variant="secondary" selected={val === 1} onClick={() => onChoose(q.id, 1)}>Like</Btn>
        <Btn variant="secondary" selected={val === 0} onClick={() => onChoose(q.id, 0)} style={{ marginLeft: 6 }}>Dislike</Btn>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <Btn variant="back" onClick={onPrev}>Back</Btn>
        {isLast ? (
          <Btn variant="primary" onClick={onEnd}>End Test</Btn>
        ) : (
          <Btn variant="primary" onClick={onNext}>Next</Btn>
        )}
      </div>
    </>
  );
}
