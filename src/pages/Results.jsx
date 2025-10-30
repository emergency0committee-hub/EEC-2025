import React, { useMemo, useState, useEffect } from "react";
import { PageWrap, HeaderBar } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { THEME_COLORS } from "../components/Chart.jsx";
import OccupationScales from "../components/OccupationScales.jsx";
import ResultsRadar from "./results/ResultsRadar.jsx";
import ResultsRiasecBars from "./results/ResultsRiasecBars.jsx";
import ResultsMatches from "./results/ResultsMatches.jsx";
import { Q_UNIFIED as Q, RIASEC_SCALE_MAX } from "../questionBank.js";
import { supabase } from "../lib/supabase.js";
import { loadOccupations, pickByPrimaryLetter } from "../lib/occupations.js";

const THEME_NAME = {
  E: "ENTERPRISING",
  A: "ARTISTIC",
  R: "REALISTIC",
  I: "INVESTIGATIVE",
  S: "SOCIAL",
  C: "CONVENTIONAL",
};

function colorForPct(pct) {
  const p = Math.max(0, Math.min(100, Number(pct || 0)));
  if (p < 20) return "#ef4444";
  if (p < 40) return "#f97316";
  if (p < 60) return "#facc15";
  if (p < 80) return "#84cc16";
  return "#22c55e";
}

function levelFromPct(p) {
  if (p >= 75) return "Very High";
  if (p >= 55) return "High";
  if (p >= 40) return "Moderate";
  return "Little";
}

