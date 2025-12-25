// src/pages/admin/AdminTable.jsx
import React from "react";
import PropTypes from "prop-types";

AdminTable.propTypes = {
  submissions: PropTypes.array.isRequired,
  onViewSubmission: PropTypes.func.isRequired,
  onDeleteSubmission: PropTypes.func,
  onEditSubmission: PropTypes.func,
  onSort: PropTypes.func,
  sortKey: PropTypes.string,
  allowDelete: PropTypes.bool,
  allowEdit: PropTypes.bool,
};

export default function AdminTable({
  submissions,
  onViewSubmission,
  onDeleteSubmission,
  onEditSubmission,
  onSort,
  sortKey,
  allowDelete = true,
  allowEdit = true,
}) {
  if (!submissions || submissions.length === 0) {
    return <p style={{ color: "#6b7280" }}>No submissions found.</p>;
  }

  const MIN_COMPLETION_PCT = 0.8;
  const MIN_DURATION_MINUTES_NEW = 20;
  const MIN_DURATION_MINUTES_OLD = 30;

  const fmtDuration = (startIso, endIso) => {
    try {
      const s = startIso ? new Date(startIso).getTime() : NaN;
      const e = endIso ? new Date(endIso).getTime() : NaN;
      if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return "-";
      const sec = Math.round((e - s) / 1000);
      const mm = Math.floor(sec / 60).toString().padStart(2, "0");
      const ss = (sec % 60).toString().padStart(2, "0");
      return `${mm}:${ss}`;
    } catch {
      return "—";
    }
  };

  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M2.458 12C3.732 7.943 7.522 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.478 0-8.268-2.943-9.542-7Z" stroke="#374151" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="3" stroke="#374151" strokeWidth="1.6"/>
    </svg>
  );

  const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M9.5 4h5l.75 2H20v2H4V6h4.75L9.5 4Z" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M7 9l1 10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-10" stroke="#ef4444" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M10 11v7M14 11v7" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );

  const PencilIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M14.5 4.5l5 5L9 20H4v-5l10.5-10.5Z" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const IconButton = ({ title, ariaLabel, variant = "neutral", onClick, onAuxClick, children }) => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 8,
      background: "#fff",
      cursor: "pointer",
      border: "1px solid #d1d5db",
      transition: "background 120ms ease, box-shadow 120ms ease",
    };
    const style = variant === "danger" ? { ...base, border: "1px solid #ef4444" } : base;
    return (
      <button
        onClick={onClick}
        onAuxClick={onAuxClick}
        title={title}
        aria-label={ariaLabel || title}
        style={style}
        onMouseEnter={(e) => (e.currentTarget.style.background = variant === "danger" ? "#fef2f2" : "#f9fafb")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
      >
        {children}
      </button>
    );
  };

  const headerArrow = (key) => {
    if (!sortKey || !sortKey.startsWith(key)) return "";
    return sortKey === key ? "▲" : "▼";
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <th
              style={{ padding: 12, textAlign: "left", fontWeight: 600, cursor: onSort ? "pointer" : "default" }}
              onClick={() => onSort?.(sortKey === "name" ? "name_desc" : "name")}
            >
              Name {headerArrow("name")}
            </th>
            <th
              style={{ padding: 12, textAlign: "left", fontWeight: 600, cursor: onSort ? "pointer" : "default" }}
              onClick={() => onSort?.(sortKey === "school" ? "school_desc" : "school")}
            >
              School {headerArrow("school")}
            </th>
            <th
              style={{ padding: 12, textAlign: "left", fontWeight: 600, cursor: onSort ? "pointer" : "default" }}
              onClick={() => onSort?.(sortKey === "ts" ? "ts_desc" : "ts")}
            >
              Submitted {headerArrow("ts")}
            </th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Time</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Duration</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Answered</th>
            <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Manage</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => {
            const profileSource =
              sub.profile_match ||
              sub.profile ||
              {};
            const participantFallback = sub.participant || {};

            const totalQuestions = (() => {
              const counts =
                sub.pillar_counts ||
                sub.pillarCounts ||
                sub.pillar_count ||
                sub.pillarCount ||
                {};
              const raw = counts?.totalQuestions ?? counts?.total_questions ?? null;
              const parsed = Number(raw);
              if (Number.isFinite(parsed) && parsed > 0) return parsed;
              return 300;
            })();

            const answeredCount = (() => {
              const numericCandidates = [
                profileSource.answered_count,
                participantFallback.answered_count,
                participantFallback.answered,
                sub.answered_count,
                sub.answer_count,
              ];
              for (const candidate of numericCandidates) {
                const parsed = Number(candidate);
                if (Number.isFinite(parsed) && parsed >= 0) return parsed;
              }
              const containers = [sub.answers, sub.answers_json, participantFallback.answers, profileSource.answers];
              for (const container of containers) {
                if (Array.isArray(container)) return container.length;
                if (container && typeof container === "object") return Object.keys(container).length;
                if (typeof container === "string") {
                  const trimmed = container.trim();
                  if (!trimmed) continue;
                  try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed.length;
                    if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
                  } catch {
                    continue;
                  }
                }
              }
              return 0;
            })();

            const durationSeconds = (() => {
              const directSecondsCandidates = [
                sub.duration_sec,
                sub.durationSeconds,
                participantFallback.duration_sec,
                participantFallback.durationSeconds,
              ];
              for (const candidate of directSecondsCandidates) {
                const parsed = Number(candidate);
                if (Number.isFinite(parsed) && parsed >= 0) return parsed;
              }
              const directMinutesCandidates = [
                sub.duration_minutes,
                sub.durationMinutes,
                participantFallback.duration_minutes,
                participantFallback.durationMinutes,
              ];
              for (const candidate of directMinutesCandidates) {
                const parsed = Number(candidate);
                if (Number.isFinite(parsed) && parsed >= 0) return parsed * 60;
              }
              try {
                const s = participantFallback.started_at ? new Date(participantFallback.started_at).getTime() : NaN;
                const e = participantFallback.finished_at ? new Date(participantFallback.finished_at).getTime() : NaN;
                if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
                return Math.round((e - s) / 1000);
              } catch {
                return null;
              }
            })();

            const answeredPct = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
            const durationMinutes =
              typeof durationSeconds === "number" && Number.isFinite(durationSeconds) ? durationSeconds / 60 : null;
            const minDurationMinutes = totalQuestions > 200 ? MIN_DURATION_MINUTES_OLD : MIN_DURATION_MINUTES_NEW;
            const isIncomplete =
              !sub?._demo &&
              ((durationMinutes != null && durationMinutes < minDurationMinutes) || answeredPct < MIN_COMPLETION_PCT);

            const name =
              profileSource.name ||
              profileSource.full_name ||
              profileSource.username ||
              participantFallback.name ||
              "-";
            const school =
              profileSource.school ||
              participantFallback.school ||
              "-";
            const finished =
              participantFallback.finished_at ||
              sub.ts ||
              sub.created_at ||
              null;
            const d = finished ? new Date(finished) : null;
            const dateStr = d
              ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })
              : "-";
            const timeStr = d ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "-";
            const duration = fmtDuration(
              participantFallback.started_at,
              participantFallback.finished_at
            );
            const answeredDisplay = Number.isFinite(answeredCount) ? answeredCount : "-";
            return (
              <tr
                key={sub.id}
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  background: isIncomplete ? "#fef2f2" : "transparent",
                }}
              >
                <td style={{ padding: 12, color: isIncomplete ? "#b91c1c" : undefined, fontWeight: isIncomplete ? 700 : undefined }}>
                  {name}
                </td>
                <td style={{ padding: 12, color: isIncomplete ? "#b91c1c" : undefined }}>{school}</td>
                <td style={{ padding: 12 }}>{dateStr}</td>
                <td style={{ padding: 12 }}>{timeStr}</td>
                <td style={{ padding: 12 }}>{duration}</td>
                <td style={{ padding: 12, color: isIncomplete ? "#b91c1c" : undefined }}>{answeredDisplay}</td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: "inline-flex", gap: 8 }}>
                    <IconButton
                      title="View details"
                      ariaLabel="View details"
                      onClick={(e) => onViewSubmission(sub, e)}
                      onAuxClick={(e) => onViewSubmission(sub, e)}
                    >
                      <EyeIcon />
                    </IconButton>
                    {allowEdit && onEditSubmission && (
                      <IconButton title="Edit participant" ariaLabel="Edit participant" onClick={() => onEditSubmission(sub)}>
                        <PencilIcon />
                      </IconButton>
                    )}
                    {allowDelete && onDeleteSubmission && (
                      <IconButton
                        title="Delete submission"
                        ariaLabel="Delete submission"
                        variant="danger"
                        onClick={() => onDeleteSubmission?.(sub)}
                      >
                        <TrashIcon />
                      </IconButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
