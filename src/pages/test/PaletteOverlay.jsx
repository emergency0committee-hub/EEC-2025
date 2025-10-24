// src/pages/test/PaletteOverlay.jsx
import React from "react";
import Btn from "../../components/Btn.jsx";

const answered = (answers, q, type) => {
  if (!answers) return false;
  if (type === "mcq") return answers[q.id] !== undefined;
  return Object.prototype.hasOwnProperty.call(answers, q.id);
};

export default function PaletteOverlay({ open, onOpen, onClose, model, goTo }) {
  if (!model) return null;
  const { title, items, base, answers, type } = model;

  return (
    <>
      {/* Fixed center opener */}
      <div
        style={{
          position: "fixed",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
        }}
      >
        <Btn variant="secondary" onClick={onOpen} style={{ padding: "8px 14px" }}>
          Open Palette
        </Btn>
      </div>

      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.45)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(920px, 92vw)",
              maxHeight: "80vh",
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              padding: 16,
              overflow: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#111827" }}>{title} — Question Palette</h3>
              <Btn variant="secondary" onClick={onClose}>Close</Btn>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {items.map((q, idx) => {
                const isDone = answered(answers, q, type);
                return (
                  <button
                    key={q.id}
                    onClick={() => goTo(base + idx)}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 8,
                      border: `1px solid ${isDone ? "#2563eb" : "#d1d5db"}`,
                      background: isDone ? "#2563eb" : "#fff",
                      color: isDone ? "#fff" : "#374151",
                      cursor: "pointer",
                      fontWeight: 600,
                      transition: "box-shadow 120ms ease, transform 120ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 0 4px rgba(37,99,235,0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