function BarRow({ label, percent, color = "#2563eb" }) {
  return (
    <div className="avoid-break" style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: "#374151",
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div
        style={{
          height: 10,
          background: "#f3f4f6",
          borderRadius: 6,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function ListBox({ title, items }) {
  return (
    <div className="card avoid-break" style={{ padding: 16 }}>
      <h4 style={{ margin: 0, color: "#111827" }}>{title}</h4>
      <ol style={{ margin: "8px 0 0", paddingLeft: 18, color: "#374151" }}>
        {items.map((it, i) => (
          <li key={i} style={{ margin: "4px 0" }}>
            <span style={{ fontWeight: 600 }}>{it.area}</span>{" "}
            <span style={{ color: "#6b7280" }}>({Math.round(it.percent)}%)</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------------- Pillar helpers (percentages) ---------------------- */
function buildBankDenominators() {
  const discCount = { D: 0, I: 0, S: 0, C: 0 };
  const bloomCount = {};
  const sdgCount = {};
  for (const q of Q || []) {
    if (q?.DISC && discCount[q.DISC] != null) discCount[q.DISC] += 1;
    if (q?.BLOOM) bloomCount[q.BLOOM] = (bloomCount[q.BLOOM] || 0) + 1;
    if (q?.UN_Goal) sdgCount[q.UN_Goal] = (sdgCount[q.UN_Goal] || 0) + 1;
  }
  return { discCount, bloomCount, sdgCount };
}

function pctRowsFromTotals(totals, counts) {
  const out = [];
  for (const [label, sum] of Object.entries(totals || {})) {
    const count = counts?.[label] || 0;
    const max = count * RIASEC_SCALE_MAX;
    const pct = max > 0 ? Math.round((Number(sum || 0) / max) * 100) : 0;
    out.push([label, pct]);
  }
  out.sort((a, b) => b[1] - a[1]);
  return out;
}

export default function Results({
  radarData = [],          // [{ code, score }]
  areaPercents = [],       // [{ area, code, percent }]
  interestPercents = [],   // (optional)
  onNavigate,
  participant,
  showParticipantHeader = false,
  fromAdmin = false,
  submission,
  pillarAgg,
  pillarCounts,
}) {
  // If an admin passed a 'submission' record, derive props from it
  if (submission) {
    radarData = submission.radar_data || radarData;
    areaPercents = submission.area_percents || areaPercents;
    participant = submission.participant || submission.profile || participant;
    pillarAgg = submission.pillar_agg || pillarAgg;
    pillarCounts = submission.pillar_counts || pillarCounts;
    fromAdmin = true;
  }
  // Get selected sections from localStorage
  const selectedSections = useMemo(() => {
    try {
      const stored = localStorage.getItem("selectedResultsSections");
      return stored ? JSON.parse(stored) : {
        riasec: true,
        areas: true,
        scales: true,
        occupations: true,
        pillars: true,
      };
    } catch {
      return {
        riasec: true,
        areas: true,
        scales: true,
        occupations: true,
        pillars: true,
      };
    }
  }, []);
  // Map of theme code to score
  const radarByCode = useMemo(() => {
    const m = {};
    (radarData || []).forEach((d) => (m[d.code] = d.score ?? 0));
    return m;
  }, [radarData]);

  const themeOrder = useMemo(
    () => [...(radarData || [])].sort((a, b) => b.score - a.score).map((d) => d.code),
    [radarData]
  );

  const groupedAreas = useMemo(() => {
    const g = {};
    (areaPercents || []).forEach((a) => {
      if (!g[a.code]) g[a.code] = [];
      g[a.code].push(a);
    });
    Object.keys(g).forEach((k) => g[k].sort((x, y) => y.percent - x.percent));
    return g;
  }, [areaPercents]);

  const sortedAllAreas = useMemo(
    () => [...(areaPercents || [])].sort((a, b) => b.percent - a.percent),
    [areaPercents]
  );
  const topFive = sortedAllAreas.slice(0, 5);
  const leastThree = sortedAllAreas.slice(-3).reverse();
  const dash = "\u2014";
  const normalizeValue = (value) => {
    if (value == null) return null;
    if (typeof value === "number") return String(value);
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return null;
  };
  const displayValue = (...values) => {
    for (const candidate of values) {
      const normalized = normalizeValue(candidate);
      if (normalized) return normalized;
    }
    return dash;
  };
  const candidateName = displayValue(participant?.name, participant?.fullName, participant?.email);
  const schoolValue = displayValue(participant?.school);
  const classValue = displayValue(
    participant?.className,
    participant?.class,
    participant?.grade,
    participant?.section,
    participant?.classroom
  );
  const phoneValue = displayValue(participant?.phone, participant?.tel, participant?.phoneNumber);
  const hasParticipantDetails = Boolean(participant || submission);
  const shouldShowParticipantCard = hasParticipantDetails || showParticipantHeader;
  const detailRows = useMemo(
    () => [
      { label: "Name", value: candidateName },
      { label: "School", value: schoolValue },
      { label: "Class", value: classValue },
      { label: "Phone", value: phoneValue },
    ],
    [candidateName, schoolValue, classValue, phoneValue]
  );

  /* ---------------------- Load pillars & counts (partial-safe) ---------------------- */
  const { totals, counts } = useMemo(() => {
    if (pillarAgg || pillarCounts) {
      return {
        totals: pillarAgg || { disc: {}, bloom: {}, sdg: {} },
        counts: pillarCounts || { discCount: {}, bloomCount: {}, sdgCount: {} },
      };
    }
    try {
      const rows = JSON.parse(localStorage.getItem("cg_submissions_v1") || "[]");
      const last = Array.isArray(rows) && rows.length ? rows[rows.length - 1] : null;
      if (last) {
        return {
          totals: last.pillarAgg || { disc: {}, bloom: {}, sdg: {} },
          counts: last.pillarCounts || { discCount: {}, bloomCount: {}, sdgCount: {} },
        };
      }
    } catch {}
    return { totals: { disc: {}, bloom: {}, sdg: {} }, counts: { discCount: {}, bloomCount: {}, sdgCount: {} } };
  }, [pillarAgg, pillarCounts]);

  const bankDenoms = useMemo(() => buildBankDenominators(), []);
  const effectiveCounts = useMemo(() => {
    const useAnswered = (obj) => obj && Object.keys(obj).length > 0;
    return {
      disc: useAnswered(counts.discCount) ? counts.discCount : bankDenoms.discCount,
      bloom: useAnswered(counts.bloomCount) ? counts.bloomCount : bankDenoms.bloomCount,
      sdg: useAnswered(counts.sdgCount) ? counts.sdgCount : bankDenoms.sdgCount,
    };
  }, [counts, bankDenoms]);

  const discPct  = useMemo(() => pctRowsFromTotals(totals.disc,  effectiveCounts.disc),  [totals, effectiveCounts]);
  const bloomPct = useMemo(() => pctRowsFromTotals(totals.bloom, effectiveCounts.bloom), [totals, effectiveCounts]);
  const sdgPct   = useMemo(() => pctRowsFromTotals(totals.sdg,   effectiveCounts.sdg),   [totals, effectiveCounts]);

  /* ---------------------- Print helpers ---------------------- */
  const handlePrint = () => {
    setTimeout(() => window.print(), 150);
  };

  return (
    <PageWrap>
      {/* Print styles - elegant PDF distribution */}
      <style>{`
        /* Base card style used across sections */
        .card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
        }
        .avoid-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .section {
          margin-bottom: 16px;
        }

        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: #fff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .section { break-inside: avoid; page-break-inside: avoid; }
          h3, h4 { break-after: avoid; }

          /* Tighten spacing and make a single-column PDF layout */
          .print-stack {
            display: block !important;
          }
          .print-stack > * {
            margin-bottom: 10px !important;
          }

          /* Reduce paddings for cards in print to fit more per page */
          .card { padding: 12px !important; }

          /* Ensure canvases and svgs don't split and keep quality */
          canvas, svg {
            break-inside: avoid;
            page-break-inside: avoid;
            max-width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>

      <HeaderBar title={fromAdmin ? "Submission View" : "Results (Admin View)"} />

      {/* Actions (hidden on print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, margin: "8px 0 12px" }}>
        <Btn variant="secondary" onClick={() => onNavigate(fromAdmin ? "admin-dashboard" : "home")}>
          {fromAdmin ? "Back to Submissions" : "Back Home"}
        </Btn>
        <Btn variant="primary" onClick={handlePrint} title="Export to PDF">
          Export PDF
        </Btn>
      </div>

      {/* Candidate Details Card */}
      {shouldShowParticipantCard && (
        <div className="card avoid-break section" style={{ padding: 16 }}>
          <h3 style={{ margin: 0, color: "#111827" }}>Candidate Details</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 10,
            }}
            className="avoid-break"
          >
            {detailRows.map((row) => (
              <div key={row.label}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{row.label}</div>
                <div style={{ fontWeight: 600, color: "#111827" }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GROUP 1: Radar + Theme Bars (kept together) */}
      <div className="section avoid-break">
        <div className="card avoid-break" style={{ padding: 16 }}>
          <div className="avoid-break">
            <ResultsRadar data={radarData} />
          </div>
          <div className="avoid-break" style={{ marginTop: 12 }}>
            <ResultsRiasecBars rows={radarData.map(d => ({ code: d.code, percent: d.score }))} />
          </div>
        </div>
      </div>

      {/* GROUP 2: Top & Least Areas (kept together) */}
      <div className="section avoid-break">
        <div
          className="print-stack"
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 16,
          }}
        >
          <ListBox title="Your Top Five Interest Areas" items={topFive} />
          <ListBox title="Areas of Least Interest" items={leastThree} />
        </div>
      </div>

      {/* GROUP 3: Basic Interest Scales (theme cards) */}
      <div className="card section" style={{ padding: 16 }}>
        <h3 style={{ margin: 0, color: "#111827" }}>BASIC INTEREST SCALES</h3>
        <p style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
          Percentages across specific interest areas within each RIASEC theme.
        </p>

        <div
          className="print-stack"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 8,
          }}
        >
          {themeOrder.map((code) => {
            const themeScore = radarByCode[code] ?? 0;
            const level = levelFromPct(themeScore);
            const areas = groupedAreas[code] || [];
            const color = THEME_COLORS[code] || "#2563eb";
            return (
              <div
                key={code}
                className="card avoid-break"
                style={{ padding: 12, background: "#ffffff" }}
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
                    {THEME_NAME[code]}{" "}
                    <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 14 }}>
                      Level: {level}
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

                <div style={{ marginTop: 10 }}>
                  {areas.length ? (
                    areas.map((a) => (
                      <BarRow
                        key={`${code}-${a.area}`}
                        label={a.area}
                        percent={a.percent}
                        color={color}
                      />
                    ))
                  ) : (
                    <div style={{ color: "#6b7280", fontSize: 13 }}>
                      No answers recorded for this theme.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GROUP 4: Occupational Scales (kept together) */}
      <div className="card section avoid-break" style={{ padding: 16 }}>
        <OccupationScales radarByCode={radarByCode} themeOrder={themeOrder} />
      </div>

      {/* PAGE BREAK before pillars, for a clean pillar page */}
      <div className="no-print" style={{ height: 1 }} />
      <div
        style={{
          pageBreakBefore: "always",
          breakBefore: "page",
          height: 0,
          overflow: "hidden",
        }}
      />

      {/* GROUP 5: Pillars - three elegant cards */}
      {[
        { title: "DISC", data: useMemo(() => pctRowsFromTotals(totals.disc, effectiveCounts.disc), [totals, effectiveCounts]), color: "#6366f1" },
        { title: 'Bloom\'s Taxonomy', data: useMemo(() => pctRowsFromTotals(totals.bloom, effectiveCounts.bloom), [totals, effectiveCounts]), color: '#06b6d4' },
        { title: "UN Sustainable Development Goals", data: useMemo(() => pctRowsFromTotals(totals.sdg, effectiveCounts.sdg), [totals, effectiveCounts]), color: "#f59e0b" },
      ].map((section) => (
        <div key={section.title} className="card section avoid-break" style={{ padding: 16 }}>
          <h3 style={{ margin: 0, color: "#111827" }}>
            {section.title} (Percent of Max)
          </h3>
          <p style={{ margin: "6px 0 12px", color: "#6b7280", fontSize: 13 }}>
            % = (your total / (answered * {RIASEC_SCALE_MAX})) * 100
          </p>
          {section.data.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No data.</div>
          ) : (
            section.data.map(([label, pct]) => (
              <BarRow key={label} label={label} percent={pct} color={section.color} />
            ))
          )}
        </div>
      ))}

      {/* Footer actions (hidden in print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        <Btn variant="secondary" onClick={() => onNavigate?.(fromAdmin ? "admin-dashboard" : "home")}>
          {fromAdmin ? "Back to Submissions" : "Back Home"}
        </Btn>
        <Btn variant="primary" onClick={handlePrint} title="Export to PDF">
          Export PDF
        </Btn>
      </div>
    </PageWrap>
  );
}





