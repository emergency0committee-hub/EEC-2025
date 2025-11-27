import React from "react";
import PropTypes from "prop-types";
import BarRow from "./BarRow.jsx";

const DISC_LABELS = {
  D: "Drive",
  I: "Influence",
  S: "Steadiness",
  C: "Compliance",
};

export default function PillarSummaryCards({ sections = [], scaleLabel = "Percent of Max" }) {
  if (!sections?.length) return null;
  return (
    <>
      {sections.map((section) => (
        <div
          key={section.title}
          className="card section avoid-break pillar-card"
          style={{ padding: 16, boxShadow: "0 10px 20px rgba(0,0,0,0.08)" }}
        >
          <div
            className="chart-with-aside"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div
              className="chart-main"
              style={{
                flex: "2 1 360px",
                minWidth: 300,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <h3 style={{ margin: 0, color: "#111827" }}>
                {section.title} ({scaleLabel})
              </h3>
              {section.title === "DISC" && null}
              {section.description ? (
                <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
                  {section.description}
                </p>
              ) : null}
              <div>
                {section.data?.length ? (
                  section.data
                    .slice()
                    .sort((a, b) => (b?.[1] || 0) - (a?.[1] || 0))
                    .map(([label, pct]) => (
                      <BarRow
                        key={label}
                        label={
                          section.title === "DISC" && DISC_LABELS[label]
                            ? DISC_LABELS[label]
                            : label
                        }
                        percent={pct}
                        color={section.color}
                        chipColor={section.color}
                      />
                    ))
                ) : (
                  <div style={{ color: "#6b7280" }}>No data.</div>
                )}
              </div>
            </div>
            <aside
              className="chart-aside"
              style={{
                flex: "1 1 220px",
                minWidth: 220,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 12,
                background: "#f8fafc",
                color: "#475569",
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {section.insight?.title || `${section.title} Insights`}
              </div>
              <p style={{ margin: 0, lineHeight: 1.4 }}>
                {section.insight?.body ||
                  "Bars on the left show how strongly you scored within this pillar. Longer bars = higher emphasis."}
              </p>
              {section.data?.length ? (
                <div style={{ lineHeight: 1.4 }}>
                  <strong>Top areas:</strong>{" "}
                  {section.data
                    .slice()
                    .sort((a, b) => (b?.[1] || 0) - (a?.[1] || 0))
                    .slice(0, 3)
                    .map(([label, pct]) => {
                      const lbl =
                        section.title === "DISC" && DISC_LABELS[label]
                          ? DISC_LABELS[label]
                          : label;
                      return `${lbl} (${Math.round(pct || 0)}%)`;
                    })
                    .join(", ")}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      ))}
    </>
  );
}

PillarSummaryCards.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      insight: PropTypes.shape({
        title: PropTypes.string,
        body: PropTypes.string,
      }),
      data: PropTypes.arrayOf(
        PropTypes.arrayOf(
          PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        )
      ),
      color: PropTypes.string,
    })
  ),
  scaleLabel: PropTypes.string,
};
