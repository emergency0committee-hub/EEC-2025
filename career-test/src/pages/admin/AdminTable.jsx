// src/pages/admin/AdminTable.jsx
import React from "react";
import { Card } from "../../components/Layout.jsx";

export default function AdminTable({ rows }) {
  const head = [
    "Time","Name","Email","School","Top",
    "R","I","A","S","E","C",
    "Num%","Verb%","Log%","Duration(s)","Remaining(s)"
  ];

  const bgFor = (r) => {
    // If you later add validity flags, color rows here.
    return "transparent";
  };

  return (
    <Card>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.map((r, i) => (
              <tr key={i} style={{ background: bgFor(r) }}>
                <td>{new Date(r.ts).toLocaleString()}</td>
                <td>{r.name || "—"}</td>
                <td>{r.email || "—"}</td>
                <td>{r.school || "—"}</td>
                <td>{r.top3 || "—"}</td>
                <td>{r.riasec?.R || 0}</td>
                <td>{r.riasec?.I || 0}</td>
                <td>{r.riasec?.A || 0}</td>
                <td>{r.riasec?.S || 0}</td>
                <td>{r.riasec?.E || 0}</td>
                <td>{r.riasec?.C || 0}</td>
                <td>{r.aptitude?.Numerical ?? "—"}</td>
                <td>{r.aptitude?.Verbal ?? "—"}</td>
                <td>{r.aptitude?.Logical ?? "—"}</td>
                <td>{r.durationSec ?? "—"}</td>
                <td>{r.remainingSec ?? "—"}</td>
              </tr>
            ))}
            {!rows?.length && (
              <tr>
                <td colSpan={16} style={{ padding: 12, color: "#6b7280" }}>
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
