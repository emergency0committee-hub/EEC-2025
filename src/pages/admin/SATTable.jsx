// src/pages/admin/SATTable.jsx
import React from "react";
import PropTypes from "prop-types";

export default function SATTable({ rows, onView, onDelete }) {
  SATTable.propTypes = {
    rows: PropTypes.array.isRequired,
    onView: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
  };

  if (!rows || rows.length === 0) {
    return <p style={{ color: "#6b7280" }}>No SAT submissions found.</p>;
  }

  const fmt = (iso, fmtTime = false) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return fmtTime
      ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  };

  const fmtDur = (sec) => {
    if (!Number.isFinite(sec)) return "—";
    const mm = Math.floor(sec / 60).toString().padStart(2, "0");
    const ss = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M2.458 12C3.732 7.943 7.522 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.478 0-8.268-2.943-9.542-7Z" stroke="#374151" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="3" stroke="#374151" strokeWidth="1.6"/>
    </svg>
  );
  const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M9.5 4h5l.75 2H20v2H4V6h4.75L9.5 4Z" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M7 9l1 10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-10" stroke="#ef4444" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M10 11v7M14 11v7" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );

  const IconButton = ({ title, onClick, variant = "neutral", children }) => (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: 8, cursor: "pointer",
        background: "#fff", border: `1px solid ${variant === "danger" ? "#ef4444" : "#d1d5db"}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = variant === 'danger' ? '#fef2f2' : '#f9fafb')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
    >
      {children}
    </button>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>User</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Date</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Time</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>RW</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Math</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Duration</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Manage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const email = r.user_email || "—";
            const rw = r.pillar_agg?.summary?.rw || { correct: 0, total: 0 };
            const math = r.pillar_agg?.summary?.math || { correct: 0, total: 0 };
            const elapsed = r.pillar_counts?.elapsedSec;
            return (
              <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: 12 }}>{email}</td>
                <td style={{ padding: 12 }}>{fmt(r.ts)}</td>
                <td style={{ padding: 12 }}>{fmt(r.ts, true)}</td>
                <td style={{ padding: 12 }}>{rw.correct}/{rw.total}</td>
                <td style={{ padding: 12 }}>{math.correct}/{math.total}</td>
                <td style={{ padding: 12 }}>{fmtDur(elapsed)}</td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: "inline-flex", gap: 8 }}>
                    <IconButton title="View details" onClick={() => onView(r)}><EyeIcon /></IconButton>
                    <IconButton title="Delete" variant="danger" onClick={() => onDelete?.(r)}><TrashIcon /></IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

