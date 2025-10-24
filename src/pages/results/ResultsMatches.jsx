// src/pages/results/ResultsMatches.jsx
import React from "react";
import { Card } from "../../components/Layout.jsx";

export default function ResultsMatches({ code, loading, error, groups }) {
  const { exact = [], strong = [], related = [], loose = [] } = groups || {};
  const hasAny = (exact.length + strong.length + related.length + loose.length) > 0;

  const MatchRow = ({ name, percent }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
        <span style={{ color: "#111827", fontWeight: 500 }}>{name}</span>
        <span style={{ color: "#374151" }}>{percent}%</span>
      </div>
      <div style={{ width: "100%", height: 8, background: "#eef2ff", borderRadius: 999 }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            height: "100%",
            background: "#2563eb",
            borderRadius: 999,
            transition: "width 180ms ease",
          }}
        />
      </div>
    </div>
  );

  const Group = ({ title, items }) => {
    if (!items?.length) return null;
    return (
      <div style={{ marginTop: 14 }}>
        <h4 style={{ margin: "0 0 8px", color: "#111827" }}>{title}</h4>
        {items.map((r, i) => {
          const p = Math.round(Math.max(0, Math.min(100, Number(r._score) || 0)));
          return <MatchRow key={`${title}-${i}`} name={r.Occupation} percent={p} />;
        })}
      </div>
    );
  };

  return (
    <Card style={{ marginTop: 12 }}>
      {/* Theme code badge (kept at top) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, color: "#111827" }}>Matches</h3>
        <div
          style={{
            fontWeight: 700,
            color: "#111827",
            background: "#eef2ff",
            border: "1px solid #e5e7eb",
            padding: "6px 12px",
            borderRadius: 999,
            minWidth: 72,
            textAlign: "center",
          }}
          aria-label="Theme code"
        >
          {code || "—"}
        </div>
      </div>

      {loading && <p style={{ color: "#6b7280", marginTop: 10 }}>Loading recommendations…</p>}
      {error && <p style={{ color: "#b91c1c", marginTop: 10 }}>{error}</p>}

      {!loading && !error && (
        <>
          <Group title="Best Matches (Exact)" items={exact} />
          <Group title="Strong Matches (Permutation / Subset / Superset)" items={strong} />
          <Group title="Related Matches (Letter Overlap)" items={related} />
          {!hasAny && (
            <p style={{ color: "#6b7280", marginTop: 10 }}>
              No occupations matched your profile in the current list.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
