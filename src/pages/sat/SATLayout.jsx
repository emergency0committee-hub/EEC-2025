// src/pages/sat/SATLayout.jsx
import React from "react";
import PropTypes from "prop-types";

export function SATCard({ children, style = {} }) {
  SATCard.propTypes = { children: PropTypes.node.isRequired, style: PropTypes.object };
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff", ...style }}>
      {children}
    </div>
  );
}

export function SATFooterBar({
  userLabel,
  questionLabel,
  onTogglePalette,
  onBack,
  onNext,
  onFinish,
  canBack = true,
  canNext = true,
  isLast = false,
  compact = false,
}) {
  SATFooterBar.propTypes = {
    userLabel: PropTypes.node,
    questionLabel: PropTypes.node,
    onTogglePalette: PropTypes.func,
    onBack: PropTypes.func,
    onNext: PropTypes.func,
    onFinish: PropTypes.func,
    canBack: PropTypes.bool,
    canNext: PropTypes.bool,
    isLast: PropTypes.bool,
    compact: PropTypes.bool,
  };
  const layoutStyle = compact
    ? { display: "flex", flexDirection: "column", gap: 12 }
    : { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" };
  const paletteButtonStyle = {
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
    minWidth: compact ? "auto" : 160,
    width: compact ? "100%" : "auto",
  };
  const controlsStyle = compact
    ? { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, width: "100%" }
    : { display: "flex", gap: 8, justifyContent: "flex-end" };
  return (
    <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px dashed #d1d5db", padding: 10, marginTop: 12 }}>
      <div style={layoutStyle}>
        <div style={{ fontWeight: 700, color: "#111827" }}>{userLabel || ""}</div>
        <div style={{ textAlign: "center", width: compact ? "100%" : "auto" }}>
          <button type="button" onClick={onTogglePalette} style={paletteButtonStyle}>
            {questionLabel}
          </button>
        </div>
        <div style={controlsStyle}>
          <button onClick={onBack} disabled={!canBack} style={{ ...btnSecondaryStyle, width: compact ? "100%" : "auto" }}>Back</button>
          {!isLast ? (
            <button onClick={onNext} disabled={!canNext} style={{ ...btnPrimaryStyle, width: compact ? "100%" : "auto" }}>Next</button>
          ) : (
            <button onClick={onFinish} style={{ ...btnPrimaryStyle, width: compact ? "100%" : "auto" }}>Finish</button>
          )}
        </div>
      </div>
    </div>
  );
}

const btnPrimaryStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const btnSecondaryStyle = {
  background: "#fff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

export default { SATCard, SATFooterBar };
