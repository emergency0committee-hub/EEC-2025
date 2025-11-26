import React from "react";
import PropTypes from "prop-types";

export default function CandidateDetailsCard({ rows = [] }) {
  if (!rows?.length) return null;
  const columnTemplate = `repeat(${rows.length}, minmax(160px, 1fr))`;
  return (
    <div
      className="card avoid-break section candidate-card"
      style={{
        padding: 20,
        borderRadius: 16,
        border: "1px solid #d1d5db",
        background: "#ffffff",
      }}
    >
      <h3 style={{ margin: 0, color: "#111827", fontSize: 20 }}>Candidate Details</h3>
      <div
        className="candidate-details-row avoid-break"
        style={{
          display: "grid",
          gridTemplateColumns: columnTemplate,
          gap: 18,
          marginTop: 14,
          alignItems: "flex-start",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {rows.map((row) => {
          const value =
            row.value === undefined || row.value === null || row.value === ""
              ? "—"
              : row.value;
          return (
            <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 12, color: "#6b7280", letterSpacing: 0.3, textTransform: "uppercase" }}>
                {row.label}
              </div>
              <div
                style={{
                  fontWeight: 600,
                  color: "#0f172a",
                  fontSize: 16,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

CandidateDetailsCard.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
};
