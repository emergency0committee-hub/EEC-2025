import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../components/Btn.jsx";

const pillStyles = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
  },
  complete: { background: "#ecfdf5", color: "#047857" },
  info: { background: "#eff6ff", color: "#1d4ed8" },
  warn: { background: "#fef2f2", color: "#b91c1c" },
};

export default function StudentResourceCard({
  resource,
  studentClass,
  studentAttempts,
  onNavigate,
  formatDuration,
  decodeQuestions,
  extractMeta,
}) {
  const computed = useMemo(() => {
    if (!resource) return null;
    const items = decodeQuestions(resource) || [];
    const meta = extractMeta(resource);
    const practiceMeta = { ...meta };
    const questionMetaSource =
      (resource?.payload && typeof resource.payload === "object" && typeof resource.payload.meta === "object" && resource.payload.meta) ||
      (resource?.payload && typeof resource.payload === "object" && typeof resource.payload.settings === "object" && resource.payload.settings) ||
      {};
    const refsLikely = Array.isArray(items) && items.length > 0 && items.every((item) => item && item.questionId);
    const questionRefs = Boolean(questionMetaSource.questionRefs || refsLikely);
    const referenceBank = Array.isArray(items) ? items.find((item) => item?.bank)?.bank : null;
    const questionBank = questionMetaSource.questionBank || questionMetaSource.bank || referenceBank || null;
    const kindLower = String(resource.kind || "classwork").toLowerCase();
    if (kindLower === "homework") {
      practiceMeta.resumeMode = "restart";
      practiceMeta.durationSec = null;
    }
    const resolvedSubject =
      resource.subject ||
      (resource.payload && typeof resource.payload === "object" && resource.payload.meta?.subject) ||
      resource.section ||
      null;
    const normalizedSubject = resolvedSubject ? String(resolvedSubject).trim().toLowerCase() : "";
    const attemptInfo = resource?.id ? studentAttempts[resource.id] || null : null;
    const attemptCount = attemptInfo?.attempts?.length || 0;
    const latestStatus = attemptInfo?.latest?.status || null;
    const completed = attemptInfo?.completed ?? (latestStatus === "completed");
    const attemptLimit = practiceMeta?.attemptLimit != null ? practiceMeta.attemptLimit : null;
    const allowRetake = practiceMeta?.allowRetake !== false;
    const limitReached = items.length > 0 && completed && ((!allowRetake && attemptLimit == null) || (attemptLimit != null && attemptCount >= attemptLimit));
    const baseCanStart = items.length > 0 && !limitReached;
    const kindLabel = (resource.kind || "classwork").toLowerCase();
    const prettyKind = kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1);
    const durationLabel = items.length > 0 ? formatDuration(practiceMeta?.durationSec) : null;
    const deadlineIso =
      practiceMeta?.deadline ||
      (resource.payload && typeof resource.payload === "object" && resource.payload.meta?.deadline) ||
      (resource.payload && typeof resource.payload === "object" && resource.payload.settings?.deadline) ||
      resource.deadline ||
      null;
    const deadlineDate = deadlineIso ? new Date(deadlineIso) : null;
    const deadlineValid = deadlineDate && !Number.isNaN(deadlineDate.getTime());
    const deadlinePassed = Boolean(kindLower === "homework" && deadlineValid && Date.now() > deadlineDate.getTime());
    const deadlineLabel = deadlineValid ? deadlineDate.toLocaleString() : "";
    const attemptLabel = attemptCount > 0 ? `Attempts: ${attemptCount}${attemptLimit ? `/${attemptLimit}` : ""}` : null;
    let hasResume = false;
    if (practiceMeta?.resumeMode === "resume" && resource?.id) {
      try { hasResume = Boolean(localStorage.getItem(`cg_sat_resume_${resource.id}`)); } catch {}
    }
    const homeworkViewMode = kindLower === "homework" && completed && deadlinePassed;
    const previewMode = completed && kindLower !== "homework";
    const startLabel = !items.length
      ? ""
      : homeworkViewMode
      ? "View"
      : previewMode
      ? "Preview"
      : completed && kindLower === "homework"
      ? "Edit Homework"
      : limitReached
      ? "Completed"
      : (practiceMeta?.resumeMode === "resume" && hasResume ? "Resume" : `Start ${prettyKind}`);
    const canStart = homeworkViewMode ? items.length > 0 : baseCanStart;
    const startAttemptIndex = attemptCount + 1;
    const routeTarget = ["exam", "sat", "diagnostic", "test"].includes(kindLower) ? "sat-exam" : "sat-assignment";

    const launchPractice = () => {
      if (!canStart) return;
      const durationSec = (typeof practiceMeta.durationSec === "number" && practiceMeta.durationSec > 0) ? practiceMeta.durationSec : null;
      const metaForPractice = { ...practiceMeta };
      if (questionRefs) metaForPractice.questionRefs = true;
      if (questionBank && !metaForPractice.questionBank) metaForPractice.questionBank = questionBank;
      if (deadlineIso && !metaForPractice.deadline) metaForPractice.deadline = deadlineIso;
      const practicePayload = {
        kind: resource.kind || "classwork",
        resourceId: resource.id || null,
        className: studentClass || null,
        subject: normalizedSubject || null,
        section: resource.section || null,
        unit: resource.unit || null,
        lesson: resource.lesson || null,
        meta: metaForPractice,
        attemptIndex: startAttemptIndex,
      };
      if (deadlineIso) practicePayload.deadline = deadlineIso;
      if (homeworkViewMode) practicePayload.reviewOnly = true;
      if (!questionRefs) {
        practicePayload.custom = {
          questions: items,
          durationSec,
          title: resource.title || prettyKind,
          meta: metaForPractice,
        };
      }
      onNavigate(routeTarget, { practice: practicePayload });
    };

    return {
      items,
      prettyKind,
      durationLabel,
      deadlineLabel,
      deadlinePassed,
      attemptLabel,
      completed,
      limitReached,
      startLabel,
      canStart,
      launchPractice,
    };
  }, [resource, studentAttempts, studentClass, decodeQuestions, extractMeta, formatDuration, onNavigate]);

  if (!resource || !computed) return null;

  const {
    items,
    prettyKind,
    durationLabel,
    deadlineLabel,
    deadlinePassed,
    attemptLabel,
    completed,
    limitReached,
    startLabel,
    canStart,
    launchPractice,
  } = computed;

  const key = resource.id || `${resource.title || "resource"}_${resource.url || "link"}`;
  const pill = (variant, text) => (
    <span key={`${key}_${variant}_${text}`} style={{ ...pillStyles.base, ...(pillStyles[variant] || {}) }}>{text}</span>
  );

  return (
    <div key={key} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>{resource.title || "Untitled Resource"}</div>
        <span style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{prettyKind}</span>
      </div>
      {(resource.unit || resource.lesson) && (
        <div style={{ color: "#6b7280", fontSize: 12 }}>
          {[resource.unit, resource.lesson].filter(Boolean).join(" - ")}
        </div>
      )}
      {deadlineLabel && (
        <div style={{ color: deadlinePassed ? "#dc2626" : "#6b7280", fontSize: 12 }}>Due: {deadlineLabel}</div>
      )}
      {resource.url && (!resource.payload || !items.length) && (
        <div style={{ marginTop: 4, wordBreak: "break-word" }}>
          <a href={resource.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
            {resource.url}
          </a>
        </div>
      )}
      {items.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {completed && pill("complete", "Completed")}
          {!completed && !attemptLabel && pill("info", "Not started")}
          {attemptLabel && pill("info", attemptLabel)}
          {durationLabel && pill("info", `Time: ${durationLabel}`)}
          {limitReached && pill("warn", "Retake locked")}
        </div>
      )}
      <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {resource.url && <Btn variant="secondary" onClick={() => window.open(resource.url, "_blank")}>Open</Btn>}
        {items.length > 0 && (
          <Btn variant="primary" disabled={!canStart} onClick={launchPractice}>
            {startLabel}
          </Btn>
        )}
      </div>
      {limitReached && (
        <div style={{ color: "#ef4444", fontSize: 12 }}>
          You have completed this {prettyKind.toLowerCase()}. Ask your teacher if you need another attempt.
        </div>
      )}
    </div>
  );
}

StudentResourceCard.propTypes = {
  resource: PropTypes.object,
  studentClass: PropTypes.string,
  studentAttempts: PropTypes.object.isRequired,
  onNavigate: PropTypes.func.isRequired,
  formatDuration: PropTypes.func.isRequired,
  decodeQuestions: PropTypes.func.isRequired,
  extractMeta: PropTypes.func.isRequired,
};

StudentResourceCard.defaultProps = {
  resource: null,
  studentClass: "",
};
