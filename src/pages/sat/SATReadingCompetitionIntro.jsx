// src/pages/sat/SATReadingCompetitionIntro.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const [scanActive, setScanActive] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanManualId, setScanManualId] = useState("");
  const [scanProfile, setScanProfile] = useState(null);
  const videoRef = useRef(null);
  const scanTimerRef = useRef(null);
  const scanStreamRef = useRef(null);
  const scanControlsRef = useRef(null);
  const scanReaderRef = useRef(null);
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
        .select("unlocked")
        .eq("user_id", authUser.id)
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

  const stopScan = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (scanControlsRef.current?.stop) {
      try {
        scanControlsRef.current.stop();
      } catch {}
      scanControlsRef.current = null;
    }
    if (scanReaderRef.current?.reset) {
      try {
        scanReaderRef.current.reset();
      } catch {}
    }
    if (scanStreamRef.current) {
      scanStreamRef.current.getTracks().forEach((track) => track.stop());
      scanStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanActive(false);
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  const processUserId = useCallback(async (rawId) => {
    const userId = (rawId || "").trim();
    if (!UUID_RE.test(userId)) {
      setScanError("Invalid QR code. Expected a user ID.");
      setScanStatus("");
      return;
    }
    setScanError("");
    setScanStatus("Checking in...");
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email, school, role")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) {
        setScanError("User not found.");
        setScanStatus("");
        return;
      }
      const { error: upsertError } = await supabase
        .from("cg_reading_competition_access")
        .upsert(
          {
            user_id: userId,
            user_email: profile.email || null,
            scanned_by: authUser?.id || null,
            scanned_at: new Date().toISOString(),
            unlocked: true,
          },
          { onConflict: "user_id" }
        );
      if (upsertError) throw upsertError;
      setScanProfile(profile);
      setScanStatus("Checked in and unlocked.");
    } catch (err) {
      console.error("competition check-in failed", err);
      setScanError(err?.message || "Check-in failed.");
      setScanStatus("");
    }
  }, [authUser?.id]);

  const handleScannedValue = useCallback((value) => {
    stopScan();
    processUserId(value);
  }, [processUserId, stopScan]);

  const startScan = useCallback(async () => {
    setScanError("");
    setScanStatus("");
    setScanProfile(null);
    if (typeof window === "undefined") {
      setScanError("QR scanning is not available in this environment.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("Camera access is not available on this device.");
      return;
    }
    const supportsBarcodeDetector = "BarcodeDetector" in window;
    const cameraConstraints = {
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    };
    try {
      if (supportsBarcodeDetector) {
        setScanStatus("Requesting camera access...");
        const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
        scanStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        setScanActive(true);
        setScanStatus("Scanning...");
        scanTimerRef.current = window.setInterval(async () => {
          if (!videoRef.current) return;
          if (videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length) {
              handleScannedValue(barcodes[0].rawValue || "");
            }
          } catch (err) {
            console.warn("QR detect failed", err);
          }
        }, 450);
        return;
      }

      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (!videoRef.current) {
        setScanError("Camera preview is not available.");
        return;
      }
      scanReaderRef.current = scanReaderRef.current ?? new BrowserQRCodeReader();
      setScanActive(true);
      setScanStatus("Requesting camera access...");
      scanControlsRef.current = await scanReaderRef.current.decodeFromConstraints(
        cameraConstraints,
        videoRef.current,
        (result) => {
          if (result) {
            handleScannedValue(result.getText());
          }
        }
      );
      setScanStatus("Scanning...");
    } catch (err) {
      console.error("QR scan start failed", err);
      setScanError(
        supportsBarcodeDetector
          ? "Unable to access camera."
          : "QR scanning is not supported on this browser. Use manual entry."
      );
      stopScan();
    }
  }, [handleScannedValue, stopScan]);

  const handleManualCheckin = async () => {
    if (!scanManualId.trim()) {
      setScanError("Enter a user ID before checking in.");
      return;
    }
    setScanError("");
    setScanProfile(null);
    await processUserId(scanManualId);
  };

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
        {canPreview && (
          <div style={{ border: "1px dashed #93c5fd", background: "#eff6ff", padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: "#1d4ed8", fontWeight: 600 }}>
                Staff Preview
                <div style={{ color: "#1e3a8a", fontWeight: 400, fontSize: 13 }}>
                  Launch the reading competition in preview mode (no timers, no submissions saved).
                </div>
              </div>
              <Btn
                variant="secondary"
                onClick={() =>
                  onNavigate("sat-exam", {
                    preview: true,
                    examSections: ["RW"],
                    testType: "reading_competition",
                    contextTitle: "SAT Reading Competition",
                  })
                }
              >
                Preview Reading Competition
              </Btn>
            </div>
          </div>
        )}
        {canPreview && (
          <div style={{ border: "1px solid #e5e7eb", background: "#ffffff", padding: 12, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, color: "#111827" }}>Competition Check-in</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  Scan a student QR to mark attendance and unlock the competition.
                </div>
              </div>
              <Btn variant="secondary" onClick={scanActive ? stopScan : startScan}>
                {scanActive ? "Stop Scan" : "Start Scan"}
              </Btn>
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 6,
                    background: "#f8fafc",
                  }}
                >
                  <video
                    ref={videoRef}
                    style={{ width: 220, height: 160, borderRadius: 8, background: "#0f172a" }}
                    muted
                    playsInline
                  />
                </div>
                <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
                  <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Manual User ID</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={scanManualId}
                      onChange={(e) => setScanManualId(e.target.value)}
                      placeholder="Paste user ID"
                      style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                    />
                    <Btn variant="secondary" onClick={handleManualCheckin}>
                      Check In
                    </Btn>
                  </div>
                </div>
              </div>
              {scanStatus && <div style={{ color: "#047857", fontSize: 13 }}>{scanStatus}</div>}
              {scanError && <div style={{ color: "#dc2626", fontSize: 13 }}>{scanError}</div>}
              {scanProfile && (
                <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", padding: 10, borderRadius: 10 }}>
                  <div style={{ fontWeight: 700, color: "#166534" }}>Checked in</div>
                  <div style={{ color: "#166534" }}>{scanProfile.name || scanProfile.email}</div>
                  <div style={{ color: "#166534", fontSize: 12 }}>{scanProfile.email || scanProfile.id}</div>
                </div>
              )}
            </div>
          </div>
        )}
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
