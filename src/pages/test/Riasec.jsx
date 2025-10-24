// src/pages/test/Riasec.jsx
import React from "react";
import Btn from "../../components/Btn.jsx";
import Shell from "./Shell.jsx";

export default function Riasec({
  q,
  value,                 // current 1..5
  onAnswer,
  qNumber,
  totalQuestions,
  progressPct,
  timer,
  onBack,
  onNext,
}) {
  const scale = [1, 2, 3, 4, 5];

  return (
    <Shell
      section="RIASEC"
      qNumber={qNumber}
      totalQuestions={totalQuestions}
      progressPct={progressPct}
      timer={timer}
    >
      <h3 style={{ margin: 0, color: "#111827" }}>{q.text}</h3>
      <p style={{ color: "#6b7280", marginTop: 6 }}>
        Rate how much this sounds like you (1 = Not at all, 5 = Very much).
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {scale.map((v) => (
          <Btn
            key={v}
            variant="secondary"
            selected={value === v}
            onClick={() => onAnswer(v)}
            style={{ minWidth: 48 }}
          >
            {v}
          </Btn>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <Btn variant="back" onClick={onBack}>
          Back
        </Btn>
        <Btn variant="primary" onClick={onNext}>
          Next
        </Btn>
      </div>
    </Shell>
  );
}
