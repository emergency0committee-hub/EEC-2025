import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import Btn from "../../../../components/Btn.jsx";
import AdaptiveInsightsCard from "./AdaptiveInsightsCard.jsx";
import {
  BANKS,
  SUBJECT_OPTIONS,
  MATH_UNIT_OPTIONS,
} from "../../../../lib/questionBanks.js";

function SubjectSelect({ value, onChange, disabledLabel }) {
  if (disabledLabel) {
    return (
      <div
        style={{
          padding: "10px 12px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          background: "#f9fafb",
          color: "#374151",
          minWidth: 140,
        }}
      >
        {disabledLabel}
      </div>
    );
  }
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
    >
      {SUBJECT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label.EN || opt.value}
        </option>
      ))}
    </select>
  );
}

SubjectSelect.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabledLabel: PropTypes.string,
};

SubjectSelect.defaultProps = {
  disabledLabel: null,
};

export default function AdminClassDetail({
  selectedClass,
  onBackToClasses,
  classTab,
  setClassTab,
  activeBank,
  isTestBank,
  subjectDisplayLabel,
  activeSubject,
  autoAssign,
  handleAutoAssignChange,
  showMathSelectors,
  activeLessons,
  handleAutoGenerate,
  autoGenerating,
  autoAssignDeadlineEnabled,
  questionStats,
  highlightStats,
  highlightKey,
  selectedClassLabel,
  usedQuestionCount,
  catalogBusy,
  catalogError,
  catalogLoaded,
  refreshQuestionStats,
  findSubjectLabel,
  formatUnitLabel,
  formatLessonLabel,
  resources,
  resLoading,
  resourceLibrary,
  libraryLoading,
  loadResourceLibrary,
  addLibraryResourceToClass,
  extractResourceMeta,
  decodeResourceQuestions,
  formatDuration,
  pillStyles,
  deleteResource,
  onNavigate,
  classLogs,
  logsLoading,
  fmtDate,
  openClassLog,
  adaptiveInsights,
  onDeleteLog,
  refreshClassData,
}) {
  const [savingLesson, setSavingLesson] = useState(false);
  const [libraryPage, setLibraryPage] = useState(1);
  const getKind = (res) => String(res?.payload?.kindOverride || res?.kind || "").toLowerCase();
  const [previewUrl, setPreviewUrl] = useState("");
  const isPpt = (url) => /\.(pptx?|ppsx?)(\?|$)/i.test(String(url || ""));
  const buildPreviewUrl = (url) => {
    if (!url) return "";
    if (isPpt(url)) return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return url;
  };
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleAddLesson = async (item) => {
    if (!item) return;
    setSavingLesson(true);
    try {
      await addLibraryResourceToClass(item);
      alert("Resource added.");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to add resource.");
    } finally {
      setSavingLesson(false);
    }
  };

  return (
    <>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 style={{ marginTop: 0 }}>Class: {selectedClass}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn
              variant="back"
              onClick={onBackToClasses}
            >
              Back to Classes
            </Btn>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["lessons", "classwork", "analytics"].map((id) => (
            <button
              key={id}
              onClick={() => setClassTab(id)}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "6px 12px",
                cursor: "pointer",
                background: classTab === id ? "#111827" : "#fff",
                color: classTab === id ? "#fff" : "#374151",
                fontWeight: 600,
              }}
            >
              {id === "lessons" ? "Resources" : id === "classwork" ? "Assessments" : "Analysis"}
            </button>
          ))}
        </div>

        {classTab === "lessons" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Resources (Library only)</div>
              <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0 }}>
                Uploads and direct links are disabled here. Choose items from the library to add to this class.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <Btn variant="primary" onClick={() => { setLibraryOpen(true); loadResourceLibrary(); }}>
                  Open Library
                </Btn>
                <Btn variant="secondary" onClick={refreshQuestionStats}>
                  Refresh
                </Btn>
              </div>
              {resLoading ? (
                <div style={{ color: "#6b7280" }}>Loading…</div>
              ) : resources.filter((r) => getKind(r) === "lesson").length === 0 ? (
                <div style={{ color: "#6b7280" }}>No resources yet.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                  {resources
                    .filter((r) => getKind(r) === "lesson")
                    .map((resource) => (
                      <div key={resource.id || resource.title} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 700 }}>{resource.title || "Resource"}</div>
                          <span style={{ fontSize: 12, color: "#0ea5e9" }}>Resource</span>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                          {resource.url && (
                            <Btn variant="secondary" onClick={() => setPreviewUrl(buildPreviewUrl(resource.url))}>
                              View File
                            </Btn>
                          )}
                          <Btn variant="back" onClick={() => deleteResource(resource)}>
                            Delete
                          </Btn>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {classTab === "classwork" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Build From Question Bank</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <select
                    value={activeBank.id}
                    onChange={(e) => handleAutoAssignChange("bank", e.target.value)}
                    style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                  >
                    {Object.values(BANKS).map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.label || bank.id}
                      </option>
                    ))}
                  </select>
                  {isTestBank ? (
                    <div
                      style={{
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        minWidth: 140,
                        background: "#f9fafb",
                        color: "#374151",
                        fontWeight: 600,
                      }}
                    >
                      Test
                    </div>
                  ) : (
                    <select
                      value={autoAssign.kind}
                      onChange={(e) => handleAutoAssignChange("kind", e.target.value)}
                      style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                    >
                      <option value="classwork">Classwork</option>
                      <option value="homework">Homework</option>
                      <option value="quiz">Quiz</option>
                    </select>
                  )}
                  <SubjectSelect
                    value={activeSubject}
                    disabledLabel={activeBank.subjectLocked ? subjectDisplayLabel : null}
                    onChange={(e) => handleAutoAssignChange("subject", e.target.value)}
                  />
                </div>

                {showMathSelectors && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <select
                      value={autoAssign.unit}
                      onChange={(e) => handleAutoAssignChange("unit", e.target.value)}
                      style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                    >
                      {MATH_UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label.EN || opt.value}
                        </option>
                      ))}
                    </select>
                    <select
                      value={autoAssign.lesson}
                      onChange={(e) => handleAutoAssignChange("lesson", e.target.value)}
                      style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                    >
                      {activeLessons.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label.EN || opt.value}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Questions"
                    value={autoAssign.questionCount}
                    onChange={(e) => handleAutoAssignChange("questionCount", e.target.value)}
                    style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, minWidth: 140 }}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Duration (min)"
                    value={autoAssign.kind === "homework" ? "" : autoAssign.durationMin}
                    onChange={(e) => handleAutoAssignChange("durationMin", e.target.value)}
                    disabled={autoAssign.kind === "homework"}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      minWidth: 160,
                      background: autoAssign.kind === "homework" ? "#f9fafb" : "#ffffff",
                      color: autoAssign.kind === "homework" ? "#9ca3af" : "#111827",
                    }}
                  />
                  {autoAssign.kind === "homework" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <input
                        type="datetime-local"
                        value={autoAssign.deadline}
                        onChange={(e) => handleAutoAssignChange("deadline", e.target.value)}
                        style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, minWidth: 220 }}
                      />
                      <span style={{ color: "#6b7280", fontSize: 12 }}>Students lose edit access after this time.</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <Btn variant="secondary" onClick={handleAutoGenerate} disabled={autoGenerating}>
                    {autoGenerating ? "Building..." : "Build Assignment"}
                  </Btn>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    We will pick random questions from the {activeBank.label?.toLowerCase() || activeBank.id} based on
                    your filters.
                  </span>
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Question Availability</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    Tracking unique questions already assigned in {selectedClassLabel}.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{usedQuestionCount} used</span>
                  <Btn variant="secondary" disabled={catalogBusy} onClick={refreshQuestionStats}>
                    {catalogBusy ? "Loading..." : "Refresh"}
                  </Btn>
                </div>
              </div>
              {catalogError && (
                <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 12 }}>{catalogError}</div>
              )}
              {highlightStats ? (
                <div style={{ marginTop: 10, fontSize: 13, color: "#374151" }}>
                  Current selection:&nbsp;
                  <strong>{findSubjectLabel(highlightStats.subject)}</strong>
                  {highlightStats.unit ? (
                    <>
                      {" · "}
                      <strong>{formatUnitLabel(highlightStats.subject, highlightStats.unit)}</strong>
                    </>
                  ) : null}
                  {highlightStats.lesson ? (
                    <>
                      {" · "}
                      <strong>{formatLessonLabel(highlightStats.subject, highlightStats.unit, highlightStats.lesson)}</strong>
                    </>
                  ) : null}
                  <div style={{ marginTop: 4 }}>
                    <span style={{ color: "#15803d", fontWeight: 600 }}>{highlightStats.remaining}</span>
                    {" "}of {highlightStats.total} remain unused in this class.
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                  Select a unit and lesson to highlight its availability.
                </div>
              )}
              {(!catalogLoaded && catalogBusy) ? (
                <div style={{ marginTop: 12, color: "#6b7280" }}>Loading question counts...</div>
              ) : questionStats.length === 0 ? (
                <div style={{ marginTop: 12, color: "#6b7280" }}>
                  Question stats will appear once the bank loads.
                </div>
              ) : (
                <div style={{ marginTop: 12, overflowX: "auto", overflowY: "auto", maxHeight: 260 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: 8, textAlign: "left" }}>Subject</th>
                        <th style={{ padding: 8, textAlign: "left" }}>Unit</th>
                        <th style={{ padding: 8, textAlign: "left" }}>Lesson</th>
                        <th style={{ padding: 8, textAlign: "left" }}>Total</th>
                        <th style={{ padding: 8, textAlign: "left" }}>Used</th>
                        <th style={{ padding: 8, textAlign: "left" }}>Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questionStats.map((row) => {
                        const highlight = highlightKey && row.key === highlightKey;
                        return (
                          <tr
                            key={row.key}
                            style={{
                              borderBottom: "1px solid #e5e7eb",
                              background: highlight ? "#fefce8" : "transparent",
                            }}
                          >
                            <td style={{ padding: 8 }}>{findSubjectLabel(row.subject)}</td>
                            <td style={{ padding: 8 }}>{formatUnitLabel(row.subject, row.unit)}</td>
                            <td style={{ padding: 8 }}>{formatLessonLabel(row.subject, row.unit, row.lesson)}</td>
                            <td style={{ padding: 8 }}>{row.total}</td>
                            <td style={{ padding: 8 }}>{row.used}</td>
                            <td style={{ padding: 8 }}>{row.remaining}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Resources</div>
              {resLoading ? (
                <div style={{ color: "#6b7280" }}>Loading…</div>
              ) : resources.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No resources yet.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                  {resources
                    .filter((r) => getKind(r) !== "lesson")
                    .map((resource) => {
                    const key = resource.id || `${resource.title}_${resource.url}`;
                    const meta = extractResourceMeta(resource);
                    const questions = decodeResourceQuestions(resource) || [];
                    const practiceMeta = { ...meta };
                    const practiceDuration =
                      typeof practiceMeta.durationSec === "number" && practiceMeta.durationSec > 0
                        ? practiceMeta.durationSec
                        : null;
                    return (
                      <div key={key} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 700 }}>{resource.title || "Untitled Resource"}</div>
                          <span style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{resource.kind || "classwork"}</span>
                        </div>
                        {(resource.unit || resource.lesson) && (
                          <div style={{ color: "#6b7280", fontSize: 12 }}>
                            {[resource.unit, resource.lesson].filter(Boolean).join(" - ")}
                          </div>
                        )}
                        {resource.url && (
                          <div style={{ wordBreak: "break-word", fontSize: 12 }}>
                            <a href={resource.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                              {resource.url}
                            </a>
                          </div>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11 }}>
                          {questions.length > 0 && (
                            <span style={{ ...pillStyles.base, ...pillStyles.info }}>Questions: {questions.length}</span>
                          )}
                          <span style={{ ...pillStyles.base, ...pillStyles.info }}>
                            Time: {formatDuration(practiceMeta?.durationSec)}
                          </span>
                          <span style={{ ...pillStyles.base, ...(practiceMeta?.allowRetake === false ? pillStyles.warn : pillStyles.info) }}>
                            {practiceMeta?.allowRetake === false ? "Single attempt" : "Retakes allowed"}
                          </span>
                          <span style={{ ...pillStyles.base, ...(practiceMeta?.resumeMode === "resume" ? pillStyles.complete : pillStyles.info) }}>
                            {practiceMeta?.resumeMode === "resume" ? "Resume enabled" : "Restart each time"}
                          </span>
                        </div>
                        <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
                          {resource.url && (
                            <Btn variant="secondary" onClick={() => window.open(resource.url, "_blank")}>
                              Open
                            </Btn>
                          )}
                          {questions.length > 0 && (
                            <Btn
                              variant="secondary"
                              onClick={() => {
                                const metaForPreview = { ...practiceMeta };
                                const previewRoute = ["exam", "sat", "diagnostic", "test"].includes(
                                  String(resource.kind || "").toLowerCase()
                                )
                                  ? "sat-exam"
                                  : "sat-assignment";
                                const practicePayload = {
                                  kind: resource.kind,
                                  resourceId: resource.id,
                                  className: selectedClass,
                                  unit: resource.unit || null,
                                  lesson: resource.lesson || null,
                                  meta: metaForPreview,
                                  preview: true,
                                };
                                if (!questions.every((item) => item && item.questionId)) {
                                  practicePayload.custom = {
                                    questions,
                                    title: resource.title,
                                    durationSec: practiceDuration,
                                    meta: metaForPreview,
                                  };
                                }
                                onNavigate(previewRoute, { practice: practicePayload });
                              }}
                            >
                              Preview
                            </Btn>
                          )}
                          <Btn variant="back" onClick={() => deleteResource(resource)}>
                            Delete
                          </Btn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {classTab === "analytics" && (
          <>
            <AdaptiveInsightsCard
              insights={adaptiveInsights}
              findSubjectLabel={findSubjectLabel}
              formatUnitLabel={formatUnitLabel}
              formatLessonLabel={formatLessonLabel}
            />
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 700 }}>Recent Training Results</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                {logsLoading ? "Loading…" : `${classLogs.length} record${classLogs.length === 1 ? "" : "s"}`}
              </div>
            </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <Btn variant="secondary" onClick={refreshClassData} disabled={logsLoading}>
                {logsLoading ? "Refreshing..." : "Refresh"}
              </Btn>
            </div>{classLogs.length === 0 ? (
              <div style={{ color: "#6b7280", marginTop: 6 }}>No activity yet.</div>
            ) : (
              <div style={{ overflowX: "auto", marginTop: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: 10, textAlign: "left" }}>Date</th>
                    <th style={{ padding: 10, textAlign: "left" }}>Time</th>
                    <th style={{ padding: 10, textAlign: "left" }}>Student</th>
                    <th style={{ padding: 10, textAlign: "left" }}>Unit/Lesson</th>
                    <th style={{ padding: 10, textAlign: "left" }}>Lesson Title</th>
                    <th style={{ padding: 10, textAlign: "left" }}>Score</th>
                    <th style={{ padding: 10, textAlign: "left" }}>Manage</th>
                  </tr>
                </thead>
                  <tbody>
                    {classLogs.map((log) => {
                      const rw = log.summary?.rw;
                      const math = log.summary?.math;
                      let score = "-";
                      if (rw?.total || rw?.correct) score = `${rw.correct || 0}/${rw.total || 0}`;
                      if (math?.total || math?.correct) score = `${math.correct || 0}/${math.total || 0}`;
                      return (
                        <tr key={`${log.id || ""}_${log.ts}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: 10 }}>{fmtDate(log.ts)}</td>
                          <td style={{ padding: 10 }}>{fmtDate(log.ts, true)}</td>
                          <td style={{ padding: 10 }}>{log.user_email || "-"}</td>
                          <td style={{ padding: 10 }}>{log.unit || log.lesson || "-"}</td>
                          <td style={{ padding: 10 }}>{log.lesson_title || log.title || "-"}</td>
                          <td style={{ padding: 10 }}>{score}</td>
                          <td style={{ padding: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => openClassLog(log)}
                              style={{ border: "1px solid #d1d5db", background: "#ffffff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteLog(log.id)}
                              style={{ border: "1px solid #dc2626", background: "#fff5f5", color: "#b91c1c", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </>
        )}
          </Card>
        {libraryOpen && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 12,
            }}
            onClick={() => setLibraryOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#fff", borderRadius: 12, padding: 16, width: "min(720px, 95vw)", boxShadow: "0 15px 40px rgba(0,0,0,0.12)", display: "grid", gap: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Resource Library</h3>
                <Btn variant="back" onClick={() => setLibraryOpen(false)}>Close</Btn>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ color: "#6b7280", fontSize: 13 }}>Pick a saved resource to add to this class.</div>
                <Btn variant="secondary" onClick={loadResourceLibrary} disabled={libraryLoading}>
                  {libraryLoading ? "Loading..." : "Reload"}
                </Btn>
              </div>
              {libraryLoading && resourceLibrary.length === 0 ? (
                <div style={{ color: "#6b7280" }}>Loading library...</div>
              ) : resourceLibrary.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No library resources yet.</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                    {resourceLibrary
                      .slice()
                      .sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }))
                      .slice((libraryPage - 1) * 4, (libraryPage - 1) * 4 + 4)
                      .map((item) => (
                        <div key={item.id || item.url} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
                          <div style={{ fontWeight: 700 }}>{item.title || "Resource"}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>{item.kind || "file"}</div>
                          {item.url && (
                            <div style={{ wordBreak: "break-word", fontSize: 12, color: "#2563eb" }}>
                              {item.url}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            <Btn
                              variant="secondary"
                              onClick={async () => {
                                try {
                                  await addLibraryResourceToClass(item);
                                  alert("Added to class resources.");
                                  setLibraryOpen(false);
                                } catch (err) {
                                  alert(err?.message || "Failed to add resource.");
                                }
                              }}
                            >
                              Add to Class
                            </Btn>
                          </div>
                        </div>
                      ))}
                  </div>
                  {Math.ceil(resourceLibrary.length / 4) > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                      <Btn
                        variant="secondary"
                        onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
                        disabled={libraryPage === 1}
                      >
                        Back
                      </Btn>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Page {libraryPage} of {Math.max(1, Math.ceil(resourceLibrary.length / 4))}
                      </div>
                      <Btn
                        variant="secondary"
                        onClick={() => setLibraryPage((p) => Math.min(Math.ceil(resourceLibrary.length / 4), p + 1))}
                        disabled={libraryPage >= Math.ceil(resourceLibrary.length / 4)}
                      >
                        Next
                      </Btn>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        {previewUrl && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 9999,
            }}
            onClick={() => setPreviewUrl("")}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#ffffff", borderRadius: 12, width: "90%", height: "90%", display: "grid", gridTemplateRows: "auto 1fr" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 700 }}>Preview</div>
                <Btn variant="back" onClick={() => setPreviewUrl("")}>Close</Btn>
              </div>
              <iframe
                title="Lesson File"
                src={previewUrl}
                style={{ width: "100%", height: "100%", border: "none", borderRadius: "0 0 12px 12px" }}
              />
            </div>
          </div>
        )}
    </>
  );
}

AdminClassDetail.propTypes = {
  selectedClass: PropTypes.string.isRequired,
  onBackToClasses: PropTypes.func.isRequired,
  classTab: PropTypes.string.isRequired,
  setClassTab: PropTypes.func.isRequired,
  activeBank: PropTypes.object.isRequired,
  isTestBank: PropTypes.bool.isRequired,
  subjectDisplayLabel: PropTypes.string.isRequired,
  activeSubject: PropTypes.string.isRequired,
  autoAssign: PropTypes.object.isRequired,
  handleAutoAssignChange: PropTypes.func.isRequired,
  showMathSelectors: PropTypes.bool.isRequired,
  activeLessons: PropTypes.array.isRequired,
  handleAutoGenerate: PropTypes.func.isRequired,
  autoGenerating: PropTypes.bool.isRequired,
  questionStats: PropTypes.array.isRequired,
  highlightStats: PropTypes.object,
  highlightKey: PropTypes.string,
  selectedClassLabel: PropTypes.string.isRequired,
  usedQuestionCount: PropTypes.number.isRequired,
  catalogBusy: PropTypes.bool.isRequired,
  catalogError: PropTypes.string,
  catalogLoaded: PropTypes.bool.isRequired,
  refreshQuestionStats: PropTypes.func.isRequired,
  findSubjectLabel: PropTypes.func.isRequired,
  formatUnitLabel: PropTypes.func.isRequired,
  formatLessonLabel: PropTypes.func.isRequired,
  resources: PropTypes.array.isRequired,
  resLoading: PropTypes.bool.isRequired,
  resourceLibrary: PropTypes.array.isRequired,
  libraryLoading: PropTypes.bool.isRequired,
  loadResourceLibrary: PropTypes.func.isRequired,
  addLibraryResourceToClass: PropTypes.func.isRequired,
  extractResourceMeta: PropTypes.func.isRequired,
  decodeResourceQuestions: PropTypes.func.isRequired,
  formatDuration: PropTypes.func.isRequired,
  pillStyles: PropTypes.object.isRequired,
  deleteResource: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
  classLogs: PropTypes.array.isRequired,
  logsLoading: PropTypes.bool.isRequired,
  fmtDate: PropTypes.func.isRequired,
  openClassLog: PropTypes.func.isRequired,
  adaptiveInsights: PropTypes.array.isRequired,
  onDeleteLog: PropTypes.func.isRequired,
  refreshClassData: PropTypes.func.isRequired,
};

AdminClassDetail.defaultProps = {
  highlightStats: null,
  highlightKey: null,
  catalogError: "",
};

