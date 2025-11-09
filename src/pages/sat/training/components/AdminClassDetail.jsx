import PropTypes from "prop-types";
import { Card } from "../../../../components/Layout.jsx";
import Btn from "../../../../components/Btn.jsx";
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
}) {
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
          {["classwork", "analytics"].map((id) => (
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
              {id === "classwork" ? "Classwork" : "Analysis"}
            </button>
          ))}
        </div>

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
                  {resources.map((resource) => {
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
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 700 }}>Recent Training Results</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                {logsLoading ? "Loading…" : `${classLogs.length} record${classLogs.length === 1 ? "" : "s"}`}
              </div>
            </div>
            {classLogs.length === 0 ? (
              <div style={{ color: "#6b7280", marginTop: 6 }}>No activity yet.</div>
            ) : (
              <div style={{ overflowX: "auto", marginTop: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: 10, textAlign: "left" }}>Date</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Time</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Student</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Section</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Unit/Lesson</th>
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
                          <td style={{ padding: 10 }}>{log.section || "-"}</td>
                          <td style={{ padding: 10 }}>{log.unit || log.lesson || "-"}</td>
                          <td style={{ padding: 10 }}>{score}</td>
                          <td style={{ padding: 10 }}>
                            <button
                              type="button"
                              onClick={() => openClassLog(log)}
                              style={{ border: "1px solid #d1d5db", background: "#ffffff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                            >
                              View
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
        )}
      </Card>
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
};

AdminClassDetail.defaultProps = {
  highlightStats: null,
  highlightKey: null,
  catalogError: "",
};
