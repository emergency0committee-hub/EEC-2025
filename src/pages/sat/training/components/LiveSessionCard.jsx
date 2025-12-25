import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import Btn from "../../../../components/Btn.jsx";

const isSafeExternalUrl = (value = "") => {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export default function LiveSessionCard({
  className = "",
  session = null,
  loading = false,
  canManage = false,
  lessonOptions = [],
  busy = false,
  onStart = null,
  onUpdate = null,
  onEnd = null,
  onNavigateHome,
}) {
  const active = Boolean(session?.is_active);
  const sessionTitle = String(session?.title || "").trim();
  const sessionUrl = String(session?.url || "").trim();
  const displayTitle = sessionTitle || "Live Session";
  const displayUrl = sessionUrl || "";

  const [titleInput, setTitleInput] = useState(displayTitle);
  const [urlInput, setUrlInput] = useState(displayUrl);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [showEmbed, setShowEmbed] = useState(false);

  useEffect(() => {
    setTitleInput(displayTitle);
    setUrlInput(displayUrl);
  }, [displayTitle, displayUrl, active]);

  useEffect(() => {
    if (!active) {
      setShowEmbed(false);
      return;
    }
    if (showEmbed && displayUrl) {
      // keep showing the embedded view as the teacher updates the URL
      setUrlInput(displayUrl);
    }
  }, [active, displayUrl, showEmbed]);

  const lessonById = useMemo(() => {
    const map = new Map();
    (Array.isArray(lessonOptions) ? lessonOptions : []).forEach((opt) => {
      const id = opt?.id == null ? "" : String(opt.id);
      if (id) map.set(id, opt);
    });
    return map;
  }, [lessonOptions]);

  const applyLessonChoice = (value) => {
    const id = String(value || "");
    setSelectedLessonId(id);
    const match = lessonById.get(id);
    if (!match) return;
    const title = String(match?.title || "").trim();
    const url = String(match?.url || "").trim();
    if (title) setTitleInput(title);
    if (url) setUrlInput(url);
  };

  const canSubmit = () => {
    if (!canManage) return false;
    if (!className) return false;
    if (busy) return false;
    const url = String(urlInput || "").trim();
    if (!url) return true;
    return isSafeExternalUrl(url);
  };

  const handleStart = async () => {
    if (!onStart) return;
    if (!canSubmit()) return;
    await onStart({
      title: String(titleInput || "").trim(),
      url: String(urlInput || "").trim(),
      resourceId: selectedLessonId || null,
    });
  };

  const handleUpdate = async () => {
    if (!onUpdate) return;
    if (!canSubmit()) return;
    await onUpdate({
      title: String(titleInput || "").trim(),
      url: String(urlInput || "").trim(),
      resourceId: selectedLessonId || null,
    });
  };

  const handleEnd = async () => {
    if (!onEnd) return;
    if (!className || busy) return;
    await onEnd();
    setShowEmbed(false);
  };

  const sessionMeta = useMemo(() => {
    if (!session) return null;
    const started = session.started_at ? new Date(session.started_at) : null;
    const updated = session.updated_at ? new Date(session.updated_at) : null;
    const fmt = (d) => (d && !Number.isNaN(d.getTime()) ? d.toLocaleString() : "");
    return {
      teacher: String(session.teacher_email || "").trim(),
      started: fmt(started),
      updated: fmt(updated),
    };
  }, [session]);

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>Live Session</h3>
          <div style={{ color: "#6b7280" }}>
            {className ? (
              <>
                Class: <b>{className}</b>
              </>
            ) : (
              "Select a class to start a live session."
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              alignSelf: "flex-start",
              fontSize: 12,
              fontWeight: 800,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid",
              borderColor: active ? "#86efac" : "#e5e7eb",
              background: active ? "#ecfdf5" : "#f9fafb",
              color: active ? "#047857" : "#6b7280",
            }}
          >
            {active ? "LIVE" : "Not live"}
          </span>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280", marginTop: 12 }}>Loading live session...</p>
      ) : (
        <>
          {sessionMeta && (sessionMeta.teacher || sessionMeta.started || sessionMeta.updated) && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
              {sessionMeta.teacher && (
                <span>
                  Host: <b>{sessionMeta.teacher}</b>
                </span>
              )}
              {sessionMeta.started && (
                <span style={{ marginLeft: 10 }}>
                  Started: <b>{sessionMeta.started}</b>
                </span>
              )}
              {sessionMeta.updated && (
                <span style={{ marginLeft: 10 }}>
                  Updated: <b>{sessionMeta.updated}</b>
                </span>
              )}
            </div>
          )}

          {canManage && className && (
            <div style={{ marginTop: 14, border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, background: "#f8fafc" }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Host controls (interactive class)</div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Title</span>
                  <input
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g., Linear Equations Workshop"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      outline: "none",
                    }}
                    disabled={busy}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Interactive URL (optional)</span>
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      outline: "none",
                    }}
                    disabled={busy}
                  />
                  {urlInput && !isSafeExternalUrl(urlInput) && (
                    <span style={{ fontSize: 12, color: "#b91c1c" }}>Use a valid http(s) URL.</span>
                  )}
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Or pick a lesson resource</span>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => applyLessonChoice(e.target.value)}
                    disabled={busy || !lessonOptions.length}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
                  >
                    <option value="">{lessonOptions.length ? "Select a lesson..." : "No lesson resources found"}</option>
                    {lessonOptions.map((opt) => (
                      <option key={String(opt.id)} value={String(opt.id)}>
                        {opt.title || opt.url || String(opt.id)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!active ? (
                  <Btn variant="primary" onClick={handleStart} disabled={!canSubmit()}>
                    {busy ? "Starting..." : "Start live session"}
                  </Btn>
                ) : (
                  <>
                    <Btn variant="secondary" onClick={handleUpdate} disabled={!canSubmit()}>
                      {busy ? "Saving..." : "Update"}
                    </Btn>
                    <Btn
                      variant="secondary"
                      onClick={handleEnd}
                      disabled={busy}
                      style={{ borderColor: "#ef4444", color: "#b91c1c" }}
                    >
                      {busy ? "Ending..." : "End session"}
                    </Btn>
                  </>
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                Students join from the <b>Live</b> tab. This is for interactive teaching, not quizzes/tests.
              </div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            {active ? (
              <>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>{displayTitle}</div>
                {displayUrl ? (
                  <>
                    <div style={{ fontSize: 13, color: "#334155", wordBreak: "break-word" }}>
                      Link:{" "}
                      <a href={displayUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                        {displayUrl}
                      </a>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Btn variant="primary" onClick={() => setShowEmbed((v) => !v)}>
                        {showEmbed ? "Hide" : "Join"}
                      </Btn>
                      <Btn variant="secondary" onClick={() => window.open(displayUrl, "_blank", "noopener,noreferrer")}>
                        Open in new tab
                      </Btn>
                    </div>
                    {showEmbed && (
                      <div
                        style={{
                          marginTop: 12,
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          overflow: "hidden",
                          height: 520,
                        }}
                      >
                        <iframe title="Live Session" src={displayUrl} style={{ width: "100%", height: "100%", border: "none" }} />
                      </div>
                    )}
                    <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                      If the embed is blocked, use <b>Open in new tab</b>.
                    </div>
                  </>
                ) : (
                  <div style={{ color: "#6b7280" }}>Waiting for the teacher to share a link/resource.</div>
                )}
              </>
            ) : (
              <div style={{ color: "#6b7280" }}>No live session is active right now.</div>
            )}
          </div>
        </>
      )}

      <div style={{ marginTop: 14 }}>
        <Btn variant="back" onClick={onNavigateHome}>
          Back Home
        </Btn>
      </div>
    </Card>
  );
}

LiveSessionCard.propTypes = {
  className: PropTypes.string,
  session: PropTypes.object,
  loading: PropTypes.bool,
  canManage: PropTypes.bool,
  lessonOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      url: PropTypes.string,
    })
  ),
  busy: PropTypes.bool,
  onStart: PropTypes.func,
  onUpdate: PropTypes.func,
  onEnd: PropTypes.func,
  onNavigateHome: PropTypes.func.isRequired,
};

LiveSessionCard.defaultProps = {
  className: "",
  session: null,
  loading: false,
  canManage: false,
  lessonOptions: [],
  busy: false,
  onStart: null,
  onUpdate: null,
  onEnd: null,
};
