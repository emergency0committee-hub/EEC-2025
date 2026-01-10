import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useTheme } from "../../components/AppProviders.jsx";
import Btn from "../../components/Btn.jsx";
import { normalizeGradebookLabel } from "./gradebookState.js";

const AUTO_GRADED_TYPES = new Set(["multiple_choice", "checkboxes", "rating", "numeric"]);

function BarList({ items, color, trackColor, labelColor, valueColor }) {
  BarList.propTypes = {
    items: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
      })
    ).isRequired,
    color: PropTypes.string.isRequired,
    trackColor: PropTypes.string.isRequired,
    labelColor: PropTypes.string.isRequired,
    valueColor: PropTypes.string.isRequired,
  };

  if (!items.length) {
    return <div style={{ color: valueColor }}>No data.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: labelColor }}>{item.label}</span>
            <span style={{ color: valueColor }}>
              {Number.isFinite(item.value) ? `${Math.round(item.value)}%` : "--"}
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: trackColor, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, Number.isFinite(item.value) ? item.value : 0))}%`,
                height: "100%",
                borderRadius: 999,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeedbackAssessmentWorkspace({ formState }) {
  FeedbackAssessmentWorkspace.propTypes = {
    formState: PropTypes.shape({
      gradebook: PropTypes.object.isRequired,
      saveSubmissionScores: PropTypes.func.isRequired,
    }).isRequired,
  };

  const { gradebook, saveSubmissionScores } = formState;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeFormId, setActiveFormId] = useState(gradebook.assessments[0]?.id || "");

  useEffect(() => {
    if (!gradebook.assessments.length) {
      if (activeFormId) setActiveFormId("");
      return;
    }
    if (!activeFormId || !gradebook.assessments.some((assessment) => assessment.id === activeFormId)) {
      setActiveFormId(gradebook.assessments[0].id);
    }
  }, [gradebook.assessments, activeFormId]);

  const activeForm = useMemo(
    () => gradebook.assessments.find((assessment) => assessment.id === activeFormId) || null,
    [gradebook.assessments, activeFormId]
  );

  const responses = gradebook.scores?.[activeFormId] || {};
  const answersByForm = gradebook.answers?.[activeFormId] || {};
  const responseMeta = gradebook.responseMeta?.[activeFormId] || {};
  const responseKeys = Object.keys(responseMeta || {}).length
    ? Object.keys(responseMeta || {})
    : Object.keys(responses || {});
  const responseIds = Object.keys(responses || {});
  const responseCount = responseKeys.length;
  const questions = activeForm?.questions || [];
  const manualQuestions = questions.filter((question) => !AUTO_GRADED_TYPES.has(question.type));

  const [activeResponseKey, setActiveResponseKey] = useState(responseKeys[0] || "");
  const [gradeDraft, setGradeDraft] = useState({});
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeMessage, setGradeMessage] = useState("");
  const [gradeError, setGradeError] = useState("");

  useEffect(() => {
    if (!responseKeys.length) {
      if (activeResponseKey) setActiveResponseKey("");
      return;
    }
    if (!activeResponseKey || !responseKeys.includes(activeResponseKey)) {
      setActiveResponseKey(responseKeys[0]);
    }
  }, [responseKeys, activeResponseKey]);

  useEffect(() => {
    if (!activeResponseKey) {
      setGradeDraft({});
      return;
    }
    const base = responses?.[activeResponseKey] || {};
    setGradeDraft(base);
    setGradeMessage("");
    setGradeError("");
  }, [activeResponseKey, responses]);

  const questionSummaries = useMemo(() => {
    return questions.map((question) => {
      const values = responseIds
        .map((id) => {
          const raw = responses?.[id]?.[question.id];
          if (raw === null || raw === undefined || raw === "") return null;
          const numeric = Number(raw);
          return Number.isFinite(numeric) ? numeric : null;
        })
        .filter((value) => value !== null);
      const maxPoints = Math.max(0, Number(question.maxPoints) || 0);
      const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const percent = maxPoints > 0 ? (avg / maxPoints) * 100 : 0;
      return {
        id: question.id,
        prompt: question.prompt || question.label || question.id,
        skill: normalizeGradebookLabel(question.skill) || "Unassigned",
        maxPoints,
        avg,
        min,
        max,
        percent,
        count: values.length,
      };
    });
  }, [questions, responseIds, responses]);

  const showDemo = Boolean(activeForm && responseCount === 0 && questions.length > 0);
  const demoQuestionSummaries = useMemo(() => {
    if (!showDemo) return [];
    return questions.map((question, idx) => {
      const maxPoints = Math.max(1, Number(question.maxPoints) || 5);
      const percent = 55 + ((idx * 9) % 40);
      const avg = (percent / 100) * maxPoints;
      const spread = Math.max(0.5, maxPoints * 0.25);
      const min = Math.max(0, avg - spread);
      const max = Math.min(maxPoints, avg + spread);
      return {
        id: question.id,
        prompt: question.prompt || question.label || question.id,
        skill: normalizeGradebookLabel(question.skill) || "Unassigned",
        maxPoints,
        avg,
        min,
        max,
        percent,
        count: 12 + (idx % 4) * 3,
      };
    });
  }, [questions, showDemo]);

  const displayQuestionSummaries = showDemo ? demoQuestionSummaries : questionSummaries;
  const displayResponseCount = showDemo ? Math.max(12, questions.length * 4) : responseCount;

  const skillSummary = useMemo(() => {
    const groups = {};
    displayQuestionSummaries.forEach((summary) => {
      const key = summary.skill || "Unassigned";
      if (!groups[key]) {
        groups[key] = { total: 0, count: 0 };
      }
      if (summary.count > 0 && Number.isFinite(summary.percent)) {
        groups[key].total += summary.percent;
        groups[key].count += 1;
      }
    });
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((label) => ({
        label,
        value: groups[label].count ? groups[label].total / groups[label].count : 0,
      }));
  }, [displayQuestionSummaries]);

  const summaryByQuestion = useMemo(() => {
    const map = new Map();
    displayQuestionSummaries.forEach((summary) => {
      map.set(summary.id, summary);
    });
    return map;
  }, [displayQuestionSummaries]);

  const heatmapSkills = useMemo(() => {
    const set = new Set();
    displayQuestionSummaries.forEach((summary) => set.add(summary.skill || "Unassigned"));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [displayQuestionSummaries]);

  const heatmapMinWidth = useMemo(() => {
    const columns = Math.max(1, questions.length);
    return 160 + columns * 72;
  }, [questions.length]);

  const getHeatColor = (value) => {
    const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    const hue = 8 + pct * 1.1;
    const lightness = isDark ? 35 : 70;
    return `hsl(${hue}, 75%, ${lightness}%)`;
  };

  const percentile = (sorted, p) => {
    if (!sorted.length) return 0;
    const idx = (sorted.length - 1) * p;
    const base = Math.floor(idx);
    const rest = idx - base;
    if (sorted[base + 1] === undefined) return sorted[base];
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  };

  const skillDistributions = useMemo(() => {
    return heatmapSkills.map((skill) => {
      const values = displayQuestionSummaries
        .filter((summary) => summary.skill === skill)
        .map((summary) => summary.percent)
        .filter((value) => Number.isFinite(value));
      const sorted = values.slice().sort((a, b) => a - b);
      const min = sorted.length ? sorted[0] : 0;
      const max = sorted.length ? sorted[sorted.length - 1] : 0;
      const q1 = percentile(sorted, 0.25);
      const median = percentile(sorted, 0.5);
      const q3 = percentile(sorted, 0.75);
      return { skill, min, max, q1, median, q3, count: sorted.length };
    });
  }, [displayQuestionSummaries, heatmapSkills]);

  const formatStudentLabel = (value, idx) => {
    if (showDemo) return `Student ${idx + 1}`;
    const meta = responseMeta[value] || {};
    const preferred = meta.name || meta.email;
    if (preferred) {
      if (preferred.includes("@")) return preferred.split("@")[0];
      if (preferred.length <= 16) return preferred;
      return `${preferred.slice(0, 14)}...`;
    }
    const raw = String(value || "");
    if (raw.includes("@")) return raw.split("@")[0];
    if (raw.length <= 12) return raw;
    return `${raw.slice(0, 10)}...`;
  };

  const formatAnswerValue = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "--";
    }
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const parseScoreValue = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const handleGradeChange = (questionId, maxPoints, value) => {
    const raw = value === "" ? "" : Number(value);
    const numeric = value === "" || !Number.isFinite(raw) ? "" : raw;
    const clamped = numeric === "" ? "" : Math.max(0, Math.min(numeric, maxPoints));
    setGradeDraft((prev) => ({ ...prev, [questionId]: clamped }));
  };

  const handleSaveGrades = async () => {
    if (!activeFormId || !activeResponseKey) return;
    setGradeSaving(true);
    setGradeMessage("");
    setGradeError("");
    const baseScores = responses?.[activeResponseKey] || {};
    const nextScores = { ...baseScores };
    manualQuestions.forEach((question) => {
      const maxPoints = Math.max(1, Number(question.maxPoints) || 1);
      const raw = gradeDraft?.[question.id];
      if (raw === "" || raw === null || raw === undefined) {
        nextScores[question.id] = null;
        return;
      }
      const numeric = Number(raw);
      nextScores[question.id] = Number.isFinite(numeric)
        ? Math.max(0, Math.min(numeric, maxPoints))
        : null;
    });
    const result = await saveSubmissionScores(activeFormId, activeResponseKey, nextScores);
    if (!result.ok) {
      setGradeError(result.error || "Failed to save grades.");
    } else {
      setGradeMessage("Grades saved.");
    }
    setGradeSaving(false);
  };

  const studentSummaries = useMemo(() => {
    if (showDemo) {
      const total = Math.max(1, questions.length || 8);
      const count = Math.min(5, Math.max(3, total));
      return Array.from({ length: count }, (_, idx) => {
        const base = Math.max(0.45, 0.72 - idx * 0.08);
        const correct = Math.max(0, Math.round(total * base));
        const partial = Math.max(0, Math.round(total * 0.14));
        const incorrect = Math.max(0, total - correct - partial);
        return {
          id: `demo-${idx + 1}`,
          label: `Student ${idx + 1}`,
          correct,
          partial,
          incorrect,
          total,
        };
      });
    }

    return responseIds.map((id, idx) => {
      let correct = 0;
      let partial = 0;
      let incorrect = 0;
      questions.forEach((question) => {
        const maxPoints = Math.max(1, Number(question.maxPoints) || 1);
        const raw = responses?.[id]?.[question.id];
        if (raw === null || raw === undefined || raw === "") {
          return;
        }
        const score = Number(raw);
        if (!Number.isFinite(score) || score <= 0) {
          incorrect += 1;
        } else if (score >= maxPoints) {
          correct += 1;
        } else {
          partial += 1;
        }
      });
      const total = Math.max(1, correct + partial + incorrect);
      return {
        id,
        label: formatStudentLabel(id, idx),
        correct,
        partial,
        incorrect,
        total,
      };
    });
  }, [responseIds, responses, questions, showDemo]);

  const activeResponseScores = activeResponseKey ? responses?.[activeResponseKey] || {} : {};
  const activeResponseAnswers = activeResponseKey ? answersByForm?.[activeResponseKey] || {} : {};
  const activeResponseMeta = activeResponseKey ? responseMeta?.[activeResponseKey] || {} : {};
  const manualPendingCount = manualQuestions.filter((question) => {
    const numeric = parseScoreValue(activeResponseScores?.[question.id]);
    return numeric === null;
  }).length;

  const borderColor = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(255, 255, 255, 0.55)";
  const panelBg = isDark ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.65)";
  const textPrimary = isDark ? "#e2e8f0" : "#111827";
  const textMuted = isDark ? "#94a3b8" : "#6b7280";
  const trackColor = isDark ? "rgba(148, 163, 184, 0.3)" : "rgba(209, 213, 219, 0.6)";
  const cellEmptyBg = isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.12)";
  const correctColor = "#22c55e";
  const partialColor = "#f59e0b";
  const incorrectColor = "#ef4444";

  const panelStyle = {
    border: `1px solid ${borderColor}`,
    borderRadius: 16,
    padding: 16,
    background: panelBg,
    backdropFilter: "blur(6px) saturate(120%)",
    WebkitBackdropFilter: "blur(6px) saturate(120%)",
  };
  const gradeInputStyle = {
    width: 120,
    padding: "8px 10px",
    borderRadius: 10,
    border: `1px solid ${borderColor}`,
    background: panelBg,
    color: textPrimary,
    fontSize: 13,
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, color: textPrimary }}>Form Response Analysis</h3>
          <p style={{ margin: "6px 0 0", color: textMuted }}>
            Summary of responses with skill-based insights.
          </p>
        </div>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, color: textMuted }}>Form</span>
          <select
            value={activeFormId}
            onChange={(e) => setActiveFormId(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${borderColor}`,
              fontSize: 14,
              minWidth: 240,
              background: panelBg,
              color: textPrimary,
            }}
          >
            <option value="">Select a form</option>
            {gradebook.assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!activeForm ? (
        <section style={panelStyle}>
          <div style={{ color: textMuted }}>Create a form in Instructional Materials to start collecting responses.</div>
        </section>
      ) : (
        <>
          <section style={panelStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: textMuted }}>Total responses</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary }}>{displayResponseCount}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: textMuted }}>Questions</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary }}>{questions.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: textMuted }}>Skill tags</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary }}>{skillSummary.length}</div>
              </div>
            </div>
            {showDemo && (
              <div style={{ marginTop: 10, fontSize: 12, color: textMuted }}>
                Showing demo analysis until responses arrive.
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: textPrimary }}>Skill Summary</div>
            <BarList
              items={skillSummary}
              color={isDark ? "#60a5fa" : "#2563eb"}
              trackColor={trackColor}
              labelColor={textPrimary}
              valueColor={textMuted}
            />
          </section>

          <section style={{ ...panelStyle, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700, color: textPrimary }}>Skill x Question Heatmap</div>
            <div style={{ fontSize: 12, color: textMuted }}>
              Each cell shows the average score percentage for that question within a skill.
            </div>
            {questions.length === 0 ? (
              <div style={{ color: textMuted }}>Add questions to see the heatmap.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: heatmapMinWidth }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `160px repeat(${questions.length}, minmax(60px, 1fr))`,
                      gap: 6,
                      alignItems: "center",
                      fontSize: 12,
                      color: textMuted,
                    }}
                  >
                    <div />
                    {questions.map((question, idx) => (
                      <div key={question.id} style={{ textAlign: "center", fontWeight: 600 }}>
                        Q{idx + 1}
                      </div>
                    ))}
                    {heatmapSkills.map((skill) => (
                      <React.Fragment key={skill}>
                        <div style={{ fontWeight: 600, color: textPrimary }}>{skill}</div>
                        {questions.map((question, idx) => {
                          const summary = summaryByQuestion.get(question.id);
                          const matchesSkill = summary && summary.skill === skill;
                          const value = matchesSkill ? summary.percent : null;
                          const background = matchesSkill ? getHeatColor(value) : cellEmptyBg;
                          return (
                            <div
                              key={`${skill}-${question.id}-${idx}`}
                              title={
                                matchesSkill
                                  ? `${summary.prompt}: ${Math.round(value)}%`
                                  : `${skill}: no question`
                              }
                              style={{
                                height: 44,
                                borderRadius: 10,
                                background,
                                display: "grid",
                                placeItems: "center",
                                color: isDark ? "#f8fafc" : "#0f172a",
                                fontWeight: 600,
                              }}
                            >
                              {matchesSkill ? `${Math.round(value)}%` : "--"}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section style={{ ...panelStyle, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700, color: textPrimary }}>Skill Distribution</div>
            <div style={{ fontSize: 12, color: textMuted }}>
              Min/median/max across questions tagged to each skill.
            </div>
            {skillDistributions.length === 0 ? (
              <div style={{ color: textMuted }}>No skills available.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {skillDistributions.map((row) => (
                  <div key={row.skill} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
                    <div style={{ fontSize: 13, color: textPrimary, fontWeight: 600 }}>{row.skill}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ position: "relative", height: 10, background: trackColor, borderRadius: 999 }}>
                        <div
                          style={{
                            position: "absolute",
                            left: `${row.q1}%`,
                            width: `${Math.max(2, row.q3 - row.q1)}%`,
                            height: "100%",
                            borderRadius: 999,
                            background: isDark ? "#60a5fa" : "#2563eb",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            left: `${row.median}%`,
                            top: -4,
                            width: 2,
                            height: 18,
                            background: textPrimary,
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: textMuted }}>
                        <span>{Math.round(row.min)}%</span>
                        <span>Median {Math.round(row.median)}%</span>
                        <span>{Math.round(row.max)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ ...panelStyle, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700, color: textPrimary }}>Student Progress</div>
            <div style={{ fontSize: 12, color: textMuted }}>
              Correct, partial, and incorrect distribution per student.
            </div>
            {questions.length === 0 ? (
              <div style={{ color: textMuted }}>Add questions to see student progress.</div>
            ) : studentSummaries.length === 0 ? (
              <div style={{ color: textMuted }}>No student responses yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {studentSummaries.map((row, idx) => {
                  const correctPct = (row.correct / row.total) * 100;
                  const partialPct = (row.partial / row.total) * 100;
                  const incorrectPct = Math.max(0, 100 - correctPct - partialPct);
                  return (
                    <div
                      key={row.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "160px 1fr 90px",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 13, color: textPrimary, fontWeight: 600 }}>
                        {row.label || formatStudentLabel(row.id, idx)}
                      </div>
                      <div style={{ height: 10, borderRadius: 999, overflow: "hidden", background: trackColor, display: "flex" }}>
                        <div style={{ width: `${correctPct}%`, background: correctColor }} />
                        <div style={{ width: `${partialPct}%`, background: partialColor }} />
                        <div style={{ width: `${incorrectPct}%`, background: incorrectColor }} />
                      </div>
                      <div style={{ fontSize: 12, color: textMuted }}>
                        {row.correct}/{row.total}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
          </section>

          <section style={{ ...panelStyle, display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 700, color: textPrimary }}>Submission Review & Manual Grading</div>
            {showDemo ? (
              <div style={{ color: textMuted }}>Manual grading will appear once student responses are submitted.</div>
            ) : responseKeys.length === 0 ? (
              <div style={{ color: textMuted }}>No student submissions yet.</div>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: textMuted }}>Student submission</span>
                    <select
                      value={activeResponseKey}
                      onChange={(event) => setActiveResponseKey(event.target.value)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${borderColor}`,
                        minWidth: 240,
                        background: panelBg,
                        color: textPrimary,
                      }}
                    >
                      {responseKeys.map((key, idx) => (
                        <option key={key} value={key}>
                          {formatStudentLabel(key, idx)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: "grid", gap: 4, fontSize: 12, color: textMuted }}>
                    <div>{activeResponseMeta.email || "No email provided"}</div>
                    <div>{activeResponseMeta.school || "No school info"}</div>
                    <div>{activeResponseMeta.className || "No class info"}</div>
                  </div>
                  {manualQuestions.length > 0 ? (
                    <div style={{ fontSize: 12, color: textMuted }}>
                      Pending manual grades: {manualPendingCount}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {questions.map((question, idx) => {
                    const maxPoints = Math.max(1, Number(question.maxPoints) || 1);
                    const isAuto = AUTO_GRADED_TYPES.has(question.type);
                    const scoreValue = gradeDraft?.[question.id];
                    const numericScore = parseScoreValue(scoreValue);
                    const displayScore = numericScore === null ? "--" : numericScore.toFixed(1);
                    const answerValue = formatAnswerValue(activeResponseAnswers?.[question.id]);
                    return (
                      <div
                        key={question.id}
                        style={{
                          border: `1px solid ${borderColor}`,
                          borderRadius: 12,
                          padding: 12,
                          background: isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(255, 255, 255, 0.5)",
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: textPrimary }}>{`Q${idx + 1}. ${question.prompt || question.label || "Question"}`}</div>
                        <div style={{ fontSize: 12, color: textMuted }}>
                          Answer: <span style={{ color: textPrimary }}>{answerValue}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                          <div style={{ fontSize: 12, color: textMuted }}>
                            Max points: {maxPoints}
                          </div>
                          {isAuto ? (
                            <div style={{ fontSize: 12, color: textMuted }}>
                              Auto score: <span style={{ color: textPrimary }}>{displayScore}</span>
                            </div>
                          ) : (
                            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, color: textMuted }}>Manual score</span>
                              <input
                                type="number"
                                min="0"
                                max={maxPoints}
                                step="0.5"
                                value={scoreValue ?? ""}
                                onChange={(event) => handleGradeChange(question.id, maxPoints, event.target.value)}
                                style={gradeInputStyle}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  {gradeError && <div style={{ color: "#fca5a5", fontSize: 12 }}>{gradeError}</div>}
                  {gradeMessage && <div style={{ color: "#86efac", fontSize: 12 }}>{gradeMessage}</div>}
                  <Btn
                    variant="primary"
                    onClick={handleSaveGrades}
                    disabled={!manualQuestions.length || gradeSaving || !activeResponseKey}
                  >
                    {gradeSaving ? "Saving..." : "Save grades"}
                  </Btn>
                </div>
              </>
            )}
          </section>

          <section style={{ ...panelStyle, display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 700, color: textPrimary }}>Question Summaries</div>
            {questions.length === 0 ? (
              <div style={{ color: textMuted }}>Add questions in Instructional Materials to see analysis.</div>
            ) : !showDemo && responseCount === 0 ? (
              <div style={{ color: textMuted }}>No responses yet.</div>
            ) : (
              displayQuestionSummaries.map((summary, idx) => (
                <div
                  key={summary.id}
                  style={{
                    border: `1px solid ${borderColor}`,
                    borderRadius: 12,
                    padding: 12,
                    background: isDark ? "rgba(15, 23, 42, 0.35)" : "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  <div style={{ fontWeight: 600, color: textPrimary }}>{`Q${idx + 1}. ${summary.prompt}`}</div>
                  <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
                    Skill: {summary.skill} {summary.maxPoints ? `| Max ${summary.maxPoints}` : ""}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: textMuted }}>Average</div>
                      <div style={{ fontWeight: 700, color: textPrimary }}>{summary.avg.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: textMuted }}>Min</div>
                      <div style={{ fontWeight: 700, color: textPrimary }}>{summary.min.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: textMuted }}>Max</div>
                      <div style={{ fontWeight: 700, color: textPrimary }}>{summary.max.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: textMuted }}>Responses</div>
                      <div style={{ fontWeight: 700, color: textPrimary }}>{summary.count}</div>
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: trackColor, overflow: "hidden", marginTop: 10 }}>
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, summary.percent))}%`,
                        height: "100%",
                        background: isDark ? "#34d399" : "#10b981",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>
                    {Math.round(summary.percent)}% average of max points
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
