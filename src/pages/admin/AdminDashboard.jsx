// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import AdminTable from "./AdminTable2.jsx";
import AdminLegend from "./AdminLegend.jsx";
import { supabase } from "../../lib/supabase.js";
import { hashPassword } from "../../lib/hash.js";
import Results from "../Results.jsx";

export default function AdminDashboard({ onNavigate }) {
  AdminDashboard.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [bulkSet, setBulkSet] = useState(null);
  const [timerMin, setTimerMin] = useState(() => {
    const saved = Number(localStorage.getItem("cg_timer_min") || 30);
    return Number.isFinite(saved) && saved > 0 ? saved : 30;
  });
  const [userRows, setUserRows] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState("");
  const [passwordDrafts, setPasswordDrafts] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem("cg_timer_min", String(timerMin));
    } catch (err) {
      console.warn("Failed to persist timer minutes", err);
    }
  }, [timerMin]);

  useEffect(() => {
    const loadUsers = async () => {
      setUsersLoading(true);
      setUserError("");
      try {
        const table = import.meta.env.VITE_USERS_TABLE || "profiles";
        const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
        if (error) throw error;
        setUserRows(data || []);
      } catch (err) {
        console.error("admin load users", err);
        setUserError(err?.message || "Failed to load users.");
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, []);

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

  const handlePasswordDraft = (userId, value) => {
    setPasswordDrafts((prev) => ({ ...prev, [userId]: value }));
  };

  const handlePasswordReset = async (user) => {
    const rawPassword = (passwordDrafts[user.id] || "").trim();
    if (rawPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    const table = import.meta.env.VITE_USERS_TABLE || "profiles";
    try {
      const hashed = await hashPassword(rawPassword);
      const { error } = await supabase
        .from(table)
        .update({ password_hash: hashed })
        .eq("id", user.id);
      if (error) throw error;
      alert(`Password for ${user.email || user.username || "user"} updated.`);
      setPasswordDrafts((prev) => ({ ...prev, [user.id]: "" }));
    } catch (err) {
      console.error("update user password", err);
      alert(err?.message || "Failed to update password.");
    }
  };

  const bulkEntries = bulkSet?.entries || [];
  const bulkActive = bulkEntries.length > 0;

  const handleBulkExport = () => {
    if (!selectedSchool) return;
    const target = selectedSchool.trim().toLowerCase();
    const entries = realSubmissions.filter(
      (sub) => getSchool(sub).trim().toLowerCase() === target
    );
    if (!entries.length) {
      alert("No submissions found for the selected school yet.");
      return;
    }
    setBulkSet({ school: selectedSchool, entries });
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

      <div className="no-print">
        <Card>
          <h3 style={{ marginTop: 0 }}>Career Guidance Timer</h3>
          <p style={{ color: "#475569", marginBottom: 16 }}>
            Set the default duration students see when they begin the Career Guidance test. This applies to new test sessions.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label htmlFor="cg-timer-min" style={{ fontWeight: 600, color: "#1e293b" }}>
              Timer (minutes)
            </label>
            <input
              id="cg-timer-min"
              type="number"
              min={1}
              max={180}
              value={timerMin}
              onChange={(e) => {
                const next = Number(e.target.value);
                const clamped = Number.isFinite(next) ? Math.max(1, Math.min(180, Math.round(next))) : timerMin;
                setTimerMin(clamped);
              }}
              style={{
                width: 100,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontWeight: 600,
              }}
            />
            <div style={{ color: "#475569" }}>
              Current: <b>{timerMin} min</b>
            </div>
          </div>
        </Card>
      </div>

      <div className="no-print">
        <Card>
          <h3 style={{ marginTop: 0 }}>Manage Users</h3>
          <p style={{ color: "#475569", marginBottom: 16 }}>
            Reset a user's password directly. New passwords must be at least 6 characters long.
          </p>
          {userError && (
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c" }}>
              {userError}
            </div>
          )}
          {usersLoading ? (
            <p style={{ color: "#6b7280" }}>Loading users…</p>
          ) : userRows.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No users found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: 10, textAlign: "left" }}>Name</th>
                    <th style={{ padding: 10, textAlign: "left" }}>Email</th>
                    <th style={{ padding: 10, textAlign: "left" }}>Username</th>
                    <th style={{ padding: 10, textAlign: "left" }}>New Password</th>
                    <th style={{ padding: 10, textAlign: "left" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userRows.map((user) => (
                    <tr key={user.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: 10 }}>{user.name || "—"}</td>
                      <td style={{ padding: 10 }}>{user.email || "—"}</td>
                      <td style={{ padding: 10 }}>{user.username || "—"}</td>
                      <td style={{ padding: 10 }}>
                        <input
                          type="text"
                          value={passwordDrafts[user.id] || ""}
                          onChange={(e) => handlePasswordDraft(user.id, e.target.value)}
                          placeholder="Enter new password"
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <Btn
                          variant="primary"
                          disabled={!passwordDrafts[user.id] || passwordDrafts[user.id].length < 6}
                          onClick={() => handlePasswordReset(user)}
                        >
                          Update
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className={`admin-bulk-screen${bulkActive ? " bulk-hide-print" : ""}`}>
        <HeaderBar title="Test Submissions" right={null} />
        <Card>
          <h3 style={{ marginTop: 0 }}>Recent Test Submissions</h3>
          <AdminLegend />

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
                {bulkActive ? "Preparing..." : "Export PDF"}
              </Btn>
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
          ) : (
            <AdminTable
              submissions={submissions}
              onViewSubmission={handleViewSubmission}
              onDeleteSubmission={handleDeleteSubmission}
            />
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


