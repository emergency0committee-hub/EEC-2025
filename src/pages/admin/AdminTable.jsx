// src/pages/admin/AdminTable.jsx
import React from "react";
import PropTypes from "prop-types";

export default function AdminTable({ submissions, onViewSubmission, onDeleteSubmission }) {
  AdminTable.propTypes = {
    submissions: PropTypes.array.isRequired,
    onViewSubmission: PropTypes.func.isRequired,
    onDeleteSubmission: PropTypes.func,
  };

  if (!submissions || submissions.length === 0) {
    return <p style={{ color: "#6b7280" }}>No submissions found.</p>;
  }

  const fmtDuration = (startIso, endIso) => {
    try {
      const s = startIso ? new Date(startIso).getTime() : NaN;
      const e = endIso ? new Date(endIso).getTime() : NaN;
      if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return "—";
      const sec = Math.round((e - s) / 1000);
      const mm = Math.floor(sec / 60).toString().padStart(2, "0");
      const ss = (sec % 60).toString().padStart(2, "0");
      return `${mm}:${ss}`;
    } catch {
      return "—";
    }
  };

  const EyeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9Z" fill="#374151"/>
    </svg>
  );

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z" fill="#ef4444"/>
    </svg>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Name</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>School</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Date</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Time</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Duration</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Manage</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => {
            const p = sub.participant || sub.profile || {};
            const name = p.name || "—";
            const school = p.school || "—";
            const finished = p.finished_at || sub.ts || null;
            const d = finished ? new Date(finished) : null;
            const dateStr = d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : "—";
            const timeStr = d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "—";
            const duration = fmtDuration(p.started_at, p.finished_at);
            return (
              <tr key={sub.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: 12 }}>{name}</td>
                <td style={{ padding: 12 }}>{school}</td>
                <td style={{ padding: 12 }}>{dateStr}</td>
                <td style={{ padding: 12 }}>{timeStr}</td>
                <td style={{ padding: 12 }}>{duration}</td>
                <td style={{ padding: 12, display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onViewSubmission(sub)}
                    title="View details"
                    aria-label="View details"
                    style={{ border: '1px solid #d1d5db', background: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    <EyeIcon />
                  </button>
                  <button
                    onClick={() => onDeleteSubmission?.(sub)}
                    title="Delete submission"
                    aria-label="Delete submission"
                    style={{ border: '1px solid #ef4444', background: '#fff', color: '#ef4444', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}