// src/pages/admin/AdminTable.jsx
import React from "react";
import PropTypes from "prop-types";
import Btn from "../../components/Btn.jsx";

export default function AdminTable({ submissions, onViewSubmission, onDeleteSubmission }) {
  AdminTable.propTypes = {
    submissions: PropTypes.array.isRequired,
    onViewSubmission: PropTypes.func.isRequired,
    onDeleteSubmission: PropTypes.func,
  };

  if (!submissions || submissions.length === 0) {
    return <p style={{ color: "#6b7280" }}>No submissions found.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>ID</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Timestamp</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>RIASEC Code</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Actions</th>
          </tr>
        </thead>
                <tbody>
          {submissions.map((sub) => {
            const participant = sub.participant || sub.profile || {};
            const name = participant.name || "—";
            const school = participant.school || "—";
            const d = sub.ts ? new Date(sub.ts) : null;
            const dateStr = d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : "—";
            const timeStr = d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "—";
            return (
              <tr key={sub.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: 12 }}>{name}</td>
                <td style={{ padding: 12 }}>{school}</td>
                <td style={{ padding: 12 }}>{dateStr}</td>
                <td style={{ padding: 12 }}>{timeStr}</td>
                <td style={{ padding: 12, display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onViewSubmission(sub)}
                    title="View"
                    style={{ border: '1px solid #d1d5db', background: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => onDeleteSubmission?.(sub)}
                    title="Delete"
                    aria-label="Delete"
                    style={{ border: '1px solid #ef4444', background: '#fff', color: '#ef4444', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Delete
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


