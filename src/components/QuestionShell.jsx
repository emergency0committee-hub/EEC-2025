// src/components/QuestionShell.jsx
import React from "react";
import { PageWrap, HeaderBar, Card, ProgressBar } from "./Layout.jsx";

/**
 * QuestionShell
 * Generic wrapper for a question page:
 * - Section badge
 * - Progress bar
 * - Optional timer on the right
 * NOTE: Removed the qNumber/total indicator from header per request.
 */
export default function QuestionShell({
  section,
  // qNumber, total,  // not rendered in header anymore
  progress,
  timer,
  children,
}) {
  return (
    <PageWrap>
      <HeaderBar
        title="Career Guidance Test"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {timer /* Only the timer on the top-right now */}
          </div>
        }
      />
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
        </div>

        <ProgressBar value={progress} />

        <div style={{ marginTop: 18 }}>{children}</div>
      </Card>
    </PageWrap>
  );
}
