// src/components/OccupationScales.jsx
import React, { useEffect, useMemo, useState } from "react";
import { loadOccupations } from "../lib/occupations.js";
import { THEME_COLORS } from "./Chart.jsx";
import BarRow from "../pages/results/components/BarRow.jsx";

const COLORS = {
  E: THEME_COLORS?.E || "#3b82f6",
  A: THEME_COLORS?.A || "#f59e0b",
  R: THEME_COLORS?.R || "#ef4444",
  I: THEME_COLORS?.I || "#14b8a6",
  S: THEME_COLORS?.S || "#10b981",
  C: THEME_COLORS?.C || "#8b5cf6",
};

const UNIVERSITY_TIPS = {
  R: "Prioritize labs, makerspaces, field courses, or co-op rotations where you fabricate and troubleshoot real hardware.",
  I: "Join undergraduate research, analytics clubs, and honors seminars so you constantly investigate unanswered questions.",
  A: "Balance theory with studio/performance electives and leave each term with new portfolio pieces.",
  S: "Seek service-learning, tutoring, or peer mentoring courses to practice facilitation and empathy.",
  E: "Enter case competitions, entrepreneurship clubs, or student government to sharpen persuasion and leadership.",
  C: "Volunteer for finance, operations, or compliance projects inside campus organizations to master structured systems.",
};

const WORKPLACE_TIPS = {
  R: "Target apprenticeships, plant rotations, or technical field roles where you can see tangible outcomes.",
  I: "Look for diagnostics, experimentation, or product-testing roles that reward relentless curiosity.",
  A: "Join agile creative teams where briefs change often and collaboration with clients is constant.",
  S: "Choose jobs that involve onboarding, counseling, or client/patient care so you can support people daily.",
  E: "Aim for roles with clear metrics and ownership; you thrive when rallying teams toward bold targets.",
  C: "Support functions that depend on precision—finance, logistics, HR, or quality assurance—and become the process expert.",
};

const THEME_LANG = {
  R: "hands-on builder",
  I: "analytical investigator",
  A: "creative storyteller",
  S: "people-focused supporter",
  E: "strategic leader",
  C: "detail-driven organizer",
};

function describeThemeMix(themeStr = "") {
  const letters = String(themeStr).toUpperCase().replace(/[^RIASEC]/g, "").split("");
  const mapped = letters.slice(0, 3).map((L) => THEME_LANG[L] || L);
  if (!mapped.length) return "";
  if (mapped.length === 1) return mapped[0];
  if (mapped.length === 2) return `${mapped[0]} blended with ${mapped[1]}`;
  return `${mapped[0]}, ${mapped[1]}, and ${mapped[2]}`;
}

function buildOccupationInsight(letter, bucket) {
  if (!bucket.length) {
    return {
      title: `${letter} Opportunities`,
      body:
        "No matching occupations yet. Pursue a shadowing experience or short informational interview to gather more evidence for this pathway.",
    };
  }
  const top = bucket[0];
  const score = Math.round(top._score);
  const runnerUps = bucket.slice(1, 3);
  const runnerText = runnerUps.length
    ? ` Backup ideas: ${runnerUps
        .map((role) => `${role.occupation} (${Math.round(role._score)}%)`)
        .join(" and ")}.`
    : "";
  const uniTip = UNIVERSITY_TIPS[letter] || "";
  const workTip = WORKPLACE_TIPS[letter] || "";
  const mixDescription = describeThemeMix(top.theme);
  let action;
  if (score >= 80) {
    action = "Start building a portfolio or resume entry that mirrors this role’s responsibilities right away.";
  } else if (score >= 60) {
    action = "Pilot the role through a micro-internship or volunteer project before you commit fully.";
  } else {
    action = "Keep exploring nearby roles until one crosses your comfort threshold (60%+).";
  }
  return {
    title: `${letter} Match: ${top.occupation}`,
    body: `Expect work that suits a ${mixDescription}. University focus: ${uniTip} Real-world focus: ${workTip}. ${runnerText} ${action}`,
  };
}

function scoreFromTheme(themeStr, radarByCode) {
  const weights = [0.6, 0.25, 0.15]; // primary, secondary, tertiary
  const letters = String(themeStr || "")
    .toUpperCase()
    .replace(/[^RIASEC]/g, "")
    .split("");
  if (!letters.length) return 0;

  let score = 0;
  for (let i = 0; i < Math.min(3, letters.length); i++) {
    const L = letters[i];
    const pct = radarByCode[L] ?? 0;
    score += pct * weights[i];
  }
  return score;
}

export default function OccupationScales({ radarByCode = {}, themeOrder }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await loadOccupations();
      if (alive) setRows(Array.isArray(data) ? data : []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const order = useMemo(() => {
    const base = ["E", "A", "R", "I", "S", "C"];
    if (Array.isArray(themeOrder) && themeOrder.length) return themeOrder;
    return base
      .map((L) => ({ L, v: radarByCode[L] ?? 0 }))
      .sort((a, b) => b.v - a.v)
      .map((x) => x.L);
  }, [themeOrder, radarByCode]);

  const byPrimary = useMemo(() => {
    const g = { R: [], I: [], A: [], S: [], E: [], C: [] };
    for (const r of rows) {
      const t = String(r.theme || "").toUpperCase().replace(/\s+/g, "");
      if (!t) continue;
      const primary = t[0];
      if (g[primary]) {
        const sc = scoreFromTheme(t, radarByCode);
        g[primary].push({ ...r, _score: sc });
      }
    }
    Object.keys(g).forEach((k) => g[k].sort((a, b) => b._score - a._score));
    return g;
  }, [rows, radarByCode]);

  return (
    <div className="card section" style={{ padding: 16 }}>
      <h3 style={{ margin: 0, color: "#111827" }}>OCCUPATIONAL SCALES</h3>
      <p style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
        All occupations scored by your profile (weighted by theme codes like RIC, ASE, etc.).
      </p>
      <p style={{ margin: "4px 0 12px", color: "#475569", fontSize: 13 }}>
        <strong>How to read:</strong> Panels are ordered by your dominant RIASEC letters. Each bar shows
        the strength of fit between you and that career (0-100%). Higher bars mean your interests and aptitudes
        align more with that occupation.
      </p>

      <div
        className="print-stack"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginTop: 12,
        }}
      >
        {order.map((L) => {
          const bucket = byPrimary[L] || [];
          const color = COLORS[L];
          return (
            <div
              key={L}
              className="card avoid-break occupational-card"
              style={{ padding: 16, background: "#ffffff" }}
            >
              <div
                className="chart-with-aside"
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "nowrap",
                  alignItems: "stretch",
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
                  >
                    <h4 style={{ margin: 0, color: "#111827" }}>
                      {L} – {bucket.length ? `${bucket.length} roles` : "No matches"}
                    </h4>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: color,
                        display: "inline-block",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      maxHeight: 260,
                      overflowY: "auto",
                      paddingRight: 6,
                    }}
                  >
                    {bucket.length ? (
                      bucket.map((r, idx) => (
                        <BarRow
                          key={`${L}-${idx}`}
                          label={r.occupation}
                          subtitle={r.theme}
                          percent={r._score}
                          color={color}
                          chipColor={color}
                        />
                      ))
                    ) : (
                      <div style={{ color: "#6b7280", fontSize: 13 }}>
                        No matching occupations to display.
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
                  {(() => {
                    const insight = buildOccupationInsight(L, bucket);
                    return (
                      <>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {insight.title}
                        </div>
                        <p style={{ margin: 0, lineHeight: 1.4 }}>{insight.body}</p>
                      </>
                    );
                  })()}
                </aside>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
