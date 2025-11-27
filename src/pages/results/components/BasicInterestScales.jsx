import React from "react";
import PropTypes from "prop-types";
import BarRow from "./BarRow.jsx";

export default function BasicInterestScales({
  themeOrder,
  radarByCode,
  groupedAreas,
  themeNameMap,
  themeColors,
  themeDescriptions,
}) {
  return (
    <div>
      <h3 style={{ margin: 0, color: "#111827" }}>BASIC INTEREST SCALES</h3>
      <p style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
        Percentages across specific interest areas within each RIASEC theme.
      </p>
      <p style={{ margin: "4px 0 12px", color: "#475569", fontSize: 13 }}>
        <strong>How to read:</strong> Each card represents one RIASEC theme. The chip color
        matches the theme, and every bar shows how strongly you responded to the sub-areas.
        Longer bars mean higher affinity.
      </p>
      <div className="interest-grid">
        {themeOrder.map((code) => {
          const themeScore = radarByCode[code] ?? 0;
          const areas = groupedAreas[code] || [];
          const color = themeColors[code] || "#2563eb";
          const insight = themeDescriptions?.[code] || {};
          return (
            <div
              key={code}
              className="card avoid-break basic-scale-card"
              style={{ padding: 16, background: "#ffffff" }}
            >
              <div
                className="chart-with-aside"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div
                  className="chart-main"
                  style={{
                    flex: "2 1 340px",
                    minWidth: 280,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 12,
                    }}
                    className="avoid-break"
                  >
                    <h4 style={{ margin: 0, color: "#111827" }}>
                      {themeNameMap[code] || code}{" "}
                      <span
                        style={{ fontWeight: 400, color: "#6b7280", fontSize: 14 }}
                      >
                        Level: {levelFromPct(themeScore)}
                      </span>
                    </h4>
                    <span
                      aria-hidden
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: color,
                        display: "inline-block",
                      }}
                    />
                  </div>

                  <div>
                    {areas.length ? (
                      areas.map((area) => (
                        <BarRow
                          key={`${code}-${area.area}`}
                          label={area.area}
                          percent={area.percent}
                          color={color}
                          chipColor={color}
                        />
                      ))
                    ) : (
                      <div style={{ color: "#6b7280", fontSize: 13 }}>
                        No answers recorded for this theme.
                      </div>
                    )}
                  </div>
                </div>

                <aside
                  className="chart-aside"
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 12,
                    background: "#f8fafc",
                    color: "#475569",
                    fontSize: 13,
                    flex: "1 1 220px",
                    minWidth: 220,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#111827" }}>
                    {insight.title || `${themeNameMap[code] || code} Insights`}
                  </div>
                  <p style={{ margin: 0, lineHeight: 1.4 }}>
                    {insight.summary ||
                      "Bars on the left show how strongly you reacted to each sub-area. Longer bars = higher interest/energy."}
                  </p>
                  {areas.length > 0 && (
                    <div style={{ lineHeight: 1.4 }}>
                      <strong>Top areas:</strong>{" "}
                      {areas
                        .slice(0, 3)
                        .map((a) => `${a.area} (${Math.round(a.percent)}%)`)
                        .join(", ")}
                    </div>
                  )}
                  {insight.uni && (
                    <p style={{ margin: 0, lineHeight: 1.4 }}>
                      <strong>University focus:</strong> {insight.uni}
                    </p>
                  )}
                  {insight.real && (
                    <p style={{ margin: 0, lineHeight: 1.4 }}>
                      <strong>Real-life focus:</strong> {insight.real}
                    </p>
                  )}
                </aside>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function levelFromPct(pct) {
  if (pct >= 75) return "Very High";
  if (pct >= 55) return "High";
  if (pct >= 40) return "Moderate";
  return "Little";
}

BasicInterestScales.propTypes = {
  themeOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  radarByCode: PropTypes.object.isRequired,
  groupedAreas: PropTypes.object.isRequired,
  themeNameMap: PropTypes.object.isRequired,
  themeColors: PropTypes.object.isRequired,
  themeDescriptions: PropTypes.object,
};

BasicInterestScales.defaultProps = {
  themeDescriptions: {},
};
