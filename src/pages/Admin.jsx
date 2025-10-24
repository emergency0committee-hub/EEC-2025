// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { getTestSubmissions } from "../lib/supabaseStorage.js";

export default function Admin({ onNavigate }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [timerMin, setTimerMin] = useState(30);
  const [dirty, setDirty] = useState(false);

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

  // load timer from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cg_timer_min");
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) setTimerMin(parsed);
    }
  }, []);

  // check admin password
  useEffect(() => {
    const stored = localStorage.getItem("cg_admin_pass");
    if (stored) setIsAdmin(true);
  }, []);

  const handleLogin = () => {
    const correct = import.meta.env.VITE_ADMIN_PASS || "ChangeThisToSomethingStrong";
    if (password === correct) {
      localStorage.setItem("cg_admin_pass", "1");
      setIsAdmin(true);
      setPassword("");
      loadSubs(); // load subs on login
    } else {
      alert("Incorrect password");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cg_admin_pass");
    setIsAdmin(false);
    setSubs([]);
    setSubCount(0);
  };

  const applyTimer = () => {
    const min = parseInt(timerMin, 10);
    if (isNaN(min) || min < 1 || min > 180) {
      alert("Please enter a valid number between 1 and 180 minutes");
      return;
    }
    localStorage.setItem("cg_timer_min", min.toString());
    setDirty(false);
  };

  const resetTimer = () => {
    setTimerMin(30);
    localStorage.setItem("cg_timer_min", "30");
    setDirty(false);
  };

  const setPreset = (min) => {
    setTimerMin(min);
    setDirty(true);
  };

  const viewSubmission = (row) => {
    // Results page expects the same payload shape used by Test.jsx on navigate
    onNavigate("results", {
      code: row.top3,
      radarData: row.radarData,
      areaPercents: row.areaPercents,
      interestPercents: row.interest_percents,
      pillarAgg: row.pillarAgg,
      pillarCounts: row.pillarCounts,
      fromAdmin: true,
      participant: row,
      showParticipantHeader: true,
    });
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(subs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'submissions.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const clearSubs = () => {
    if (confirm("Are you sure you want to clear all local submissions? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      setSubs([]);
      setSubCount(0);
    }
  };

  const headerRight = useMemo(() => (
    <div className="no-print" style={{ display: "flex", gap: 8 }}>
      <Btn variant="secondary" onClick={() => onNavigate("home")}>Home</Btn>
    </div>
  ), [onNavigate]);

  return (
    <PageWrap>
      <HeaderBar title="Admin" right={headerRight} />

      {!isAdmin ? (
        <Card>
          <h3 style={{ marginTop: 0 }}>🔒 Admin Login</h3>
          <div style={{ maxWidth: 300 }}>
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
            />
            <Btn variant="primary" onClick={handleLogin} style={{ marginTop: 8 }}>
              Login
            </Btn>
          </div>
        </Card>
      ) : (
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
