import React from "react";
import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";

const formatLabel = (entry, findSubjectLabel, formatUnitLabel, formatLessonLabel) => {
  const parts = [];
  const subjectLabel = entry.subject ? findSubjectLabel(entry.subject) : null;
  if (subjectLabel) parts.push(subjectLabel);
  if (entry.unit) {
    const unitLabel = formatUnitLabel(entry.subject, entry.unit);
    if (unitLabel) parts.push(unitLabel);
  }
  if (entry.lesson) {
    const lessonLabel = formatLessonLabel(entry.subject, entry.unit, entry.lesson);
    if (lessonLabel && lessonLabel !== "-") parts.push(lessonLabel);
  }
  return parts.join(" • ") || "General";
};

const InsightRow = ({ entry, variant, findSubjectLabel, formatUnitLabel, formatLessonLabel }) => {
  const accuracyPct = Math.round((entry.accuracy || 0) * 100);
  const isWeak = variant === "weak";
  const color = isWeak ? "#dc2626" : "#16a34a";
  const barBg = isWeak ? "rgba(220,38,38,0.15)" : "rgba(22,163,74,0.15)";
  const trendPct = entry.trend != null ? Math.round(entry.trend * 100) : null;
  const trendColor = trendPct != null ? (trendPct >= 0 ? "#16a34a" : "#dc2626") : "#6b7280";
  const label = formatLabel(entry, findSubjectLabel, formatUnitLabel, formatLessonLabel);
  const recommendation = isWeak
    ? `Assign more practice on ${entry.lesson ? formatLessonLabel(entry.subject, entry.unit, entry.lesson) : label}.`
    : `Keep reinforcing ${label}.`;

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{label}</div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            {entry.totalQuestions} question{entry.totalQuestions === 1 ? "" : "s"} across {entry.attemptCount} attempt{entry.attemptCount === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color }}>{accuracyPct}%</div>
          <div style={{ fontSize: 12, color: trendColor }}>
            {trendPct == null ? "No trend" : `${trendPct >= 0 ? "+" : ""}${trendPct} pts`}
          </div>
        </div>
      </div>
      <div style={{ background: "#f3f4f6", borderRadius: 999, height: 10 }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, accuracyPct))}%`,
            height: "100%",
            borderRadius: 999,
            background: barBg,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 999,
              background: color,
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
        {entry.recentAccuracies.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 12 }}>No recent attempts</div>
        ) : (
          entry.recentAccuracies.map((value, idx) => (
            <div
              key={`spark-${entry.key}-${idx}`}
              style={{
                width: 8,
                height: 26,
                background: "#e5e7eb",
                borderRadius: 2,
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${Math.min(100, Math.max(0, Math.round(value * 100)))}%`,
                  background: color,
                  borderRadius: 2,
                }}
              />
            </div>
          ))
        )}
      </div>
      <div style={{ color: "#6b7280", fontSize: 13 }}>{recommendation}</div>
    </div>
  );
};

InsightRow.propTypes = {
  entry: PropTypes.object.isRequired,
  variant: PropTypes.oneOf(["weak", "strong"]).isRequired,
  findSubjectLabel: PropTypes.func.isRequired,
  formatUnitLabel: PropTypes.func.isRequired,
  formatLessonLabel: PropTypes.func.isRequired,
};

export default function AdaptiveInsightsCard({
  insights,
  findSubjectLabel,
  formatUnitLabel,
  formatLessonLabel,
}) {
  const weakInsights = insights.filter((entry) => entry.accuracy < 0.7).slice(0, 3);
  const strongInsights = insights.filter((entry) => entry.accuracy >= 0.85).slice(0, 3);
  const hasData = weakInsights.length || strongInsights.length;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700 }}>Adaptive Insights</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Highlights based on recent class submissions</div>
        </div>
      </div>

      {!hasData ? (
        <div style={{ color: "#6b7280", fontSize: 14 }}>Not enough recent activity to generate insights yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: "#b45309" }}>Needs Attention</div>
            {weakInsights.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 13 }}>No major weaknesses detected.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {weakInsights.map((entry) => (
                  <InsightRow
                    key={entry.key}
                    entry={entry}
                    variant="weak"
                    findSubjectLabel={findSubjectLabel}
                    formatUnitLabel={formatUnitLabel}
                    formatLessonLabel={formatLessonLabel}
                  />
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: "#047857" }}>Strengths</div>
            {strongInsights.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 13 }}>No standout strengths yet. Keep gathering data.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {strongInsights.map((entry) => (
                  <InsightRow
                    key={entry.key}
                    entry={entry}
                    variant="strong"
                    findSubjectLabel={findSubjectLabel}
                    formatUnitLabel={formatUnitLabel}
                    formatLessonLabel={formatLessonLabel}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

AdaptiveInsightsCard.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.object).isRequired,
  findSubjectLabel: PropTypes.func.isRequired,
  formatUnitLabel: PropTypes.func.isRequired,
  formatLessonLabel: PropTypes.func.isRequired,
};
