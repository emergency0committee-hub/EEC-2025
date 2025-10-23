// src/pages/Admin.jsx
import React, { useRef, useState } from "react";
import { PageWrap, HeaderBar } from "../components/Layout.jsx";
import Results from "./Results.jsx";
import { STR } from "../i18n/strings.js";

const STORAGE_KEY = "cg_submissions_v1";
const ADMIN_FLAG = "cg_admin_ok_v1";

const readSubs = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export default function Admin({ onNavigate, lang = "EN" }) {
  const t = STR[lang] || STR.EN;

  const [rows, setRows] = useState(readSubs());
  const [selected, setSelected] = useState(null);
  const resultsRef = useRef(null);

  const refresh = () => setRows(readSubs());

  const exportCSV = () => {
    const headers = [
      t.tableTime, t.tableName, t.tableEmail, t.tableSchool,
      "Duration(s)", "Remaining(s)", "Top3",
      "R","I","A","S","E","C","Num%","Verb%","Log%"
    ];
    const csv = [headers.join(",")]
      .concat(
        rows.map((r) =>
          [
            r.ts,
            r.name || "",
            r.email || "",
            r.school || "",
            r.durationSec ?? "",
            r.remainingSec ?? "",
            r.top3 || "",
            r.riasec?.R ?? 0,
            r.riasec?.I ?? 0,
            r.riasec?.A ?? 0,
            r.riasec?.S ?? 0,
            r.riasec?.E ?? 0,
            r.riasec?.C ?? 0,
            r.aptitude?.Numerical ?? "",
            r.aptitude?.Verbal ?? "",
            r.aptitude?.Logical ?? "",
          ].join(",")
        )
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "submissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_FLAG);
    onNavigate?.("home");
  };

  // ---- Export as PDF (print window with forced colors) ----
  const exportSelectedAsPDF = () => {
    if (!selected || !resultsRef.current) return;

    const participant = {
      name: selected.name || "—",
      email: selected.email || "—",
      school: selected.school || "—",
      ts: selected.ts ? new Date(selected.ts).toLocaleString() : "—",
    };

    const contentHTML = resultsRef.current.innerHTML;
    const w = window.open("", "printWindow", "width=1024,height=768");
    if (!w) return;

    const styles = `
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body {
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        margin: 24px; background-color: #ffffff; color: #111827;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      h1, h2, h3, h4 { margin: 0; }
      .header {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        background-color: #ffffff;
      }
      .row { display:flex; gap:16px; flex-wrap:wrap; }
      .cell { flex: 1; min-width: 220px; }
      .label { font-size: 12px; color: #6b7280; }
      .value { font-size: 14px; color: #111827; font-weight: 600; }
      .section {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        background-color: #ffffff;
      }
      .bar-bg {
        height: 10px;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #e5e7eb;
        background-color: #f3f4f6;
      }
      .bar-fill { height: 100%; background-color: #2563eb; }
      @media print {
        body { margin: 0.6in; }
        a, button { display: none !important; }
        .bar-bg, .bar-fill, svg {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;

    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Results – ${participant.name}</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin-bottom:8px;">${t.participantHdr}</h2>
            <div class="row">
              <div class="cell">
                <div class="label">${t.tableName}</div>
                <div class="value">${participant.name}</div>
              </div>
              <div class="cell">
                <div class="label">${t.tableEmail}</div>
                <div class="value">${participant.email}</div>
              </div>
              <div class="cell">
                <div class="label">${t.tableSchool}</div>
                <div class="value">${participant.school}</div>
              </div>
              <div class="cell">
                <div class="label">${t.submitted}</div>
                <div class="value">${participant.ts}</div>
              </div>
            </div>
          </div>

          <div class="section">
            ${contentHTML}
          </div>
        </body>
      </html>
    `);

    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
      w.close();
    }, 300);
  };

  return (
    <PageWrap>
      <HeaderBar
        title={t.adminTitle}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={refresh}
              style={{ border: "1px solid #d1d5db", background: "#fff", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
            >
              {t.refresh}
            </button>
            <button
              onClick={exportCSV}
              style={{ border: "1px solid #d1d5db", background: "#fff", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
            >
              {t.exportCSV}
            </button>
            <button
              onClick={logout}
              style={{ border: "1px solid #ef4444", background: "#ef4444", color: "#fff", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
            >
              {t.logout}
            </button>
          </div>
        }
      />

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[t.tableTime,t.tableName,t.tableEmail,t.tableSchool,t.tableR,t.tableI,t.tableA,t.tableS,t.tableE,t.tableC,t.tableView].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px" }}>{new Date(r.ts).toLocaleString()}</td>
                <td style={{ padding: "8px" }}>{r.name || "—"}</td>
                <td style={{ padding: "8px" }}>{r.email || "—"}</td>
                <td style={{ padding: "8px" }}>{r.school || "—"}</td>
                <td style={{ padding: "8px" }}>{r.riasec?.R ?? 0}</td>
                <td style={{ padding: "8px" }}>{r.riasec?.I ?? 0}</td>
                <td style={{ padding: "8px" }}>{r.riasec?.A ?? 0}</td>
                <td style={{ padding: "8px" }}>{r.riasec?.S ?? 0}</td>
                <td style={{ padding: "8px" }}>{r.riasec?.E ?? 0}</td>
                <td style={{ padding: "8px" }}>{r.riasec?.C ?? 0}</td>
                <td style={{ padding: "8px" }}>
                  <button
                    onClick={() => setSelected(r)}
                    style={{ border: "1px solid #d1d5db", background: "#fff", padding: "6px 10px", borderRadius: 8, cursor: "pointer" }}
                  >
                    {t.tableView}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={11} style={{ padding: "12px", color: "#6b7280" }}>
                  {t.noSubs}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected result with Export button */}
      {selected && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setSelected(null)}
              style={{ border: "1px solid #d1d5db", background: "#fff", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
            >
              Close
            </button>
            <button
              onClick={exportSelectedAsPDF}
              style={{ border: "1px solid #2563eb", background: "#2563eb", color: "#fff", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
            >
              {t.exportPDF}
            </button>
          </div>

          <div ref={resultsRef}>
            <Results
              radarData={selected.radarData || []}
              areaPercents={selected.areaPercents || []}
              interestPercents={selected.interestPercents || []}
              participant={{
                name: selected.name,
                email: selected.email,
                school: selected.school,
                ts: selected.ts,
              }}
              showParticipantHeader={true}
              onNavigate={() => setSelected(null)}
            />
          </div>
        </div>
      )}
    </PageWrap>
  );
}
