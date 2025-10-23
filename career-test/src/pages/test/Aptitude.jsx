// src/pages/test/Aptitude.jsx
import React from "react";
import Btn from "../../components/Btn.jsx";
import Shell from "./Shell.jsx";

export default function Aptitude({
  q,
  chosen,               // selected index
  onChoose,
  qNumber,
  totalQuestions,
  progressPct,
  timer,
  onBack,
  onNext,
}) {
  return (
    <Shell
      section="Aptitude"
      qNumber={qNumber}
      totalQuestions={totalQuestions}
      progressPct={progressPct}
      timer={timer}
    >
      <h3 style={{ margin: 0, color: "#111827" }}>{q.text}</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 16,
          marginBottom: 18,
        }}
      >
        {q.options.map((opt, i) => (
          <Btn
            key={i}
            variant="secondary"
            selected={chosen === i}
            onClick={() => onChoose(i)}
          >
            {opt}
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
