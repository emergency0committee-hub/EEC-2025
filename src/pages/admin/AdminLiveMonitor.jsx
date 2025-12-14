import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";

export default function AdminLiveMonitor({ onNavigate }) {
  AdminLiveMonitor.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mapRowToSession = (row, table) => {
    const participant = row?.participant || row?.profile || {};
    const startAt = participant.started_at || row.started_at || row.ts || row.created_at || null;
    const statusField = Object.prototype.hasOwnProperty.call(row || {}, "submission_status")
      ? "submission_status"
      : Object.prototype.hasOwnProperty.call(row || {}, "status")
      ? "status"
      : null;
    const rawStatus = (statusField && row?.[statusField]) || participant?.status;
    const status = rawStatus || (participant?.finished_at ? "completed" : "in_progress");
    const answersArr = Array.isArray(row?.answers)
      ? row.answers
      : Array.isArray(row?.answers_json)
      ? row.answers_json
      : [];
    const totalQuestions = participant.total_questions || row.total_questions || null;
    const answered = Number.isFinite(participant.answered)
      ? participant.answered
      : answersArr.length || 0;
    const progress = totalQuestions ? Math.round((answered / totalQuestions) * 100) : null;
    return {
      id: row.id,
      name: participant.name || participant.email || "Student",
      email: participant.email || "",
      school: participant.school || participant.school_name || "",
      testType: row.practice?.kind
        ? `SAT ${String(row.practice.kind || "").toUpperCase()}`
        : row.riasec_code
        ? "Career"
        : "Test",
      status: status || "in_progress",
      startedAt: startAt,
      answered,
      totalQuestions,
      progress,
      table,
      statusField,
    };
  };

  const loadSessions = async () => {
    setLoading(true);
    setError("");
    const candidates = Array.from(new Set(["cg_results", "cg_submissions", "sat_diagnostic_submissions"].filter(Boolean)));
    const next = [];
    let lastErr = null;
    for (const table of candidates) {
      try {
        const resp = await supabase.from(table).select("*").limit(200);
        if (resp.error) {
          lastErr = resp.error;
          continue;
        }
        (resp.data || []).forEach((row) => {
          const participant = row?.participant || row?.profile || {};
          const status = row?.status || participant?.status || (participant?.finished_at ? "completed" : "in_progress");
          const inProgress = status === "in_progress" || (!participant?.finished_at && status !== "completed");
          if (!inProgress) return;
          next.push(mapRowToSession(row, table));
        });
      } catch (err) {
        lastErr = err;
      }
    }
    if (!next.length) {
      if (lastErr) {
        console.warn("Live session fetch issue", lastErr);
        setError("No live sessions found yet (source table missing status). Showing demo.");
      } else {
        setError("");
      }
      const demoStart = new Date(Date.now() - 12 * 60 * 1000).toISOString();
      next.push({
        id: "demo-live",
        name: "Demo Student",
        email: "demo@example.com",
        school: "Preview Academy",
        testType: "Career",
        status: "in_progress",
        startedAt: demoStart,
        answered: 12,
        totalQuestions: 40,
        progress: 30,
        table: null,
      });
    }
    setSessions(next);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
    const t = setInterval(loadSessions, 15000);
    return () => clearInterval(t);
  }, []);

  const updateLocal = (id, updates) => {
    setSessions((list) => list.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleAction = async (session, action) => {
    const targetStatus =
      action === "pause" ? "paused" : action === "resume" ? "in_progress" : "completed";
    const prev = session.status;
    updateLocal(session.id, { status: targetStatus });
    if (!session.table || !session.statusField) {
      return;
    }
    try {
      const updates = { [session.statusField]: targetStatus };
      if (action === "force-submit") {
        updates.finished_at = new Date().toISOString();
      }
      const { error } = await supabase.from(session.table).update(updates).eq("id", session.id);
      if (error) throw error;
    } catch (err) {
      console.error("Session action failed", err);
      updateLocal(session.id, { status: prev });
      alert(`Failed to ${action.replace("-", " ")} this session.`);
    }
  };

  const formatElapsed = (start) => {
    if (!start) return "-";
    const ms = Date.now() - new Date(start).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "-";
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return hrs ? `${hrs}h ${rem}m` : `${mins}m`;
  };

  return (
    <PageWrap>
      <HeaderBar
        title="Live Test Monitor"
        right={(
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>
              Back to Home
            </Btn>
            <Btn variant="back" onClick={() => onNavigate("admin-dashboard")}>
              Back to Dashboard
            </Btn>
          </div>
        )}
      />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>In-progress Sessions</h3>
            <p style={{ color: "#6b7280", margin: "6px 0 0" }}>
              Monitor Career Guidance and SAT tests in real time. Pause, resume, or force submit when needed.
            </p>
          </div>
          <Btn variant="secondary" onClick={loadSessions} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Btn>
        </div>
        {error && (
          <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>
            {error}
          </div>
        )}
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading live sessions...</p>
        ) : sessions.length > 0 ? (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: 8, textAlign: "left" }}>Name</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Test</th>
                  <th style={{ padding: 8, textAlign: "left" }}>School</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Status</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Started</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Elapsed</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Progress</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const startedStr = s.startedAt ? new Date(s.startedAt).toLocaleString() : "-";
                  const progressText =
                    Number.isFinite(s.answered) && s.totalQuestions
                      ? `${s.answered} / ${s.totalQuestions}`
                      : Number.isFinite(s.answered)
                      ? `${s.answered}`
                      : "-";
                  const progressPct = Number.isFinite(s.progress) ? s.progress : null;
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8 }}>{s.name || "-"}</td>
                      <td style={{ padding: 8 }}>{s.testType || "Test"}</td>
                      <td style={{ padding: 8 }}>{s.school || "-"}</td>
                      <td style={{ padding: 8, textTransform: "capitalize" }}>{s.status || "-"}</td>
                      <td style={{ padding: 8 }}>{startedStr}</td>
                      <td style={{ padding: 8 }}>{formatElapsed(s.startedAt)}</td>
                      <td style={{ padding: 8 }}>
                        {progressText}
                        {progressPct !== null ? ` (${progressPct}%)` : ""}
                      </td>
                      <td style={{ padding: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {s.status === "in_progress" ? (
                          <Btn variant="secondary" onClick={() => handleAction(s, "pause")}>
                            Pause
                          </Btn>
                        ) : (
                          <Btn variant="secondary" onClick={() => handleAction(s, "resume")}>
                            Resume
                          </Btn>
                        )}
                        <Btn variant="primary" onClick={() => handleAction(s, "force-submit")}>
                          Force submit
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "#6b7280", marginTop: 8 }}>No live sessions right now.</p>
        )}
      </Card>
    </PageWrap>
  );
}
