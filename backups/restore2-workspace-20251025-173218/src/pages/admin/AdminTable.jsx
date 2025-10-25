// src/pages/admin/AdminTable.jsx
import React from "react";
import PropTypes from "prop-types";
import Btn from "../../components/Btn.jsx";

export default function AdminTable({ submissions, onViewSubmission }) {
  AdminTable.propTypes = {
    submissions: PropTypes.array.isRequired,
    onViewSubmission: PropTypes.func.isRequired,
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
          {submissions.map((sub) => (
            <tr key={sub.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: 12 }}>{sub.id}</td>
              <td style={{ padding: 12 }}>{new Date(sub.ts).toLocaleString()}</td>
              <td style={{ padding: 12 }}>{sub.riasec_code || "—"}</td>
              <td style={{ padding: 12 }}>
                <Btn variant="primary" onClick={() => onViewSubmission(sub)}>View</Btn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
