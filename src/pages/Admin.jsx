// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { getTestSubmissions } from "../lib/supabaseStorage.js";

export default function Admin({ onNavigate }) {
  // =======================
  // === Admin Auth (password) ========
  // =======================
  const ADMIN_PASSWORD = "careeradmin123"; // change this
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const isAdmin = useMemo(() => {
    try {
      return localStorage.getItem("cg_admin_ok_v1") === "1";
    } catch {
      return false;
    }
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      try { localStorage.setItem("cg_admin_ok_v1", "1"); } catch {}
      location.reload();
    } else {
      setAuthError("❌ Incorrect password. Please try again.");
    }
  };

  const handleLogout = () => {
    try { localStorage.removeItem("cg_admin_ok_v1"); } catch {}
    location.reload();
  };

  // =======================
  // === Timer Settings ====
  // =======================
  const [timerMin, setTimerMin] = useState(() => {
    const saved = Number(localStorage.getItem("cg_timer_min") || 30);
    return Number.isFinite(saved) && saved > 0 ? saved : 30;
  });
  const [dirty, setDirty] = useState(false);

  const applyTimer = () => {
    const safe = Math.max(1, Math.min(180, Number(timerMin) || 30));
    setTimerMin(safe);
    try { localStorage.setItem("cg_timer_min", String(safe)); } catch {}
    setDirty(false);
  };
  const resetTimer = () => {
    setTimerMin(30);
    try { localStorage.setItem("cg_timer_min", "30"); } catch {}
    setDirty(false);
  };
  const setPreset = (m) => {
    setTimerMin(m);
    setDirty(true);
  };

  // =======================
  // === Submissions =======
  // =======================
  const STORAGE_KEY = "cg_submissions_v1";
  const LEGACY_KEYS = ["cg_submissions"]; // add more legacy keys here if you had any

  const [subs, setSubs] = useState([]);
  const [subCount, setSubCount] = useState(0);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // migration + load
  const loadSubs = async () => {
    setLoadingSubs(true);
    let rows = [];

    // Load from Supabase first
    try {
      const supabaseSubs = await getTestSubmissions();
      if (supabaseSubs.length > 0) {
        rows = supabaseSubs.map(row => ({
          ts: row.submitted_at,
          name: row.name,
          email: row.email,
          school: row.school,
          top3: row.top3,
          radarData: row.radar_data,
          areaPercents: row.area_percents,
          interestPercents: row.interest_percents,
          pillarAgg: row.pillar_agg,
          pillarCounts: row.pillar_counts,
        }));
      }
    } catch (err) {
      console.error('Failed to load from Supabase:', err);
    }

    // If no Supabase data, fall back to localStorage
    if (rows.length === 0) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          rows = JSON.parse(raw) || [];
        } else {
          // try legacy keys (migrate first one we find)
          for (const k of LEGACY_KEYS) {
            const legacy = localStorage.getItem(k);
            if (legacy) {
              try {
                const parsed = JSON.parse(legacy);
                if (Array.isArray(parsed)) {
                  rows = parsed;
                  // migrate to v1
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                  break;
                }
              } catch {}
            }
          }
        }
      } catch {}
    }

    if (!Array.isArray(rows)) rows = [];
    // sort newest first
    rows.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
    setSubs(rows);
    setSubCount(rows.length);
    setLoadingSubs(false);
  };

  useEffect(() => {
    loadSubs();
  }, []);

  const clearSubs = () => {
    if (!confirm("Delete all saved submissions on this browser?")) return;
    try { localStorage.setItem(STORAGE_KEY, "[]"); } catch {}
    setSubs([]);
    setSubCount(0);
  };

  const viewSubmission = (row) => {
    // Results page expects the same payload shape used by Test.jsx on navigate
    onNavigate("results", {
      code: row.top3,
      radarData: row.radarData,
      areaPercents: row.areaPercents,
      interestPercents: row.interestPercents,
      pillarAgg: row.pillarAgg,
      pillarCounts: row.pillarCounts,
      fromAdmin: true,
      participant: row,
      showParticipantHeader: true,
    });
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(subs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // =======================
  // === Render ============
  // =======================
  return (
    <PageWrap>
      <HeaderBar
        title="Admin Panel"
        right={<Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>}
      />

      {/* LOGIN (if not admin) */}
      {!isAdmin && (
        <Card>
          <h3 style={{ marginTop: 0 }}>🔐 Admin Login</h3>
          <Field
            label="Enter Admin Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          {authError && <div style={{ color: "#b91c1c", marginTop: 6 }}>{authError}</div>}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={handleLogin}>Sign In</Btn>
            <Btn variant="back" onClick={() => onNavigate("home")}>Cancel</Btn>
          </div>
          <p style={{ color: "#6b7280", marginTop: 10 }}>
            Admin mode is client-side (stored in your browser only).
          </p>
        </Card>
      )}

      {/* ADMIN DASHBOARD */}
      {isAdmin && (
        <>
          {/* Access */}
          <Card>
            <h3 style={{ marginTop: 0 }}>✅ Admin Access</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ color: "#16a34a", fontWeight: 600 }}>
                Status: Admin Enabled
              </div>
              <Btn variant="secondary" onClick={handleLogout}>Log Out</Btn>
            </div>
            <p style={{ color: "#6b7280", marginTop: 10 }}>
              You can manage timer and view past submissions below.
            </p>
          </Card>

          {/* Timer Settings */}
          <Card>
            <h3 style={{ marginTop: 0 }}>⏱ Timer Settings</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "220px 1fr",
                gap: 12,
                alignItems: "center",
                maxWidth: 700,
              }}
            >
              <div>
                <Field
                  label="Countdown (minutes)"
                  type="number"
                  min={1}
                  max={180}
                  value={timerMin}
                  placeholder="Minutes"
                  onChange={(e) => {
                    setTimerMin(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {[15, 20, 25, 30, 45, 60].map((m) => (
                  <Btn key={m} variant="secondary" onClick={() => setPreset(m)}>
                    {m}m
                  </Btn>
                ))}
                <Btn variant="primary" disabled={!dirty} onClick={applyTimer}>
                  Save
                </Btn>
                <Btn variant="back" onClick={resetTimer}>
                  Reset to 30m
                </Btn>
                {dirty && <span style={{ color: "#ca8a04", fontWeight: 600 }}>Unsaved changes</span>}
              </div>
            </div>
            <p style={{ color: "#6b7280", marginTop: 10 }}>
              Value is stored in <code>localStorage("cg_timer_min")</code> and used by the test on start.
            </p>
          </Card>

          {/* Submissions List */}
          <Card>
            <h3 style={{ marginTop: 0 }}>📄 Past Submissions ({subCount})</h3>

            {loadingSubs ? (
              <div style={{ color: "#6b7280" }}>Loading submissions...</div>
            ) : subs.length === 0 ? (
              <div style={{ color: "#6b7280" }}>No submissions found in this browser.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {subs.map((row, i) => {
                  const title = row.name ? `${row.name} — ${row.email || ""}`.trim() : (row.email || "(no name)");
                  const when = row.ts ? new Date(row.ts).toLocaleString() : "(no timestamp)";
                  const code = Array.isArray(row.top3) ? row.top3.join("") : "(no code)";
                  return (
                    <div key={i} style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}>
                      <div style={{ minWidth: 220 }}>
                        <div style={{ fontWeight: 600 }}>{title}</div>
                        <div style={{ color: "#6b7280", fontSize: 13 }}>{when}</div>
                      </div>
                      <div style={{ color: "#334155" }}>Top3: <b>{code}</b></div>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <Btn variant="secondary" onClick={() => viewSubmission(row)}>View</Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={exportJSON} disabled={subs.length === 0}>
                Export JSON
              </Btn>
              <Btn variant="back" onClick={clearSubs} disabled={subs.length === 0}>
                Clear Local Submissions
              </Btn>
            </div>

            <p style={{ color: "#6b7280", marginTop: 10 }}>
              Submissions are stored per browser & origin in{" "}
              <code>localStorage("{STORAGE_KEY}")</code>. If you changed machine,
              browser, domain, or used incognito, the old ones won’t be here.
            </p>
          </Card>
        </>
      )}
    </PageWrap>
  );
}
