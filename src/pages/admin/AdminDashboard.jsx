// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import AdminTable from "./AdminTable.jsx";
import AdminLegend from "./AdminLegend.jsx";
import { supabase } from "../../lib/supabase.js";
import Results from "../Results.jsx";
import { renderSubmissionToPdfA3 } from "../../lib/exportResults.jsx";

export default function AdminDashboard({ onNavigate }) {
  AdminDashboard.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [bulkSet, setBulkSet] = useState(null);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [bulkSort, setBulkSort] = useState("name");
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkPreviewList, setBulkPreviewList] = useState([]);
  const [bulkPreviewIndex, setBulkPreviewIndex] = useState(0);
  const [tableSort, setTableSort] = useState("ts_desc");
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
  const sortedSubmissions = useMemo(() => {
    const list = [...visibleSubmissions];
    list.sort((a, b) => {
      const pa = a.participant || a.profile || {};
      const pb = b.participant || b.profile || {};
      const nameA = (pa.name || pa.email || "").toLowerCase();
      const nameB = (pb.name || pb.email || "").toLowerCase();
      const schoolA = (pa.school || "").toLowerCase();
      const schoolB = (pb.school || "").toLowerCase();
      const tsA = new Date(a.ts || a.created_at || pa.finished_at || pa.started_at || 0).getTime();
      const tsB = new Date(b.ts || b.created_at || pb.finished_at || pb.started_at || 0).getTime();
      if (tableSort === "school" || tableSort === "school_desc") {
        const cmp = schoolA.localeCompare(schoolB) || nameA.localeCompare(nameB);
        return tableSort === "school_desc" ? -cmp : cmp;
      }
      if (tableSort === "ts" || tableSort === "ts_desc") {
        const cmp = (Number.isFinite(tsA) ? tsA : 0) - (Number.isFinite(tsB) ? tsB : 0);
        return tableSort === "ts_desc" ? -cmp : cmp;
      }
      const cmp = nameA.localeCompare(nameB) || schoolA.localeCompare(schoolB);
      return tableSort === "name_desc" ? -cmp : cmp;
    });
    return list;
  }, [visibleSubmissions, tableSort]);
  const pagedSubmissions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedSubmissions.slice(start, start + PAGE_SIZE);
  }, [sortedSubmissions, page]);
  const totalPages = Math.max(1, Math.ceil(sortedSubmissions.length / PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [selectedSchool, submissions.length, tableSort]);
  const sortedModalSubmissions = useMemo(() => {
    const list = [...visibleSubmissions];
    list.sort((a, b) => {
      const pa = a.participant || a.profile || {};
      const pb = b.participant || b.profile || {};
      const nameA = (pa.name || pa.email || "").toLowerCase();
      const nameB = (pb.name || pb.email || "").toLowerCase();
      const schoolA = (pa.school || "").toLowerCase();
      const schoolB = (pb.school || "").toLowerCase();
      const tsA = new Date(a.ts || a.created_at || pa.finished_at || pa.started_at || 0).getTime();
      const tsB = new Date(b.ts || b.created_at || pb.finished_at || pb.started_at || 0).getTime();
      if (bulkSort === "school" || bulkSort === "school_desc") {
        const cmp = schoolA.localeCompare(schoolB) || nameA.localeCompare(nameB);
        return bulkSort === "school_desc" ? -cmp : cmp;
      }
      if (bulkSort === "ts" || bulkSort === "ts_desc") {
        const cmp = (Number.isFinite(tsA) ? tsA : 0) - (Number.isFinite(tsB) ? tsB : 0);
        return bulkSort === "ts_desc" ? -cmp : cmp;
      }
      const cmp = nameA.localeCompare(nameB) || schoolA.localeCompare(schoolB);
      return bulkSort === "name_desc" ? -cmp : cmp;
    });
    return list;
  }, [visibleSubmissions, bulkSort]);
  useEffect(() => {
    setPage(1);
  }, [selectedSchool, submissions.length]);

  // Render full Results layout to canvas, then into PDF
  // Render full Results layout to PDF (multi-page, matches single export)
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

  const handleBulkExport = async (entries) => {
    if (!entries || !entries.length) {
      alert("Please select at least one submission.");
      return;
    }
    setBulkStatus("Preparing PDFs...");
    setBulkProgress(0);
    try {
      const files = [];
      for (let i = 0; i < entries.length; i++) {
        const sub = entries[i];
        const pdfData = await renderSubmissionToPdfA3(sub, { fromAdmin: true });
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

  const openPreviewPdf = async (submission) => {
    try {
      const pdfData = await renderSubmissionToPdfA3(submission, { fromAdmin: true });
      const blob = new Blob([pdfData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        // Fallback: trigger a download if the popup was blocked
        const a = document.createElement("a");
        a.href = url;
        a.download = "preview.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return win;
    } catch (err) {
      console.error("Preview PDF failed", err);
      alert("Failed to open preview PDF.");
    }
  };

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

  const handleViewSubmission = async (submission, event) => {
    const isNewTab = event && (event.ctrlKey || event.metaKey || event.button === 1 || event.type === "auxclick");
    if (isNewTab) {
      event.preventDefault();
      await openPreviewPdf(submission);
      return;
    }
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Recent Test Submissions</h3>
            <Btn
              variant="primary"
              onClick={() =>
                onNavigate("test", {
                  preview: true,
                  previewTitle: "Career Test Preview",
                })
              }
            >
              Preview Career Test
            </Btn>
          </div>
          <p style={{ color: "#6b7280", marginTop: 8 }}>
            Open the full Career Guidance test in preview mode to review the experience. No data is saved while in preview.
          </p>

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
            <>
              <AdminTable
                submissions={pagedSubmissions}
                onViewSubmission={handleViewSubmission}
                onDeleteSubmission={handleDeleteSubmission}
                onSort={setTableSort}
                sortKey={tableSort}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                <Btn variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Prev
                </Btn>
                <span style={{ color: "#374151", fontSize: 13 }}>
                  Page {page} of {totalPages}
                </span>
                <Btn
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Btn>
              </div>
            </>
          ) : (
            <p style={{ color: "#6b7280" }}>
              {selectedSchool
                ? `No submissions found for ${selectedSchool} yet.`
                : "No submissions available."}
            </p>
          )}

          <div
            className="no-print"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
            }}
          >
            <Btn variant="back" onClick={() => onNavigate("home")}>
              Back to Home
            </Btn>
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
                onClick={() => {
                  setBulkSelectedIds(visibleSubmissions.map((s) => s.id));
                  setBulkModalOpen(true);
                }}
                disabled={bulkActive || visibleSubmissions.length === 0}
                style={
                  bulkActive || !visibleSubmissions.length
                    ? { opacity: 0.6, cursor: "not-allowed" }
                    : undefined
                }
              >
                Export ZIP
              </Btn>
            )}
          </div>
        </Card>
      </div>

      {bulkModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1400,
            padding: 12,
          }}
          onClick={() => setBulkModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              width: "min(720px, 95vw)",
              boxShadow: "0 15px 40px rgba(0,0,0,0.12)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0 }}>Select submissions</h3>
              <Btn variant="back" onClick={() => setBulkModalOpen(false)}>Close</Btn>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <Btn
                variant="secondary"
                onClick={() => setBulkSelectedIds(sortedModalSubmissions.map((s) => s.id))}
              >
                Select all
              </Btn>
              <Btn variant="back" onClick={() => setBulkSelectedIds([])}>Clear</Btn>
              <div style={{ marginLeft: "auto", fontSize: 12, color: "#4b5563" }}>
                Selected {bulkSelectedIds.length} of {sortedModalSubmissions.length}
              </div>
            </div>
            <div style={{ maxHeight: "50vh", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: 8, textAlign: "left" }}></th>
                    <th
                      style={{ padding: 8, textAlign: "left", cursor: "pointer" }}
                      onClick={() => setBulkSort((prev) => (prev === "name" ? "name_desc" : "name"))}
                    >
                      Name {bulkSort.startsWith("name") ? (bulkSort === "name" ? "▲" : "▼") : ""}
                    </th>
                    <th
                      style={{ padding: 8, textAlign: "left", cursor: "pointer" }}
                      onClick={() => setBulkSort((prev) => (prev === "school" ? "school_desc" : "school"))}
                    >
                      School {bulkSort.startsWith("school") ? (bulkSort === "school" ? "▲" : "▼") : ""}
                    </th>
                    <th
                      style={{ padding: 8, textAlign: "left", cursor: "pointer" }}
                      onClick={() => setBulkSort((prev) => (prev === "ts" ? "ts_desc" : "ts"))}
                    >
                      Submitted {bulkSort.startsWith("ts") ? (bulkSort === "ts" ? "▲" : "▼") : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedModalSubmissions.map((sub) => {
                    const p = sub.participant || sub.profile || {};
                    const checked = bulkSelectedIds.includes(sub.id);
                    const ts = sub.ts || sub.created_at || p.finished_at || null;
                    const dateStr = ts ? new Date(ts).toLocaleString() : "-";
                    return (
                      <tr key={sub.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: 8 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(bulkSelectedIds);
                              if (e.target.checked) next.add(sub.id);
                              else next.delete(sub.id);
                              setBulkSelectedIds(Array.from(next));
                            }}
                          />
                        </td>
                        <td style={{ padding: 8 }}>{p.name || p.email || "-"}</td>
                        <td style={{ padding: 8 }}>{p.school || "-"}</td>
                        <td style={{ padding: 8 }}>{dateStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="secondary" onClick={() => setBulkModalOpen(false)}>Cancel</Btn>
              <Btn
                variant="primary"
                disabled={bulkSelectedIds.length === 0 || bulkActive}
                onClick={() => {
                  const selected = visibleSubmissions.filter((s) => bulkSelectedIds.includes(s.id));
                  if (!selected.length) return;
                  setBulkModalOpen(false);
                  setBulkPreviewList(selected);
                  setBulkPreviewIndex(0);
                  setBulkPreviewOpen(true);
                }}
              >
                {bulkActive ? "Working..." : "Export"}
              </Btn>
            </div>
          </div>
        </div>
      )}

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

      {bulkPreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1500,
            padding: 12,
          }}
          onClick={() => {
            setBulkPreviewOpen(false);
            setBulkPreviewList([]);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              width: "min(900px, 95vw)",
              height: "min(90vh, 820px)",
              boxShadow: "0 15px 40px rgba(0,0,0,0.12)",
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div>
                <h3 style={{ margin: 0 }}>
                  Preview {bulkPreviewIndex + 1} of {bulkPreviewList.length}
                </h3>
                <div style={{ fontSize: 12, color: "#4b5563" }}>
                  {bulkPreviewList[bulkPreviewIndex]?.participant?.name ||
                    bulkPreviewList[bulkPreviewIndex]?.profile?.name ||
                    "Submission"}
                </div>
              </div>
              <Btn variant="back" onClick={() => { setBulkPreviewOpen(false); setBulkPreviewList([]); }}>
                Close
              </Btn>
            </div>
            <div style={{ overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#f9fafb" }}>
              {bulkPreviewList[bulkPreviewIndex] ? (
                <Results submission={bulkPreviewList[bulkPreviewIndex]} fromAdmin onNavigate={() => {}} />
              ) : (
                <p style={{ color: "#6b7280" }}>No submission selected.</p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  variant="secondary"
                  onClick={() => openPreviewPdf(bulkPreviewList[bulkPreviewIndex])}
                  disabled={!bulkPreviewList[bulkPreviewIndex]}
                >
                  Open PDF preview / print
                </Btn>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  variant="secondary"
                  onClick={() => setBulkPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={bulkPreviewIndex === 0}
                >
                  Previous
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={() => setBulkPreviewIndex((i) => Math.min(bulkPreviewList.length - 1, i + 1))}
                  disabled={bulkPreviewIndex >= bulkPreviewList.length - 1}
                >
                  Next
                </Btn>
                <Btn
                variant="primary"
                onClick={() => {
                  setBulkPreviewOpen(false);
                  handleBulkExport(bulkPreviewList);
                }}
                  disabled={!bulkPreviewList.length || bulkActive}
                >
                  Start ZIP export
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

    </PageWrap>
  );
}












