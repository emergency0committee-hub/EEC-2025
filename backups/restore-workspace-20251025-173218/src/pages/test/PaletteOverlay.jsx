// src/pages/test/PaletteOverlay.jsx
import React from "react";
import { createPortal } from "react-dom";
import Btn from "../../components/Btn.jsx";

export default function PaletteOverlay({
  totalQuestions,
  currentIndex,
  onJump,
  onClose,
  savedScroll,
  setSavedScroll,
  answeredIndexes,
}) {
  const handleJump = (idx1) => {
    onJump(idx1);
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
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
            const isAnswered = answeredIndexes.has(i + 1);
            const isCurrent = i + 1 === currentIndex;
            return (
              <Btn
                key={i}
                variant={isCurrent ? "primary" : isAnswered ? "secondary" : "back"}
                onClick={() => handleJump(i + 1)}
                style={{ minWidth: 40, height: 40, padding: 0 }}
              >
                {i + 1}
              </Btn>
            );
          })}
        </div>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Btn variant="back" onClick={onClose}>Close</Btn>
        </div>
      </div>
    </div>,
    document.body
  );
}
