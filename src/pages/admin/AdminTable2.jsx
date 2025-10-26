// src/pages/admin/AdminTable2.jsx
import React from "react";
import PropTypes from "prop-types";

export default function AdminTable2({ submissions, onViewSubmission, onDeleteSubmission }) {
  AdminTable2.propTypes = {
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

  const IconButton = ({ title, ariaLabel, variant = "neutral", onClick, children }) => {
    const base = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: 8,
      background: '#fff',
      cursor: 'pointer',
      border: '1px solid #d1d5db',
      transition: 'background 120ms ease, box-shadow 120ms ease',
    };
    const style = variant === 'danger'
      ? { ...base, border: '1px solid #ef4444' }
      : base;
    return (
      <button
        onClick={onClick}
        title={title}
        aria-label={ariaLabel || title}
        style={style}
        onMouseEnter={(e) => (e.currentTarget.style.background = variant === 'danger' ? '#fef2f2' : '#f9fafb')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
      >
        {children}
      </button>
    );
  };

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
            const finished = p.finished_at || sub.ts || sub.created_at || null;
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
                <td style={{ padding: 12 }}>
                  <div style={{ display: 'inline-flex', gap: 8 }}>
                    <IconButton title="View details" ariaLabel="View details" onClick={() => onViewSubmission(sub)}>
                      <EyeIcon />
                    </IconButton>
                    <IconButton title="Delete submission" ariaLabel="Delete submission" variant="danger" onClick={() => onDeleteSubmission?.(sub)}>
                      <TrashIcon />
                    </IconButton>
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
