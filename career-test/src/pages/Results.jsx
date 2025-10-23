// src/pages/Results.jsx
import React, { useMemo } from "react";
import { PageWrap, HeaderBar } from "../components/Layout.jsx";
import { RadarBlock, ThemeBarsBlock, THEME_COLORS } from "../components/Chart.jsx";
import OccupationScales from "../components/OccupationScales.jsx";

const THEME_NAME = {
  E: "ENTERPRISING",
  A: "ARTISTIC",
  R: "REALISTIC",
  I: "INVESTIGATIVE",
  S: "SOCIAL",
  C: "CONVENTIONAL",
};

function levelFromPct(p) {
  if (p >= 75) return "Very High";
  if (p >= 55) return "High";
  if (p >= 40) return "Moderate";
  return "Little";
}

function BarRow({ label, percent, color = "#2563eb" }) {
  return (
    <div style={{ marginBottom: 10 }}>
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
          height: 10,              // matches ThemeBars thickness
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
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        padding: 16,
      }}
    >
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

export default function Results({
  radarData = [],          // [{ code:'R'|'I'|'A'|'S'|'E'|'C', score:0..100 }]
  areaPercents = [],       // [{ area, code, percent }]
  interestPercents = [],   // optional; not shown here
  onNavigate,
  participant,             // { name, email, school, ts? }
  showParticipantHeader = false,
}) {
  // Map of theme → score
  const radarByCode = useMemo(() => {
    const m = {};
    (radarData || []).forEach((d) => (m[d.code] = d.score ?? 0));
    return m;
  }, [radarData]);

  // Sorted theme codes by score desc (used everywhere)
  const themeOrder = useMemo(
    () => [...(radarData || [])].sort((a, b) => b.score - a.score).map((d) => d.code),
    [radarData]
  );

  // Group areas by code, and sort each group desc by %; also keep a global top/least
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

  return (
    <PageWrap>
      <HeaderBar title="Results (Admin View)" />

      {/* Optional participant header (shown in Admin + PDF) */}
      {showParticipantHeader && participant && (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fff",
            padding: 16,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, color: "#111827" }}>Participant</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Name</div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {participant.name || "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Email</div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {participant.email || "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>School</div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {participant.school || "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Submitted</div>
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {participant.ts
                  ? new Date(participant.ts).toLocaleString()
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1) Radar */}
      <RadarBlock data={radarData} />

      {/* 2) Sorted theme bars (order used everywhere else) */}
      <ThemeBarsBlock data={radarData} />

      {/* 3) Top & least interest areas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 16,
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        <ListBox title="Your Top Five Interest Areas" items={topFive} />
        <ListBox title="Areas of Least Interest" items={leastThree} />
      </div>

      {/* 4) Basic Interest Scales grid in the SAME theme order */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          padding: 16,
        }}
      >
        <h3 style={{ margin: 0, color: "#111827" }}>BASIC INTEREST SCALES</h3>
        <p style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
          Percentages across specific interest areas within each RIASEC theme.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 8,
          }}
        >
          {themeOrder.map((code) => {
            const themeScore = radarByCode[code] ?? 0; // for level label
            const level = levelFromPct(themeScore);
            const areas = groupedAreas[code] || [];
            const color = THEME_COLORS[code] || "#2563eb";

            return (
              <div
                key={code}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  background: "#ffffff",
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
                    {THEME_NAME[code]}{" "}
                    <span
                      style={{ fontWeight: 400, color: "#6b7280", fontSize: 14 }}
                    >
                      — {level}
                    </span>
                  </h4>
                  {/* small color chip for the theme */}
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

      {/* 5) Occupational Scales (sorted by same theme order + per-occupation match %) */}
      <div style={{ marginTop: 16 }}>
        <OccupationScales radarByCode={radarByCode} themeOrder={themeOrder} />
      </div>

      {/* Footer */}
      <div
        style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}
      >
        <button
          onClick={() => onNavigate?.("home")}
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            padding: "10px 14px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Back Home
        </button>
      </div>
    </PageWrap>
  );
}
