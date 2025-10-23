// src/components/QuestionNavigator.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * QuestionNavigator
 * Props:
 * - current: number (1-based global question index)
 * - total: number
 * - onJump: (n:number)=>void    // jump to global index n (1..total)
 * - isAnswered?: (n:number)=>boolean
 * - buttonStyle?: React.CSSProperties
 * - placement?: 'right'|'center'  // visual preference only; header decides exact placement
 */
export default function QuestionNavigator({
  current = 1,
  total = 1,
  onJump,
  isAnswered = () => false,
  buttonStyle,
  placement = "right",
}) {
  const [open, setOpen] = useState(false);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const gridCols = useMemo(() => {
    // Nice auto-fit grid
    if (total <= 20) return "repeat(auto-fill, minmax(48px, 1fr))";
    if (total <= 80) return "repeat(auto-fill, minmax(44px, 1fr))";
    return "repeat(auto-fill, minmax(40px, 1fr))";
  }, [total]);

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open question navigator"
        title="Open question navigator"
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid #2563eb",
          background: "#2563eb",
          color: "#fff",
          fontSize: 14,
          lineHeight: 1,
          cursor: "pointer",
          ...buttonStyle,
        }}
      >
        {current} of {total}
      </button>

      {/* Overlay */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(980px, 92vw)",
              maxHeight: "82vh",
              overflow: "auto",
              borderRadius: 12,
              background: "#fff",
              boxShadow:
                "0 10px 20px rgba(0,0,0,0.15), 0 6px 6px rgba(0,0,0,0.10)",
              padding: 18,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                Jump to question
              </div>

              <div style={{ marginLeft: "auto", fontSize: 13, color: "#6b7280" }}>
                Press <kbd style={kbd}>Esc</kbd> to close
              </div>
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 13,
                color: "#4b5563",
                marginBottom: 10,
              }}
            >
              <LegendSwatch bg="#2563eb" fg="#fff" label="Current" />
              <LegendSwatch bg="#ecfdf5" border="#10b981" fg="#065f46" label="Answered" />
              <LegendSwatch bg="#f9fafb" border="#e5e7eb" fg="#111827" label="Unanswered" />
            </div>

            {/* Grid of buttons */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: 10,
              }}
            >
              {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
                const isCurrent = n === current;
                const answered = isAnswered(n);

                let bg = "#f9fafb", fg = "#111827", border = "#e5e7eb";
                if (answered) {
                  bg = "#ecfdf5"; fg = "#065f46"; border = "#10b981";
                }
                if (isCurrent) {
                  bg = "#2563eb"; fg = "#fff"; border = "#2563eb";
                }

                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      onJump?.(n);
                      setOpen(false);
                    }}
                    style={{
                      height: 44,
                      borderRadius: 8,
                      border: `1px solid ${border}`,
                      background: bg,
                      color: fg,
                      fontWeight: isCurrent ? 700 : 600,
                      cursor: "pointer",
                      transition: "box-shadow 120ms ease, transform 80ms ease",
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    title={`Go to question ${n}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LegendSwatch({ bg, border, fg, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: bg,
          border: `1px solid ${border ?? bg}`,
          display: "inline-block",
        }}
      />
      <span style={{ color: fg ?? "#111827" }}>{label}</span>
    </span>
  );
}

const kbd = {
  padding: "2px 6px",
  borderRadius: 4,
  border: "1px solid #d1d5db",
  background: "#f3f4f6",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
};
