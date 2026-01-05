// src/pages/sat/SATReadingCompetitionMode.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";
import LiveTestSessionsPanel from "../../components/LiveTestSessionsPanel.jsx";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const formatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};
const toIsoStringOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export default function SATReadingCompetitionMode({ onNavigate }) {
  SATReadingCompetitionMode.propTypes = { onNavigate: PropTypes.func.isRequired };

  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [scanActive, setScanActive] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanManualId, setScanManualId] = useState("");
  const [scanProfile, setScanProfile] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [checkinsLoading, setCheckinsLoading] = useState(false);
  const [checkinsError, setCheckinsError] = useState("");
  const [manageBusyId, setManageBusyId] = useState("");
  const [manageError, setManageError] = useState("");
  const [eventForm, setEventForm] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    location: "",
    notes: "",
  });
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventSaving, setEventSaving] = useState(false);
  const [eventDeleteBusyId, setEventDeleteBusyId] = useState("");
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
  const isAdmin = staffPreviewRole === "admin";
  const selectedEvent = useMemo(
    () => events.find((row) => row.id === selectedEventId) || null,
    [events, selectedEventId]
  );

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

  const loadCheckins = useCallback(async (eventId = selectedEventId) => {
    if (!authUser?.id || !canPreview) return;
    if (!eventId) {
      setCheckins([]);
      setCheckinsError("");
      return;
    }
    setCheckinsLoading(true);
    setCheckinsError("");
    try {
      const { data, error } = await supabase
        .from("cg_reading_competition_access")
        .select("event_id,user_id,user_email,scanned_at,scanned_by,unlocked")
        .eq("event_id", eventId)
        .order("scanned_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const userIds = rows.map((row) => row.user_id).filter(Boolean);
      let profilesById = {};
      if (userIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id,name,school")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        profilesById = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
      const merged = rows.map((row) => {
        const profile = profilesById[row.user_id] || {};
        return {
          ...row,
          name: profile.name || "",
          school: profile.school || "",
        };
      });
      setCheckins(merged);
    } catch (err) {
      console.error("load competition check-ins failed", err);
      setCheckinsError(err?.message || "Failed to load check-ins.");
      setCheckins([]);
    } finally {
      setCheckinsLoading(false);
    }
  }, [authUser?.id, canPreview, selectedEventId]);

  useEffect(() => {
    if (!authUser?.id || !canPreview) return;
    loadCheckins(selectedEventId);
  }, [authUser?.id, canPreview, loadCheckins, selectedEventId]);

  const loadEvents = useCallback(async () => {
    if (!authUser?.id || !canPreview) return;
    setEventsLoading(true);
    setEventsError("");
    try {
      const { data, error } = await supabase
        .from("cg_reading_competition_events")
        .select("id,title,starts_at,ends_at,location,notes,created_at,created_by")
        .order("starts_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("load competition events failed", err);
      setEventsError(err?.message || "Failed to load events.");
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [authUser?.id, canPreview]);

  useEffect(() => {
    if (!authUser?.id || !canPreview) return;
    loadEvents();
  }, [authUser?.id, canPreview, loadEvents]);

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
    if (!selectedEventId) {
      setScanError("Select an event before checking in.");
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
            event_id: selectedEventId,
            user_id: userId,
            user_email: profile.email || null,
            scanned_by: authUser?.id || null,
            scanned_at: new Date().toISOString(),
            unlocked: true,
          },
          { onConflict: "event_id,user_id" }
        );
      if (upsertError) throw upsertError;
      setScanProfile(profile);
      setScanStatus("Checked in and unlocked.");
      loadCheckins(selectedEventId);
    } catch (err) {
      console.error("competition check-in failed", err);
      setScanError(err?.message || "Check-in failed.");
      setScanStatus("");
    }
  }, [authUser?.id, loadCheckins, selectedEventId]);

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
    if (!selectedEventId) {
      setScanError("Select an event before checking in.");
      return;
    }
    if (!scanManualId.trim()) {
      setScanError("Enter a user ID before checking in.");
      return;
    }
    setScanError("");
    setScanProfile(null);
    await processUserId(scanManualId);
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim()) {
      setEventsError("Event title is required.");
      return;
    }
    const startsAtIso = toIsoStringOrNull(eventForm.startsAt);
    if (!startsAtIso) {
      setEventsError("Start date and time are required.");
      return;
    }
    const endsAtIso = toIsoStringOrNull(eventForm.endsAt);
    if (eventForm.endsAt && !endsAtIso) {
      setEventsError("End date and time is invalid.");
      return;
    }
    setEventsError("");
    setEventSaving(true);
    try {
      const payload = {
        title: eventForm.title.trim(),
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        location: eventForm.location.trim() || null,
        notes: eventForm.notes.trim() || null,
        created_by: authUser?.id || null,
      };
      const { error } = await supabase
        .from("cg_reading_competition_events")
        .insert(payload);
      if (error) throw error;
      setEventForm({ title: "", startsAt: "", endsAt: "", location: "", notes: "" });
      loadEvents();
    } catch (err) {
      console.error("create competition event failed", err);
      setEventsError(err?.message || "Failed to create event.");
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!eventId) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this event?");
      if (!ok) return;
    }
    setEventsError("");
    setEventDeleteBusyId(eventId);
    try {
      const { error } = await supabase
        .from("cg_reading_competition_events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
      setEvents((prev) => prev.filter((row) => row.id !== eventId));
      if (selectedEventId === eventId) {
        setSelectedEventId("");
        setCheckins([]);
      }
    } catch (err) {
      console.error("delete competition event failed", err);
      setEventsError(err?.message || "Failed to delete event.");
    } finally {
      setEventDeleteBusyId("");
    }
  };

  const handleRemoveCheckin = async (row) => {
    const userId = row?.user_id;
    const eventId = row?.event_id;
    if (!userId || !eventId) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm("Remove this check-in?");
      if (!ok) return;
    }
    setManageError("");
    setManageBusyId(userId);
    try {
      const { error } = await supabase
        .from("cg_reading_competition_access")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId);
      if (error) throw error;
      setCheckins((prev) =>
        prev.filter((item) => !(item.user_id === userId && item.event_id === eventId))
      );
    } catch (err) {
      console.error("remove check-in failed", err);
      setManageError(err?.message || "Failed to remove check-in.");
    } finally {
      setManageBusyId("");
    }
  };

  if (!authLoading && !authUser) {
    return (
      <PageWrap>
        <HeaderBar title="Competition Mode" />
        <Card>
          <p style={{ color: "#6b7280" }}>Please sign in to access Competition Mode.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  if (!authLoading && !canPreview) {
    return (
      <PageWrap>
        <HeaderBar title="Competition Mode" />
        <Card>
          <p style={{ color: "#6b7280" }}>This page is limited to staff accounts.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <HeaderBar title="Competition Mode" />
      <Card>
        {isAdmin && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 600, color: "#111827", marginBottom: 8 }}>Schedule Competition Event</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Title</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Round 1 - Morning Session"
                  style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                />
              </div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Start</label>
                  <input
                    type="datetime-local"
                    value={eventForm.startsAt}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                    style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>End (optional)</label>
                  <input
                    type="datetime-local"
                    value={eventForm.endsAt}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                    style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Location (optional)</label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Room, campus, or venue"
                    style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Notes (optional)</label>
                  <input
                    type="text"
                    value={eventForm.notes}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Extra details"
                    style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                  />
                </div>
              </div>
              {eventsError && <div style={{ color: "#dc2626", fontSize: 13 }}>{eventsError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="primary" onClick={handleCreateEvent} disabled={eventSaving}>
                  {eventSaving ? "Saving..." : "Create Event"}
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={() => {
                    setEventForm({ title: "", startsAt: "", endsAt: "", location: "", notes: "" });
                    setEventsError("");
                  }}
                >
                  Clear
                </Btn>
              </div>
            </div>
          </div>
        )}
        {isAdmin && (
          <LiveTestSessionsPanel
            testType="sat_reading_competition"
            title="Live Reading Competition Sessions"
            description="Watch active Reading Competition sessions and manage them in real time."
          />
        )}

        <div
          style={{
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            padding: 12,
            borderRadius: 10,
            marginTop: isAdmin ? 16 : 0,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, color: "#111827" }}>Competition Check-in</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                Scan a student QR to mark attendance and unlock the competition.
              </div>
            </div>
            <Btn
              variant="secondary"
              onClick={scanActive ? stopScan : startScan}
              disabled={!selectedEventId && !scanActive}
            >
              {scanActive ? "Stop Scan" : "Start Scan"}
            </Btn>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 12 }}>
            <div style={{ display: "grid", gap: 6, minWidth: 240 }}>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  if (scanActive) stopScan();
                  setSelectedEventId(e.target.value);
                  setScanStatus("");
                  setScanError("");
                  setScanProfile(null);
                }}
                style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
              >
                <option value="">Select event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} {event.starts_at ? `- ${formatTimestamp(event.starts_at)}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 12, color: selectedEvent ? "#475569" : "#dc2626" }}>
              {selectedEvent
                ? `Selected: ${selectedEvent.title}`
                : "Select an event to enable check-ins."}
            </div>
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
                  <Btn variant="secondary" onClick={handleManualCheckin} disabled={!selectedEventId}>
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

        <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 600, color: "#111827" }}>Scheduled Events</div>
            <Btn variant="secondary" onClick={loadEvents} disabled={eventsLoading}>
              {eventsLoading ? "Refreshing..." : "Refresh Events"}
            </Btn>
          </div>
          {eventsError && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{eventsError}</div>}
          <div style={{ marginTop: 8, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "6px 8px" }}>#</th>
                  <th style={{ padding: "6px 8px" }}>Title</th>
                  <th style={{ padding: "6px 8px" }}>Start</th>
                  <th style={{ padding: "6px 8px" }}>End</th>
                  <th style={{ padding: "6px 8px" }}>Location</th>
                  <th style={{ padding: "6px 8px" }}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && !eventsLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "10px 8px", color: "#6b7280" }}>
                      No events scheduled yet.
                    </td>
                  </tr>
                ) : (
                  events.map((row, idx) => (
                    <tr key={row.id || `event-${idx}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "6px 8px", color: "#64748b" }}>{idx + 1}</td>
                      <td style={{ padding: "6px 8px" }}>{row.title}</td>
                      <td style={{ padding: "6px 8px" }}>{formatTimestamp(row.starts_at) || "-"}</td>
                      <td style={{ padding: "6px 8px" }}>{formatTimestamp(row.ends_at) || "-"}</td>
                      <td style={{ padding: "6px 8px" }}>{row.location || "-"}</td>
                      <td style={{ padding: "6px 8px" }}>
                        {isAdmin ? (
                          <Btn
                            variant="secondary"
                            onClick={() => handleDeleteEvent(row.id)}
                            disabled={!row.id || eventDeleteBusyId === row.id}
                            style={{
                              fontSize: 12,
                              padding: "0 10px",
                              height: 28,
                              background: "#dc2626",
                              color: "#ffffff",
                              border: "1px solid #dc2626",
                            }}
                          >
                            {eventDeleteBusyId === row.id ? "Removing..." : "Remove"}
                          </Btn>
                        ) : (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>Admin only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 600, color: "#111827" }}>Checked-in Students</div>
            <Btn
              variant="secondary"
              onClick={() => loadCheckins()}
              disabled={checkinsLoading || !selectedEventId}
            >
              {checkinsLoading ? "Refreshing..." : "Refresh List"}
            </Btn>
          </div>
          {checkinsError && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{checkinsError}</div>}
          {manageError && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{manageError}</div>}
          <div style={{ marginTop: 8, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "6px 8px" }}>#</th>
                  <th style={{ padding: "6px 8px" }}>Name</th>
                  <th style={{ padding: "6px 8px" }}>Email</th>
                  <th style={{ padding: "6px 8px" }}>School</th>
                  <th style={{ padding: "6px 8px" }}>Checked In</th>
                  <th style={{ padding: "6px 8px" }}>Manage</th>
                </tr>
              </thead>
              <tbody>
                {!selectedEventId ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "10px 8px", color: "#6b7280" }}>
                      Select an event to view check-ins.
                    </td>
                  </tr>
                ) : checkins.length === 0 && !checkinsLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "10px 8px", color: "#6b7280" }}>
                      No check-ins yet.
                    </td>
                  </tr>
                ) : (
                  checkins.map((row, idx) => (
                    <tr key={`${row.user_id || row.user_email || idx}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "6px 8px", color: "#64748b" }}>{idx + 1}</td>
                      <td style={{ padding: "6px 8px" }}>{row.name || "-"}</td>
                      <td style={{ padding: "6px 8px" }}>{row.user_email || "-"}</td>
                      <td style={{ padding: "6px 8px" }}>{row.school || "-"}</td>
                      <td style={{ padding: "6px 8px" }}>{formatTimestamp(row.scanned_at) || "-"}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <Btn
                          variant="secondary"
                          onClick={() => handleRemoveCheckin(row)}
                          disabled={!row.user_id || manageBusyId === row.user_id}
                          style={{
                            fontSize: 12,
                            padding: "0 10px",
                            height: 28,
                            background: "#dc2626",
                            color: "#ffffff",
                            border: "1px solid #dc2626",
                          }}
                        >
                          {manageBusyId === row.user_id ? "Removing..." : "Remove"}
                        </Btn>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isAdmin && (
          <div style={{ border: "1px dashed #93c5fd", background: "#eff6ff", padding: 12, borderRadius: 10, marginTop: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: "#1d4ed8", fontWeight: 600 }}>
                Admin Preview
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

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn variant="secondary" onClick={() => onNavigate("sat-reading-competition")}>
            Open Reading Competition
          </Btn>
          <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
        </div>
      </Card>
    </PageWrap>
  );
}
