import React from "react";
import PropTypes from "prop-types";
import ResultsRadar from "../ResultsRadar.jsx";
import ResultsRiasecBars from "../ResultsRiasecBars.jsx";

const RIASEC_SUMMARIES = {
  R: "Hands-on builders who prefer tools, equipment, and tangible results.",
  I: "Analytical investigators drawn to data, experiments, and unanswered questions.",
  A: "Creative storytellers who communicate through visuals, words, or performance.",
  S: "Supportive helpers energized by guiding, teaching, or caring for people.",
  E: "Strategic leaders who persuade, organize, and take calculated risks.",
  C: "Detail-driven organizers who keep systems running with accuracy.",
};

export default function RiasecHeroSection({ radarData = [] }) {
  const safeRadar = Array.isArray(radarData) ? radarData : [];
  const sorted = [...safeRadar].sort((a, b) => (b?.score || 0) - (a?.score || 0));
  const hasData = sorted.length > 0;
  return (
    <div className="section avoid-break">
      <div className="card avoid-break" style={{ padding: 16, boxShadow: "0 10px 20px rgba(0,0,0,0.08)" }}>
        <div className="avoid-break">
          <ResultsRadar data={safeRadar} />
        </div>
        <div
          className="chart-with-aside"
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "stretch",
            marginTop: 12,
          }}
        >
          <div
            className="chart-main avoid-break"
            style={{
              flex: "2 1 360px",
              minWidth: 320,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
            }}
          >
            <ResultsRiasecBars
              rows={safeRadar.map((d) => ({ code: d.code, percent: d.score }))}
            />
          </div>
          <aside
            className="chart-aside"
            style={{
              flex: "1 1 240px",
              minWidth: 240,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 12,
              background: "#f8fafc",
              color: "#475569",
              fontSize: 13,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontWeight: 600, color: "#0f172a" }}>RIASEC Insights</div>
            <p style={{ margin: 0 }}>
              Bars are in descending orderâ€”your top letters show where you naturally invest energy.
              Match clubs, coursework, or internships with those letters.
            </p>
            {sorted.slice(0, 3).map((entry) => (
              <div key={`bar-insight-${entry.code}`} style={{ marginBottom: 4 }}>
                <strong style={{ color: "#111827" }}>{entry.code}</strong>{" "}
                <span>{RIASEC_SUMMARIES[entry.code] || "Unique blend of strengths."}</span>
              </div>
            ))}
            <p style={{ margin: 0 }}>
              Revisit this chart after major projects; if a letter grows, lean into that track.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

RiasecHeroSection.propTypes = {
  radarData: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string,
      score: PropTypes.number,
    })
  ),
};

