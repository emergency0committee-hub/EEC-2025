import React from "react";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import BarRow from "./components/BarRow.jsx";
import { buildOccupationInsight } from "../../components/OccupationScales.jsx";

const THEME_NAMES = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

export default function OccupationScaleFull({ payload = {}, onNavigate, canGoBack, isAdmin }) {
  const { letter = "", roles = [], color = "#0f172a" } = payload || {};
  const insight = buildOccupationInsight(letter, roles || []);
  const title = THEME_NAMES[letter] ? `${THEME_NAMES[letter]} Pathways` : "Occupational Roles";

  return (
    <PageWrap>
      <HeaderBar
        title={title}
        subtitle="Full list of matches based on your RIASEC profile."
      />

      <Card style={{ padding: 20, marginTop: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: "#111827" }}>{insight.title}</div>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>{insight.body}</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: `${color}22`,
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            {letter}
          </div>
          <div style={{ color: "#475569" }}>
            {roles.length ? `${roles.length} total roles` : "No occupations available."}
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: 20, padding: 20 }}>
        {roles.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {roles.map((role, idx) => (
              <BarRow
                key={`${letter}-full-${idx}`}
                label={role.occupation}
                percent={role._score}
                color={color}
                chipColor={color}
              />
            ))}
          </div>
        ) : (
          <div style={{ color: "#6b7280" }}>No matching occupations to display.</div>
        )}
      </Card>

      <div className="no-print" style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {isAdmin ? (
          <>
            <Btn
              variant="secondary"
              to="results"
              onClick={(e) => onNavigate?.("results", canGoBack || null, e)}
            >
              Back to EEC Results
            </Btn>
            <Btn
              variant="primary"
              to="career-dashboard"
              onClick={(e) => onNavigate?.("career-dashboard", null, e)}
            >
              Back to Submissions
            </Btn>
          </>
        ) : (
          <>
            <Btn
              variant="secondary"
              to="results"
              onClick={(e) => onNavigate?.("results", canGoBack || null, e)}
            >
              Back to My Result
            </Btn>
            <Btn
              variant="primary"
              to="home"
              onClick={(e) => onNavigate?.("home", null, e)}
            >
              Back Home
            </Btn>
          </>
        )}
      </div>
    </PageWrap>
  );
}
