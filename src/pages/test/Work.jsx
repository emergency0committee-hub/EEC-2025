// src/pages/test/Work.jsx
import React from "react";
import Btn from "../../components/Btn.jsx";
import Shell from "./Shell.jsx";

export default function Work({
  q,
  value,               // 1 or 0
  onAnswer,
  qNumber,
  totalQuestions,
  progressPct,
  timer,
  onBack,
  onNext,
}) {
  return (
    <Shell
      section="Work Style"
      qNumber={qNumber}
      totalQuestions={totalQuestions}
      progressPct={progressPct}
      timer={timer}
    >
      <h3 style={{ margin: 0, color: "#111827" }}>{q.text}</h3>

      <div style={{ marginTop: 16, marginBottom: 18 }}>
        <Btn
          variant="secondary"
          selected={value === 1}
          onClick={() => onAnswer(1)}
        >
          Like
        </Btn>
        <Btn
          variant="secondary"
          selected={value === 0}
          onClick={() => onAnswer(0)}
          style={{ marginLeft: 6 }}
        >
          Dislike
        </Btn>
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
