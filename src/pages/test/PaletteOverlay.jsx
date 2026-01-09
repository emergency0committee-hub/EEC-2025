// src/pages/test/PaletteOverlay.jsx
import React from "react";
import Btn from "../../components/Btn.jsx";
import ModalPortal from "../../components/ModalPortal.jsx";

export default function PaletteOverlay({
  totalQuestions,
  currentIndex,
  onJump,
  onClose,
  savedScroll,
  setSavedScroll,
  answeredIndexes,
  flaggedIndexes = new Set(),
}) {
  const handleJump = (idx1) => {
    onJump(idx1);
    onClose();
  };

  return (
    <ModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.78)",
          zIndex: 2000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 8,
            maxWidth: 400,
            maxHeight: "80vh",
            overflowY: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h4 style={{ margin: 0, marginBottom: 16 }}>Question Navigator</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {Array.from({ length: totalQuestions }, (_, i) => {
              const idx = i + 1;
              const isAnswered = answeredIndexes?.has(idx);
              const isFlagged = flaggedIndexes?.has(idx);
              const isCurrent = idx === currentIndex;
              // Color logic: current (primary); flagged = orange; answered = green; else neutral
              const style = isCurrent
                ? { minWidth: 40, height: 40, padding: 0 }
                : isFlagged
                ? { minWidth: 40, height: 40, padding: 0, background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e" }
                : isAnswered
                ? { minWidth: 40, height: 40, padding: 0, background: "#ecfdf5", border: "1px solid #10b981", color: "#065f46" }
                : { minWidth: 40, height: 40, padding: 0 };
              return (
                <Btn
                  key={i}
                  variant={isCurrent ? "primary" : "back"}
                  onClick={() => handleJump(idx)}
                  style={style}
                >
                  {idx}
                </Btn>
              );
            })}
          </div>
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Btn variant="back" onClick={onClose}>Close</Btn>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
