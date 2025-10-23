// src/pages/test/Shell.jsx
import React from "react";
import { PageWrap, HeaderBar, Card, ProgressBar } from "../../components/Layout.jsx";
import TimerHeader from "../../components/TimerHeader.jsx";

export default function Shell({ section, qNumber, totalQuestions, progressPct, timer, children }) {
  const Right = <TimerHeader label={`⏳ ${timer.fmt(timer.remaining)}`} />;
  return (
    <PageWrap>
      <HeaderBar title="Career Guidance Test" right={Right} />
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
            color: "#374151",
            fontSize: 14,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: "#111827",
              background: "#eef2ff",
              border: "1px solid #e5e7eb",
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            {section}
          </span>
          <span>
            Question {qNumber} of {totalQuestions}
          </span>
        </div>

        <ProgressBar value={progressPct} />

        <div style={{ marginTop: 18 }}>{children}</div>
      </Card>
    </PageWrap>
  );
}
