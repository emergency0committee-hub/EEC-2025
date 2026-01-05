import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import Btn from "./Btn.jsx";
import { supabase } from "../lib/supabase.js";

const LIVE_TEST_TABLE = (import.meta.env.VITE_LIVE_TEST_TABLE || "cg_live_test_sessions").trim();
const ACTIVE_STATUSES = ["in_progress", "paused"];

const formatElapsed = (start) => {
  if (!start) return "-";
  const ms = Date.now() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs ? `${hrs}h ${rem}m` : `${mins}m`;
};

const mapRowToSession = (row) => {
  const totalQuestions = row?.total_questions || null;
  const answered = Number.isFinite(row?.answered_count) ? row.answered_count : 0;
  const progress = totalQuestions ? Math.round((answered / totalQuestions) * 100) : null;
  return {
    id: row?.id,
    name: row?.participant_name || row?.user_email || "Student",
    email: row?.user_email || "",
    school: row?.school || "",
    status: row?.status || "in_progress",
    startedAt: row?.started_at || row?.created_at || null,
    answered,
    totalQuestions,
    progress,
  };
};

export default function LiveTestSessionsPanel({ testType, title, description }) {
  LiveTestSessionsPanel.propTypes = {
    testType: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
  };

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => {
    if (!testType) return;
    setLoading(true);
    setError("");
    try {
      const resp = await supabase
        .from(LIVE_TEST_TABLE)
        .select("*")
        .eq("test_type", testType)
        .in("status", ACTIVE_STATUSES)
        .order("started_at", { ascending: false })
        .limit(200);
      if (resp.error) throw resp.error;
      const rows = Array.isArray(resp.data) ? resp.data : [];
      setSessions(rows.map(mapRowToSession));
    } catch (err) {
      console.warn("Live session fetch issue", err);
      const code = err?.code || "";
      const base = err?.message || "Unknown error.";
      const detail =
        code === "42P01"
          ? `Missing table. Expected ${LIVE_TEST_TABLE}.`
          : code === "42703"
          ? "Missing column. Ensure status, started_at, and answered_count exist."
          : "Check table access/RLS and that sessions are written during tests.";
      setError(`No live sessions found yet. Last fetch error: ${base} ${detail}`);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [testType]);

  useEffect(() => {
    loadSessions();
    const t = setInterval(loadSessions, 15000);
    return () => clearInterval(t);
  }, [loadSessions]);

  const updateLocal = (id, updates) => {
    setSessions((list) => list.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleAction = async (session, action) => {
    const targetStatus =
      action === "pause" ? "paused" : action === "resume" ? "in_progress" : "completed";
    const prev = session.status;
    updateLocal(session.id, { status: targetStatus });
    try {
      const updates = { status: targetStatus, last_seen_at: new Date().toISOString() };
      if (action === "force-submit") {
        updates.finished_at = new Date().toISOString();
      }
      const { error: updateError } = await supabase
        .from(LIVE_TEST_TABLE)
        .update(updates)
        .eq("id", session.id);
      if (updateError) throw updateError;
    } catch (err) {
      console.error("Live session action failed", err);
      updateLocal(session.id, { status: prev });
      alert(`Failed to ${action.replace("-", " ")} this session.`);
    }
  };

  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, color: "#111827" }}>{title}</div>
          {description ? (
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
              {description}
            </div>
          ) : null}
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Name</th>
                <th style={{ padding: 8, textAlign: "left" }}>Email</th>
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
                    <td style={{ padding: 8 }}>{s.email || "-"}</td>
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
                          Continue
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
    </div>
  );
}
