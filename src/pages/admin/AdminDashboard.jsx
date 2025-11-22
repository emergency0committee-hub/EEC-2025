// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import AdminTable from "./AdminTable2.jsx";
import AdminLegend from "./AdminLegend.jsx";
import { supabase } from "../../lib/supabase.js";
import Results from "../Results.jsx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { createRoot } from "react-dom/client";
import resultsPrintStyles from "../results/printStyles.js";

export default function AdminDashboard({ onNavigate }) {
  AdminDashboard.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [bulkSet, setBulkSet] = useState(null);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [timerMin, setTimerMin] = useState(() => {
    const saved = Number(localStorage.getItem("cg_timer_min") || 60);
    return Number.isFinite(saved) && saved > 0 ? saved : 60;
  });

  useEffect(() => {
    try {
      localStorage.setItem("cg_timer_min", String(timerMin));
    } catch (err) {
      console.warn("Failed to persist timer minutes", err);
    }
  }, [timerMin]);

  const realSubmissions = useMemo(
    () => submissions.filter((s) => !s?._demo),
    [submissions]
  );

  const schoolOptions = useMemo(() => {
    const unique = new Set();
    realSubmissions.forEach((sub) => {
      const p = sub?.participant || sub?.profile || {};
      const school = (p.school || "").trim();
      if (school) {
        unique.add(school);
      }
    });
    return Array.from(unique).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [realSubmissions]);

  const getSchool = (submission) => {
    if (!submission) return "";
    const p = submission.participant || submission.profile || {};
    return (p.school || "").trim();
  };

  const bulkEntries = bulkSet?.entries || [];
  const bulkActive = bulkEntries.length > 0;

  const visibleSubmissions = useMemo(() => {
    if (!selectedSchool) return submissions;
    const target = selectedSchool.trim().toLowerCase();
    return submissions.filter(
      (sub) => getSchool(sub).trim().toLowerCase() === target
    );
  }, [submissions, selectedSchool]);

  // Render full Results layout to canvas, then into PDF
  // Render full Results layout to PDF (multi-page, matches single export)
  const renderResultsToPdf = (submission) =>
    new Promise((resolve, reject) => {
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-20000px";
      container.style.top = "0";
      container.style.width = "1000px";
      container.style.padding = "24px";
      container.style.background = "#ffffff";
      container.style.zIndex = "-1";
      container.style.opacity = "1";
      document.body.appendChild(container);
      const style = document.createElement("style");
      style.textContent = `
        ${resultsPrintStyles}
        .no-print { display: none !important; visibility: hidden !important; }
        .card {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .section, .avoid-break, .print-stack {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      `;
      container.appendChild(style);
      const root = createRoot(container);
      root.render(<Results submission={submission} fromAdmin onNavigate={() => {}} />);

      const cleanup = () => {
        try { root.unmount(); } catch {}
        try { container.remove(); } catch {}
      };

      const makePdf = async () => {
        try {
          // Allow the DOM to render
          await new Promise((r) => requestAnimationFrame(r));
          await new Promise((r) => setTimeout(r, 300));
          const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
          if (!canvas || !canvas.width || !canvas.height) throw new Error("Canvas render failed");

          const pdf = new jsPDF({ unit: "pt", format: "a4" });
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = 20;
          const usableWidth = pageWidth - margin * 2;
          const usableHeight = pageHeight - margin * 2;

          // Compute the height in px that fits one PDF page
          const ratio = usableWidth / canvas.width;
          const pageCanvasHeight = Math.floor(usableHeight / ratio);

          let rendered = 0;
          let pageIndex = 0;

          while (rendered < canvas.height) {
            const sliceHeight = Math.min(pageCanvasHeight, canvas.height - rendered);
            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;
            const ctx = pageCanvas.getContext("2d");
            ctx.drawImage(
              canvas,
              0,
              rendered,
              canvas.width,
              sliceHeight,
              0,
              0,
              canvas.width,
              sliceHeight
            );
            const imgData = pageCanvas.toDataURL("image/png");
            const imgHeightPt = (sliceHeight * usableWidth) / canvas.width;
            if (pageIndex > 0) pdf.addPage();
            pdf.addImage(imgData, "PNG", margin, margin, usableWidth, imgHeightPt, undefined, "FAST");
            rendered += sliceHeight;
            pageIndex += 1;
          }

          const buf = pdf.output("arraybuffer");
          resolve(new Uint8Array(buf));
        } catch (e) {
          reject(e);
        } finally {
          cleanup();
        }
      };

      makePdf();
      setTimeout(() => {
        cleanup();
        reject(new Error("PDF render timeout"));
      }, 30000);
    });

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();
  const crc32 = (buf) => {
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  };

  const buildZip = (files) => {
    const encoder = new TextEncoder();
    let offset = 0;
    const parts = [];
    const central = [];
    files.forEach(({ name, data }) => {
      const nameBuf = encoder.encode(name);
      const crc = crc32(data);
      const size = data.length;
      const localHeader = new Uint8Array(30 + nameBuf.length);
      const view = new DataView(localHeader.buffer);
      view.setUint32(0, 0x04034b50, true); // local file header signature
      view.setUint16(4, 20, true); // version needed
      view.setUint16(6, 0, true); // flags
      view.setUint16(8, 0, true); // method store
      view.setUint16(10, 0, true); // time
      view.setUint16(12, 0, true); // date
      view.setUint32(14, crc, true);
      view.setUint32(18, size, true);
      view.setUint32(22, size, true);
      view.setUint16(26, nameBuf.length, true);
      view.setUint16(28, 0, true); // extra length
      localHeader.set(nameBuf, 30);
      const fileRecord = new Uint8Array(localHeader.length + data.length);
      fileRecord.set(localHeader, 0);
      fileRecord.set(data, localHeader.length);
      parts.push(fileRecord);

      const centralHeader = new Uint8Array(46 + nameBuf.length);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true); // central file header signature
      cv.setUint16(4, 20, true); // version made by
      cv.setUint16(6, 20, true); // version needed
      cv.setUint16(8, 0, true); // flags
      cv.setUint16(10, 0, true); // method
      cv.setUint16(12, 0, true); // time
      cv.setUint16(14, 0, true); // date
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBuf.length, true);
      cv.setUint16(30, 0, true); // extra
      cv.setUint16(32, 0, true); // comment
      cv.setUint16(34, 0, true); // disk number
      cv.setUint16(36, 0, true); // internal attrs
      cv.setUint32(38, 0, true); // external attrs
      cv.setUint32(42, offset, true); // local header offset
      centralHeader.set(nameBuf, 46);
      central.push(centralHeader);
      offset += fileRecord.length;
    });
    const centralSize = central.reduce((sum, c) => sum + c.length, 0);
    const centralOffset = offset;
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); // end of central dir
    ev.setUint16(4, 0, true); // disk number
    ev.setUint16(6, 0, true); // central dir start disk
    ev.setUint16(8, files.length, true); // entries this disk
    ev.setUint16(10, files.length, true); // total entries
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralOffset, true);
    ev.setUint16(20, 0, true); // comment length

    const totalSize = offset + centralSize + end.length;
    const zip = new Uint8Array(totalSize);
    let cursor = 0;
    parts.forEach((p) => { zip.set(p, cursor); cursor += p.length; });
    central.forEach((c) => { zip.set(c, cursor); cursor += c.length; });
    zip.set(end, cursor);
    return new Blob([zip], { type: "application/zip" });
  };

  const handleBulkExport = async () => {
    if (!selectedSchool) return;
    const target = selectedSchool.trim().toLowerCase();
    const entries = realSubmissions.filter(
      (sub) => !sub?._demo && getSchool(sub).trim().toLowerCase() === target
    );
    if (!entries.length) {
      alert("No submissions found for the selected school yet.");
      return;
    }
    setBulkStatus("Preparing PDFs...");
    setBulkProgress(0);
    try {
      const files = [];
      for (let i = 0; i < entries.length; i++) {
        const sub = entries[i];
        const pdfData = await renderResultsToPdf(sub);
        const nameSafe =
          (sub.participant?.name || sub.profile?.name || `student-${i + 1}`)
            .replace(/[^a-z0-9-_]+/gi, "_")
            .replace(/^_+|_+$/g, "") || `student-${i + 1}`;
        const fileName = `${nameSafe || "submission"}-${sub.id || i + 1}.pdf`;
        files.push({ name: fileName, data: pdfData });
        setBulkStatus(`Rendering ${i + 1} of ${entries.length}`);
        setBulkProgress(Math.round(((i + 1) / entries.length) * 85)); // up to 85% during render
      }
      setBulkStatus("Zipping files...");
      setBulkProgress(95);
      const zipBlob = buildZip(files);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedSchool.replace(/\s+/g, "_") || "school"}_submissions.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBulkProgress(100);
      setTimeout(() => {
        setBulkStatus("");
        setBulkProgress(0);
      }, 1500);
    } catch (err) {
      console.error("Bulk export failed", err);
      alert(err?.message || "Failed to generate bulk export.");
    } finally {
      if (bulkProgress === 0) {
        setBulkStatus("");
      }
    }
  };

  useEffect(() => {
    if (!bulkActive) {
      return;
    }

    const fireResize = () => {
      try {
        window.dispatchEvent(new Event("resize"));
      } catch (err) {
        console.warn("Bulk export resize dispatch failed", err);
      }
    };

    fireResize();
    const resizeTimer = setTimeout(fireResize, 150);
    const printTimer = setTimeout(() => {
      fireResize();
      try {
        window.print();
      } catch (err) {
        console.error("Failed to start bulk print", err);
      }
    }, 700);

    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(printTimer);
    };
  }, [bulkActive]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setBulkSet(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const envTable = import.meta.env.VITE_SUBMISSIONS_TABLE;
        // Prefer new table, then env override, then old table as fallback to show historic rows
        const candidates = Array.from(new Set([
          "cg_results",
          envTable,
          "cg_submissions",
        ].filter(Boolean)));
        try { console.info("Admin fetch candidates:", candidates); } catch {}
        let rows = [];
        let lastErr = null;
        for (const table of candidates) {
          try {
            let resp = await supabase.from(table).select("*").order("ts", { ascending: false });
            if (resp.error) {
              // Retry ordering by id if ts is missing
              try {
                resp = await supabase.from(table).select("*").order("id", { ascending: false });
              } catch (_) {}
            }
            if (resp.error) { lastErr = resp.error; continue; }
            rows = Array.isArray(resp.data) ? resp.data : [];
            if (rows.length) {
              break;
            }
          } catch (e) {
            lastErr = e;
          }
        }
        if (!rows.length && lastErr) {
          console.warn("No submissions found in configured or legacy tables.", lastErr);
        }

        // Inject a non-deletable demo submission for preview
        const demoTs = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
        const demo = {
          id: "demo-career",
          ts: demoTs,
          riasec_code: "RIA",
          participant: {
            name: "Demo Student",
            email: "demo@example.com",
            school: "Preview Academy",
            started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            finished_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
          },
          radar_data: [
            { code: "R", score: 68 }, { code: "I", score: 72 }, { code: "A", score: 55 },
            { code: "S", score: 61 }, { code: "E", score: 49 }, { code: "C", score: 58 },
          ],
          area_percents: [
            { area: "Science & Tech", code: "I", percent: 72 },
            { area: "Hands-on", code: "R", percent: 68 },
            { area: "Arts", code: "A", percent: 55 },
          ],
          pillar_agg: { disc: {}, bloom: {}, sdg: {} },
          pillar_counts: { discCount: {}, bloomCount: {}, sdgCount: {} },
          _demo: true,
        };
        const finalRows = [demo, ...(rows || [])];
        setSubmissions(finalRows);
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const handleViewSubmission = (submission) => {
    // Navigate to results with submission data
    onNavigate("results", { submission });
  };

  const handleDeleteSubmission = async (submission) => {
    try {
      const ok = window.confirm("Delete this submission? This cannot be undone.");
      if (!ok) return;
      if (submission && (submission._demo || String(submission.id).startsWith("demo-"))) {
        alert("This preview submission cannot be deleted.");
        return;
      }
      const envTable = import.meta.env.VITE_SUBMISSIONS_TABLE;
      const candidates = Array.from(new Set([
        "cg_results",
        envTable,
        "cg_submissions",
      ].filter(Boolean)));
      let deleted = false;
      let lastErr = null;
      for (const table of candidates) {
        try {
          const { error } = await supabase.from(table).delete().eq("id", submission.id);
          if (!error) { deleted = true; break; }
          lastErr = error;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!deleted) throw lastErr || new Error("Delete failed");
      setSubmissions((rows) => rows.filter((r) => r.id !== submission.id));
    } catch (e) {
      console.error("Failed to delete submission:", e);
      const msg = e?.message || String(e);
      alert(`Failed to delete submission. ${msg}`);
    }
  };


  const printContainerStyle = bulkActive
    ? {
        position: "fixed",
        inset: 0,
        width: "100vw",
        minHeight: "100vh",
        padding: "20px 0",
        background: "#ffffff",
        overflowY: "auto",
        visibility: "hidden",
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
      }
    : { display: "none" };

  return (
    <PageWrap>
      <style>
        {`
          @media print {
            .bulk-hide-print { display: none !important; }
            .bulk-print-wrap {
              visibility: visible !important;
              opacity: 1 !important;
              pointer-events: auto !important;
              position: static !important;
              inset: auto !important;
              width: 100% !important;
              min-height: auto !important;
              overflow: visible !important;
              z-index: auto !important;
            }
          }
        `}
      </style>

      <div className={`admin-bulk-screen${bulkActive ? " bulk-hide-print" : ""}`}>
        <HeaderBar title="Test Submissions" right={null} />
        <Card>
          <h3 style={{ marginTop: 0 }}>Recent Test Submissions</h3>

          {schoolOptions.length > 0 && (
            <div
              className="no-print"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "12px 16px",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <label htmlFor="bulk-school" style={{ fontWeight: 600, color: "#374151" }}>
                  Bulk export by school
                </label>
                <select
                  id="bulk-school"
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  style={{
                    minWidth: 220,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                  }}
                >
                  <option value="">Select a school…</option>
                  {schoolOptions.map((school) => (
                    <option key={school} value={school}>
                      {school}
                    </option>
                  ))}
                </select>
            </div>
              {bulkStatus ? (
                <div
                  style={{
                    minWidth: 140,
                    maxWidth: 200,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: "#0f172a",
                    color: "#e2e8f0",
                    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.22)",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 999,
                      background: "#1e293b",
                      overflow: "hidden",
                      boxShadow: "inset 0 0 0 1px #0b1220",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, bulkProgress || 5))}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #38bdf8, #6366f1)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: "#cbd5e1", minWidth: 32, textAlign: "right" }}>
                    {bulkProgress || 5}%
                  </span>
                </div>
              ) : (
                <Btn
                  variant="primary"
                  onClick={handleBulkExport}
                  disabled={!selectedSchool || bulkActive}
                  style={
                    !selectedSchool || bulkActive
                      ? { opacity: 0.6, cursor: "not-allowed" }
                      : undefined
                  }
                >
                  Export ZIP
                </Btn>
              )}
            </div>
          )}

          {bulkSet?.school && bulkEntries.length > 0 && (
            <div
              className="no-print"
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                color: "#065f46",
                fontSize: 13,
              }}
            >
              Preparing PDF for {bulkEntries.length}{" "}
              {bulkEntries.length === 1 ? "submission" : "submissions"} from{" "}
              <strong>{bulkSet.school}</strong>. The print dialog will open shortly.
            </div>
          )}

          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading test submissions...</p>
          ) : visibleSubmissions.length > 0 ? (
            <AdminTable
              submissions={visibleSubmissions}
              onViewSubmission={handleViewSubmission}
              onDeleteSubmission={handleDeleteSubmission}
            />
          ) : (
            <p style={{ color: "#6b7280" }}>
              {selectedSchool
                ? `No submissions found for ${selectedSchool} yet.`
                : "No submissions available."}
            </p>
          )}
          <div style={{ marginTop: 16 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>
              Back to Home
            </Btn>
          </div>
        </Card>
      </div>

      <div
        className="bulk-print-wrap"
        aria-hidden="true"
        style={printContainerStyle}
      >
        {bulkEntries.map((submission, index) => {
          const isLast = index === bulkEntries.length - 1;
          return (
            <div
              key={submission.id || index}
              style={{
                marginBottom: isLast ? 0 : 32,
                pageBreakAfter: isLast ? "auto" : "always",
                breakAfter: isLast ? "auto" : "page",
              }}
            >
              <Results
                submission={submission}
                fromAdmin
                onNavigate={() => {}}
              />
            </div>
          );
        })}
      </div>
    </PageWrap>
  );
}


