// src/pages/sat/SATReadingCompetitionIntro.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";

export default function SATReadingCompetitionIntro({ onNavigate }) {
  SATReadingCompetitionIntro.propTypes = { onNavigate: PropTypes.func.isRequired };

  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [serverCode, setServerCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [staffUnlocked, setStaffUnlocked] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (alive) setAuthUser(user || null);
      } finally {
        if (alive) setAuthLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setCodeLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("access_codes")
          .select("code")
          .eq("purpose", "reading_competition")
          .maybeSingle();
        if (!active) return;
        if (error && error.code !== "PGRST116") throw error;
        const value = (data?.code || "").trim();
        setServerCode(value || "");
      } catch (err) {
        console.error("reading competition code fetch", err);
      } finally {
        if (active) setCodeLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const loadStaffUnlock = useCallback(async () => {
    if (!authUser?.id) return;
    setUnlockLoading(true);
    try {
      const { data, error } = await supabase
        .from("cg_reading_competition_access")
        .select("unlocked, scanned_at")
        .eq("user_id", authUser.id)
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      setStaffUnlocked(Boolean(data?.unlocked));
    } catch (err) {
      console.error("reading competition unlock check", err);
      setStaffUnlocked(false);
    } finally {
      setUnlockLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser) return;
    loadStaffUnlock();
  }, [authUser, loadStaffUnlock]);

  if (!authLoading && !authUser) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Reading Competition" />
        <Card>
          <p style={{ color: "#6b7280" }}>Please sign in to start the SAT Reading Competition.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  const hasAccess = canPreview || unlocked || staffUnlocked;

  return (
    <PageWrap>
      <HeaderBar title="SAT Reading Competition" />
      <Card>
        {!hasAccess ? (
          <>
            <h3 style={{ marginTop: 0 }}>Access Code Required</h3>
            {unlockLoading && (
              <p style={{ color: "#6b7280", marginTop: 0 }}>Checking staff unlock status...</p>
            )}
            <p style={{ color: "#6b7280" }}>
              Enter the access code provided by your instructor to start the SAT Reading Competition.
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
                  const expected =
                    serverCode || (import.meta.env.VITE_SAT_READING_COMPETITION_ACCESS_CODE || "").trim();
                  if (expected && code.trim() !== expected) { setError("Invalid access code"); return; }
                  setUnlocked(true);
                }}
                disabled={codeLoading}
              >
                {codeLoading ? "Checking..." : "Unlock"}
              </Btn>
            </div>
            {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Btn variant="secondary" onClick={loadStaffUnlock} disabled={unlockLoading}>
                Refresh Check-in
              </Btn>
              <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>Overview</h3>
            <p style={{ color: "#6b7280" }}>
              The SAT Reading Competition covers Reading & Writing only. Your submission will be saved.
            </p>
            {staffUnlocked && (
              <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", padding: 10, borderRadius: 10, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: "#166534" }}>Staff check-in completed</div>
                <div style={{ color: "#166534", fontSize: 13 }}>You are cleared to start the competition.</div>
              </div>
            )}
            <ul style={{ color: "#374151" }}>
              <li>Reading & Writing: 2 modules - 32 minutes each</li>
              <li>Answer navigation via a palette; timer per module</li>
            </ul>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn
                variant="primary"
                onClick={() =>
                  onNavigate("sat-exam", {
                    examSections: ["RW"],
                    testType: "reading_competition",
                    contextTitle: "SAT Reading Competition",
                  })
                }
              >
                Start Reading Competition
              </Btn>
              <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
            </div>
          </>
        )}
      </Card>
    </PageWrap>
  );
}
