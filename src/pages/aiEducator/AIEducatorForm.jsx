import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { useTheme } from "../../components/AppProviders.jsx";
import { supabase } from "../../lib/supabase.js";

const FORMS_TABLE = "cg_ai_forms";
const QUESTIONS_TABLE = "cg_ai_form_questions";
const SUBMISSIONS_TABLE = "cg_ai_form_submissions";

const getFormIdFromQuery = () => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("form")?.trim() || "";
};

const getCachedProfile = () => {
  try {
    const raw = localStorage.getItem("cg_current_user_v1");
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
};

const normalizeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export default function AIEducatorForm({ onNavigate }) {
  AIEducatorForm.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [formId, setFormId] = useState(getFormIdFromQuery);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [studentInfo, setStudentInfo] = useState({
    fullName: "",
    school: "",
    className: "",
    phone: "",
  });
  const [infoLocked, setInfoLocked] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [missingInfoFields, setMissingInfoFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [missingRequired, setMissingRequired] = useState([]);
  const infoPrefilledRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => authSub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (infoPrefilledRef.current) return;
    const profile = getCachedProfile();
    const nameCandidate = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
    const fullName = profile.full_name || profile.name || nameCandidate || "";
    const school = profile.school || profile.school_name || "";
    const className = profile.class_name || profile.className || "";
    const phone = profile.phone || "";
    setStudentInfo((prev) => ({
      ...prev,
      fullName: prev.fullName || fullName,
      school: prev.school || school,
      className: prev.className || className,
      phone: prev.phone || phone,
    }));
    infoPrefilledRef.current = true;
  }, [user]);

  useEffect(() => {
    setFormId(getFormIdFromQuery());
  }, []);

  useEffect(() => {
    if (!formId) {
      setLoading(false);
      setLoadError("Missing form link.");
      return;
    }
    let active = true;

    const loadForm = async () => {
      setLoading(true);
      setLoadError("");
      const { data: formRow, error: formError } = await supabase
        .from(FORMS_TABLE)
        .select("id,title,description,category")
        .eq("id", formId)
        .single();
      if (!active) return;
      if (formError || !formRow) {
        setLoading(false);
        setLoadError(formError?.message || "Unable to load this form.");
        return;
      }

      const { data: questionRows, error: questionError } = await supabase
        .from(QUESTIONS_TABLE)
        .select("id,label,prompt,question_type,options,correct_options,skill,max_points,required,sort_index")
        .eq("form_id", formRow.id)
        .order("sort_index", { ascending: true });
      if (!active) return;
      if (questionError) {
        setLoading(false);
        setLoadError(questionError.message || "Unable to load questions.");
        return;
      }

      setForm(formRow);
      setQuestions(questionRows || []);
      setLoading(false);
    };

    loadForm();
    return () => {
      active = false;
    };
  }, [formId]);

  const borderColor = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(255, 255, 255, 0.55)";
  const panelBg = isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.6)";
  const cardBg = isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.5)";
  const textPrimary = isDark ? "#e2e8f0" : "#111827";
  const textMuted = isDark ? "#94a3b8" : "#6b7280";
  const inputBg = isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.7)";
  const inputBorder = isDark ? "rgba(148, 163, 184, 0.45)" : "rgba(209, 213, 219, 0.8)";
  const accent = isDark ? "#93c5fd" : "#2563eb";

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${inputBorder}`,
    fontSize: 14,
    boxSizing: "border-box",
    fontFamily: "inherit",
    background: inputBg,
    color: textPrimary,
  };

  const cardStyle = {
    border: `1px solid ${borderColor}`,
    borderRadius: 16,
    background: cardBg,
    padding: 16,
    display: "grid",
    gap: 12,
    backdropFilter: "blur(6px) saturate(120%)",
    WebkitBackdropFilter: "blur(6px) saturate(120%)",
  };

  const updateAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const updateStudentInfo = (patch) => {
    setStudentInfo((prev) => ({ ...prev, ...patch }));
  };

  const toggleCheckbox = (questionId, option) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const set = new Set(current);
      if (set.has(option)) {
        set.delete(option);
      } else {
        set.add(option);
      }
      return { ...prev, [questionId]: Array.from(set) };
    });
  };

  const isAnswered = (question) => {
    const answer = answers[question.id];
    if (question.question_type === "checkboxes") {
      return Array.isArray(answer) && answer.length > 0;
    }
    if (typeof answer === "number") return Number.isFinite(answer);
    return String(answer ?? "").trim().length > 0;
  };

  const scoreQuestion = (question, answer) => {
    const maxPoints = Math.max(1, normalizeNumber(question.max_points) || 1);
    const type = question.question_type || "short";
    const correct = Array.isArray(question.correct_options) ? question.correct_options : [];

    if (type === "multiple_choice") {
      if (!answer) return 0;
      return correct.includes(answer) ? maxPoints : 0;
    }
    if (type === "checkboxes") {
      if (!Array.isArray(answer) || answer.length === 0) return 0;
      if (!correct.length) return 0;
      const selected = new Set(answer);
      const matches = correct.filter((option) => selected.has(option)).length;
      const wrong = answer.filter((option) => !correct.includes(option)).length;
      if (wrong > 0) return 0;
      const ratio = matches / correct.length;
      return Math.round(ratio * maxPoints * 100) / 100;
    }
    if (type === "rating" || type === "numeric") {
      const numeric = normalizeNumber(answer);
      if (numeric === null) return null;
      return Math.max(0, Math.min(numeric, maxPoints));
    }
    return null;
  };

  const sharePrompt = useMemo(() => {
    if (!form) return "";
    return form.title ? `Submitting: ${form.title}` : "Submitting response";
  }, [form]);

  const validateStudentInfo = () => {
    const missing = [];
    if (!studentInfo.fullName.trim()) missing.push("fullName");
    if (!studentInfo.school.trim()) missing.push("school");
    if (!studentInfo.className.trim()) missing.push("className");
    return missing;
  };

  const handleStartForm = () => {
    setInfoError("");
    const missing = validateStudentInfo();
    if (missing.length) {
      setMissingInfoFields(missing);
      setInfoError("Please complete the required student information.");
      return;
    }
    setMissingInfoFields([]);
    setInfoLocked(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      setSubmitError("Please sign in to submit this form.");
      return;
    }
    const missingInfo = validateStudentInfo();
    if (missingInfo.length) {
      setMissingInfoFields(missingInfo);
      setInfoLocked(false);
      setInfoError("Please complete the required student information.");
      setSubmitError("Add your student information before submitting.");
      return;
    }
    setSubmitError("");
    setSubmitStatus("");

    const missing = questions.filter((question) => question.required && !isAnswered(question)).map((question) => question.id);
    if (missing.length) {
      setMissingRequired(missing);
      setSubmitError("Please answer all required questions.");
      return;
    }
    setMissingRequired([]);

    const scores = {};
    let totalScore = 0;
    let maxScore = 0;
    questions.forEach((question) => {
      const answer = answers[question.id];
      const score = scoreQuestion(question, answer);
      scores[question.id] = score;
      if (Number.isFinite(score)) {
        const maxPoints = Math.max(1, normalizeNumber(question.max_points) || 1);
        totalScore += score;
        maxScore += maxPoints;
      }
    });

    const profile = getCachedProfile();
    const respondentName =
      studentInfo.fullName ||
      profile.username ||
      "";

    setSubmitBusy(true);
    const { error } = await supabase.from(SUBMISSIONS_TABLE).upsert(
      {
        form_id: formId,
        respondent_id: user.id,
        respondent_email: user.email || null,
        respondent_name: respondentName || null,
        respondent_school: studentInfo.school || null,
        respondent_class: studentInfo.className || null,
        respondent_phone: studentInfo.phone || null,
        answers,
        scores,
        total_score: totalScore,
        max_score: maxScore,
      },
      { onConflict: "form_id,respondent_id" }
    );
    setSubmitBusy(false);

    if (error) {
      setSubmitError(error.message || "Unable to submit response.");
      return;
    }
    setSubmitStatus("Response saved. Thank you.");
  };

  return (
    <PageWrap>
      <HeaderBar
        title="Student Form"
        right={(
          <Btn variant="secondary" to="home" onClick={(e) => onNavigate("home", null, e)}>
            Back Home
          </Btn>
        )}
      />
      <Card>
        <div style={{ display: "grid", gap: 16 }}>
          {loading ? (
            <div style={{ color: textMuted }}>Loading form...</div>
          ) : loadError ? (
            <div style={{ color: "#fca5a5" }}>{loadError}</div>
          ) : !user ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ color: textMuted }}>Please sign in to access this form.</div>
              <Btn variant="primary" onClick={(event) => onNavigate("login", null, event)}>
                Sign In
              </Btn>
            </div>
          ) : (
            <>
              <section
                style={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: 16,
                  background: panelBg,
                  padding: 16,
                  display: "grid",
                  gap: 8,
                  backdropFilter: "blur(10px) saturate(140%)",
                  WebkitBackdropFilter: "blur(10px) saturate(140%)",
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color: textPrimary }}>
                  {form?.title || "Untitled form"}
                </div>
                {form?.description ? (
                  <div style={{ color: textMuted }}>{form.description}</div>
                ) : null}
                {form?.category ? (
                  <div style={{ fontSize: 12, color: textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
                    {form.category}
                  </div>
                ) : null}
              </section>

              <section style={{ ...cardStyle, borderColor }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: textPrimary }}>Student information</div>
                    <div style={{ fontSize: 12, color: textMuted }}>
                      Complete this before starting the form.
                    </div>
                  </div>
                  {infoLocked ? (
                    <Btn
                      variant="secondary"
                      onClick={() => {
                        setInfoLocked(false);
                        setInfoError("");
                        setMissingInfoFields([]);
                      }}
                    >
                      Edit info
                    </Btn>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: textMuted }}>Full name *</span>
                    <input
                      type="text"
                      value={studentInfo.fullName}
                      onChange={(event) => updateStudentInfo({ fullName: event.target.value })}
                      style={{
                        ...inputStyle,
                        borderColor: missingInfoFields.includes("fullName") ? "#fca5a5" : inputBorder,
                      }}
                      disabled={infoLocked}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: textMuted }}>School *</span>
                    <input
                      type="text"
                      value={studentInfo.school}
                      onChange={(event) => updateStudentInfo({ school: event.target.value })}
                      style={{
                        ...inputStyle,
                        borderColor: missingInfoFields.includes("school") ? "#fca5a5" : inputBorder,
                      }}
                      disabled={infoLocked}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: textMuted }}>Class / Grade *</span>
                    <input
                      type="text"
                      value={studentInfo.className}
                      onChange={(event) => updateStudentInfo({ className: event.target.value })}
                      style={{
                        ...inputStyle,
                        borderColor: missingInfoFields.includes("className") ? "#fca5a5" : inputBorder,
                      }}
                      disabled={infoLocked}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: textMuted }}>Phone (optional)</span>
                    <input
                      type="tel"
                      value={studentInfo.phone}
                      onChange={(event) => updateStudentInfo({ phone: event.target.value })}
                      style={inputStyle}
                      disabled={infoLocked}
                    />
                  </label>
                </div>
                {infoError ? <div style={{ color: "#fca5a5", fontSize: 12 }}>{infoError}</div> : null}
                {!infoLocked ? (
                  <Btn variant="primary" onClick={handleStartForm}>
                    Start form
                  </Btn>
                ) : null}
              </section>

              {infoLocked ? (
                <>
                  <div style={{ display: "grid", gap: 12 }}>
                    {questions.map((question, idx) => {
                      const type = question.question_type || "short";
                      const options = Array.isArray(question.options) ? question.options : [];
                      const answer = answers[question.id];
                      const required = Boolean(question.required);
                      const isMissing = missingRequired.includes(question.id);
                      return (
                        <div key={question.id} style={{ ...cardStyle, borderColor: isMissing ? "#fca5a5" : borderColor }}>
                          <div style={{ fontWeight: 600, color: textPrimary }}>
                            {`Q${idx + 1}. ${question.prompt || question.label || "Question"}`}
                            {required ? <span style={{ color: "#f97316" }}> *</span> : null}
                          </div>
                          {question.skill ? (
                            <div style={{ fontSize: 12, color: textMuted }}>Skill: {question.skill}</div>
                          ) : null}

                          {type === "short" && (
                            <input
                              type="text"
                              value={answer || ""}
                              onChange={(event) => updateAnswer(question.id, event.target.value)}
                              placeholder="Your answer"
                              style={inputStyle}
                            />
                          )}
                          {type === "paragraph" && (
                            <textarea
                              value={answer || ""}
                              onChange={(event) => updateAnswer(question.id, event.target.value)}
                              placeholder="Your response"
                              rows={4}
                              style={inputStyle}
                            />
                          )}
                          {type === "numeric" && (
                            <input
                              type="number"
                              value={answer ?? ""}
                              onChange={(event) => updateAnswer(question.id, event.target.value)}
                              placeholder="Enter a number"
                              style={inputStyle}
                            />
                          )}
                          {type === "rating" && (
                            <select
                              value={answer ?? ""}
                              onChange={(event) => updateAnswer(question.id, event.target.value)}
                              style={inputStyle}
                            >
                              <option value="">Select a rating</option>
                              {Array.from({ length: Math.max(1, normalizeNumber(question.max_points) || 5) }, (_, i) => (
                                <option key={`${question.id}-rating-${i + 1}`} value={i + 1}>
                                  {i + 1}
                                </option>
                              ))}
                            </select>
                          )}
                          {type === "multiple_choice" && (
                            <div style={{ display: "grid", gap: 6 }}>
                              {options.map((option) => (
                                <label key={`${question.id}-${option}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  <input
                                    type="radio"
                                    name={`mc-${question.id}`}
                                    checked={answer === option}
                                    onChange={() => updateAnswer(question.id, option)}
                                  />
                                  <span style={{ color: textPrimary }}>{option}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {type === "checkboxes" && (
                            <div style={{ display: "grid", gap: 6 }}>
                              {options.map((option) => {
                                const selected = Array.isArray(answer) ? answer.includes(option) : false;
                                return (
                                  <label key={`${question.id}-${option}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => toggleCheckbox(question.id, option)}
                                    />
                                    <span style={{ color: textPrimary }}>{option}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "grid", gap: 4, color: textMuted }}>
                      {submitError && <div style={{ color: "#fca5a5" }}>{submitError}</div>}
                      {submitStatus && <div style={{ color: "#86efac" }}>{submitStatus}</div>}
                      {sharePrompt && <div style={{ fontSize: 12 }}>{sharePrompt}</div>}
                    </div>
                    <Btn variant="primary" onClick={handleSubmit} disabled={submitBusy}>
                      {submitBusy ? "Submitting..." : "Submit"}
                    </Btn>
                  </div>
                </>
              ) : (
                <div style={{ color: textMuted, fontSize: 13 }}>
                  Fill in your information to begin the form.
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </PageWrap>
  );
}
