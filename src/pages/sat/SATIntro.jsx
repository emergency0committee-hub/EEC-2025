// src/pages/sat/SATIntro.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";

export default function SATIntro({ onNavigate }) {
  SATIntro.propTypes = { onNavigate: PropTypes.func.isRequired };

  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem("sat_access_ok_v1") === "1"; } catch { return false; }
  });
  const staffPreviewRole = useMemo(() => {
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      if (!raw) return "";
      const parsed = JSON.parse(raw);
      return String(parsed?.role || "").toLowerCase();
    } catch {
      return "";
    }
  }, []);
  const canPreview = ["admin", "administrator", "staff"].includes(staffPreviewRole);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const { data: { user } } = await supabase.auth.getUser(); if (alive) setAuthUser(user || null); }
      finally { if (alive) setAuthLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (!authLoading && !authUser) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Diagnostic" />
        <Card>
          <p style={{ color: "#6b7280" }}>Please sign in to start the SAT diagnostic.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <HeaderBar title="SAT Diagnostic" />
      <Card>
        {canPreview && (
          <div style={{ border: "1px dashed #93c5fd", background: "#eff6ff", padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: "#1d4ed8", fontWeight: 600 }}>
                Staff Preview
                <div style={{ color: "#1e3a8a", fontWeight: 400, fontSize: 13 }}>
                  Launch the diagnostic in preview mode (no timers, no submissions saved).
                </div>
              </div>
              <Btn
                variant="secondary"
                onClick={() => onNavigate("sat-exam", { preview: true })}
              >
                Preview Diagnostic
              </Btn>
            </div>
          </div>
        )}
        {!unlocked ? (
          <>
            <h3 style={{ marginTop: 0 }}>Access Code Required</h3>
            <p style={{ color: "#6b7280" }}>
              Enter the access code provided by your instructor to start the SAT diagnostic.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 420 }}>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); }}
                placeholder="Enter access code"
                style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
              />
              <Btn
                variant="primary"
                onClick={() => {
                  const expected = (import.meta.env.VITE_SAT_ACCESS_CODE || "").trim();
                  if (expected && code.trim() !== expected) { setError("Invalid access code"); return; }
                  try { localStorage.setItem("sat_access_ok_v1", "1"); } catch {}
                  setUnlocked(true);
                }}
              >Unlock</Btn>
            </div>
            {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <div style={{ marginTop: 12 }}>
              <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>Overview</h3>
            <p style={{ color: "#6b7280" }}>
              This diagnostic simulates the new Digital SAT structure with two modules for Reading & Writing and two modules for Math. It uses strict timers, a question palette, and basic scoring. Your submission will be saved.
            </p>
            <ul style={{ color: "#374151" }}>
              <li>Reading & Writing: 2 modules × 32 minutes each</li>
              <li>Math: 2 modules × 35 minutes each</li>
              <li>Answer navigation via a palette; timer per module</li>
            </ul>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn variant="primary" onClick={() => onNavigate("sat-exam")}>Start Diagnostic</Btn>
              <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
            </div>
          </>
        )}
      </Card>
    </PageWrap>
  );
}
