// src/pages/sat/SATAssignment.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card, ProgressBar } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import useCountdown from "../../hooks/useCountdown.js";
import { supabase } from "../../lib/supabase.js";
import { saveSatTraining } from "../../lib/supabaseStorage.js";

const DEFAULT_META = {
  classwork: { durationSec: 20 * 60, allowRetake: true, resumeMode: "restart", attemptLimit: null },
  homework: { durationSec: null, allowRetake: true, resumeMode: "resume", attemptLimit: null },
  quiz: { durationSec: 15 * 60, allowRetake: false, resumeMode: "restart", attemptLimit: 1 },
};

const normalizeQuestion = (question, idx) => {
  const q = question || {};
  const hasChoices = Array.isArray(q.choices) && q.choices.some((ch) => ch && (ch.label || ch.text || ch.value));
  const choices = hasChoices
    ? q.choices
        .map((ch) => ({
          value: ch?.value ?? ch?.option ?? ch?.id ?? ch?.label ?? ch?.text ?? "",
          label: ch?.label ?? ch?.text ?? ch?.value ?? "",
        }))
        .filter((ch) => ch.label)
    : [];
  return {
    ...q,
    id: q.id || `q_${idx + 1}`,
    prompt: q.prompt || q.text || q.question || "",
    choices,
    answerType: q.answerType || (choices.length ? "choice" : "text"),
  };
};

const buildMeta = (kind, metaOverride = null, fallbackDuration = null) => {
  const base = { ...(DEFAULT_META[(kind || "classwork").toLowerCase()] || DEFAULT_META.classwork) };
  const source = metaOverride || {};
  if (source.durationSec != null) {
    const dur = Number(source.durationSec);
    base.durationSec = Number.isFinite(dur) && dur > 0 ? dur : null;
  } else if (fallbackDuration && base.durationSec !== null) {
    base.durationSec = fallbackDuration;
  }
  if (source.allowRetake != null) base.allowRetake = !!source.allowRetake;
  if (source.resumeMode) base.resumeMode = String(source.resumeMode);
  if (source.attemptLimit != null) {
    const lim = Number(source.attemptLimit);
    base.attemptLimit = Number.isFinite(lim) && lim > 0 ? lim : null;
  }
  if (base.resumeMode === "resume") base.durationSec = null;
  if (base.allowRetake === false && base.attemptLimit == null) base.attemptLimit = 1;
  return base;
};

const buildSummary = ({ correctCount, total, section }) => {
  const entry = { correct: correctCount, total };
  if (section === "MATH") {
    return { math: entry };
  }
  if (section && section.toUpperCase().startsWith("R")) {
    return { rw: entry };
  }
  return { total: entry };
};

function SATAssignment({ onNavigate, practice = null }) {
  SATAssignment.propTypes = { onNavigate: PropTypes.func.isRequired, practice: PropTypes.object };

  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [meta, setMeta] = useState(buildMeta(practice?.kind, practice?.meta, practice?.custom?.durationSec));
  const [title, setTitle] = useState(practice?.custom?.title || practice?.title || "Assignment");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showPalette, setShowPalette] = useState(false);

  const questionTimers = useRef({});
  const questionStartRef = useRef(null);
  const startedAtRef = useRef(null);
  const resumePayloadRef = useRef(null);

  const resumeEnabled = Boolean(practice?.meta?.resumeMode === "resume" && practice?.resourceId);
  const resumeKey = resumeEnabled ? `cg_sat_resume_${practice.resourceId}` : null;

  const {
    remaining: timerRemaining,
    running: timerRunning,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer,
    fmt: fmtTimer,
  } = useCountdown(meta && Number.isFinite(Number(meta.durationSec)) && Number(meta.durationSec) > 0 ? Number(meta.durationSec) : 0);

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

  useEffect(() => {
    let cancelled = false;
    const loadQuestions = async () => {
      setLoading(true);
      setError("");
      try {
        let custom = practice?.custom;
        if ((!custom || !Array.isArray(custom.questions)) && practice?.resourceId) {
          const table = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
          const { data, error: fetchError } = await supabase.from(table).select("*").eq("id", practice.resourceId).limit(1).single();
          if (fetchError) throw fetchError;
          if (data?.payload?.items && Array.isArray(data.payload.items)) {
            custom = {
              questions: data.payload.items,
              title: data.title || practice?.title || "Custom Assignment",
              meta: data.payload.meta || data.payload.settings || null,
            };
          } else if (data?.url && String(data.url).startsWith("data:application/json")) {
            try {
              const base64 = String(data.url).split(",")[1] || "";
              const json = decodeURIComponent(escape(window.atob(base64)));
              const parsed = JSON.parse(json);
              if (parsed && Array.isArray(parsed.items)) {
                custom = { questions: parsed.items, title: parsed.title || data.title || practice?.title || "Custom Assignment", meta: parsed.meta || null };
              }
            } catch (err) {
              console.warn("parse assignment dataUrl", err);
            }
          }
          if (custom?.meta) {
            setMeta((prev) => buildMeta(practice?.kind, { ...practice?.meta, ...custom.meta }, custom.durationSec ?? prev?.durationSec));
          }
          if (!practice?.title && (custom?.title || data?.title)) {
            setTitle(custom?.title || data?.title);
          }
        } else if (custom?.meta) {
          setMeta((prev) => buildMeta(practice?.kind, { ...practice?.meta, ...custom.meta }, custom.durationSec ?? prev?.durationSec));
        }
        const list = (custom && Array.isArray(custom.questions) ? custom.questions : practice?.questions) || [];
        if (!list.length) throw new Error("This assignment has no questions yet.");
        const normalized = list.map((item, idx) => normalizeQuestion(item, idx));
        if (!cancelled) {
          setQuestions(normalized);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err?.message || "Failed to load assignment.");
          setLoading(false);
        }
      }
    };
    loadQuestions();
    return () => { cancelled = true; };
  }, [practice]);

  useEffect(() => {
    if (!questions.length || !resumeKey) return;
    try {
      const raw = localStorage.getItem(resumeKey);
      if (!raw) return;
      const stored = JSON.parse(raw);
      if (!stored || typeof stored !== "object") return;
      resumePayloadRef.current = stored;
      if (stored.answers && typeof stored.answers === "object") {
        setAnswers(stored.answers);
      }
      if (Number.isFinite(stored.currentIndex) && stored.currentIndex >= 0 && stored.currentIndex < questions.length) {
        setCurrentIndex(stored.currentIndex);
      }
      if (Number.isFinite(stored.elapsedSec) && stored.elapsedSec > 0) {
        setElapsedSec(stored.elapsedSec);
      }
    } catch (err) {
      console.warn("resume load", err);
    }
  }, [questions, resumeKey]);

  useEffect(() => {
    if (!questions.length || loading) return;
    startedAtRef.current = Date.now();
    questionStartRef.current = performance.now();
    if (meta && Number(meta.durationSec) > 0) {
      const storedRemaining = resumePayloadRef.current?.remainingSec;
      const initialRemaining = Number.isFinite(storedRemaining) ? Math.max(0, Number(storedRemaining)) : Number(meta.durationSec);
      resetTimer(initialRemaining);
      startTimer();
    } else {
      stopTimer();
    }
    return () => {
      stopTimer();
    };
  }, [questions, loading, meta.durationSec, resetTimer, startTimer, stopTimer]);

  const persistResume = (overrides = {}) => {
    if (!resumeKey) return;
    try {
      let totalElapsed = Object.values(questionTimers.current || {}).reduce((sum, value) => sum + value, 0);
      if (questionStartRef.current != null) {
        const delta = (performance.now() - questionStartRef.current) / 1000;
        if (Number.isFinite(delta) && delta > 0) totalElapsed += delta;
      }
      const mergedAnswers = overrides.answers || answers;
      const mergedIndex = overrides.currentIndex != null ? overrides.currentIndex : currentIndex;
      const remainingSec = meta && Number(meta.durationSec) > 0 ? Math.max(0, Number(timerRemaining) || 0) : null;
      const snapshot = {
        ...overrides,
        answers: mergedAnswers,
        currentIndex: mergedIndex,
        elapsedSec: totalElapsed,
        remainingSec,
        updatedAt: Date.now(),
      };
      localStorage.setItem(resumeKey, JSON.stringify(snapshot));
    } catch (err) {
      console.warn("resume save", err);
    }
  };

  const updateAnswer = (id, value, persist = true) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      if (persist) {
        persistResume({ answers: next });
      }
      return next;
    });
  };

  const goNext = () => {
    recordTimeForCurrent();
    const total = questions.length || 1;
    const nextIndex = Math.min(total - 1, currentIndex + 1);
    setCurrentIndex(nextIndex);
    persistResume({ currentIndex: nextIndex });
    questionStartRef.current = performance.now();
  };

  const goPrev = () => {
    recordTimeForCurrent();
    const prevIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(prevIndex);
    persistResume({ currentIndex: prevIndex });
    questionStartRef.current = performance.now();
  };

  const jumpToIndex = (idx) => {
    if (!Number.isInteger(idx) || idx < 0 || idx >= questions.length) return;
    recordTimeForCurrent();
    setCurrentIndex(idx);
    persistResume({ currentIndex: idx });
    questionStartRef.current = performance.now();
    setShowPalette(false);
  };

  const unanswered = useMemo(() => {
    if (!questions.length) return questions;
    return questions.filter((q) => answers[q.id] == null || answers[q.id] === "");
  }, [answers, questions]);

  const answeredSet = useMemo(() => {
    const set = new Set();
    Object.entries(answers || {}).forEach(([qid, value]) => {
      if (value != null && value !== "") set.add(qid);
    });
    return set;
  }, [answers]);

  const compareAnswer = (expected, actual) => {
    if (expected == null) return null;
    if (actual == null) return false;
    const norm = (val) => String(val).trim().toLowerCase();
    return norm(expected) === norm(actual);
  };

  const recordTimeForCurrent = () => {
    const question = questions[currentIndex];
    if (!question) return;
    const start = questionStartRef.current;
    if (!start) return;
    const delta = (performance.now() - start) / 1000;
    if (!Number.isFinite(delta) || delta <= 0) return;
    const id = question.id;
    if (!id) return;
    questionTimers.current[id] = (questionTimers.current[id] || 0) + delta;
    questionStartRef.current = performance.now();
  };

  const handleSubmit = async () => {
    recordTimeForCurrent();
    if (unanswered.length > 0) {
      const proceed = window.confirm(
        `You still have ${unanswered.length} unanswered question${unanswered.length === 1 ? "" : "s"}. Submit anyway?`
      );
      if (!proceed) return;
    }
    if (timerRunning) stopTimer();
    const totalElapsed =
      Object.values(questionTimers.current || {}).reduce((sum, value) => sum + value, 0) ||
      (startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : 0);
    const elapsedRounded = Math.max(0, Math.round(totalElapsed));
    setElapsedSec(elapsedRounded);

    const choicesPayload = {};
    const correctPayload = {};
    const timesPayload = {};
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const id = q.id || `q_${idx + 1}`;
      const userValue = answers[id] ?? null;
      const expected = q.correct ?? q.answer ?? null;
      choicesPayload[id] = userValue;
      if (expected != null) {
        correctPayload[id] = expected;
        if (compareAnswer(expected, userValue)) correctCount += 1;
      }
      const timeSpent = Number(questionTimers.current[id] || 0);
      if (timeSpent > 0) timesPayload[id] = Math.round(timeSpent);
    });

    const summary = buildSummary({
      correctCount,
      total: questions.length,
      section: practice?.section,
    });

    const answerRecord = {
      resourceId: practice?.resourceId || null,
      className: practice?.className || null,
      status: "completed",
      kind: practice?.kind || null,
      unit: practice?.unit || null,
      lesson: practice?.lesson || null,
      meta,
      choices: choicesPayload,
      correct: Object.keys(correctPayload).length ? correctPayload : null,
      times: Object.keys(timesPayload).length ? timesPayload : null,
      durationSec: meta?.durationSec || null,
      elapsedSec: elapsedRounded,
    };

    setSaving(true);
    setSaveError("");
    try {
      await saveSatTraining({
        kind: practice?.kind || "classwork",
        section: practice?.section || null,
        unit: practice?.unit || null,
        lesson: practice?.lesson || null,
        summary,
        answers: answerRecord,
        elapsedSec: elapsedRounded,
        resourceId: practice?.resourceId || null,
        className: practice?.className || null,
        status: "completed",
        meta,
        attempt: practice?.attemptIndex ?? null,
        durationSec: meta?.durationSec ?? null,
      });
      if (resumeKey) {
        try { localStorage.removeItem(resumeKey); } catch {}
      }
      setSubmitted(true);
      setShowPalette(false);
    } catch (err) {
      console.error(err);
      setSaveError(err?.message || "Failed to save results.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <PageWrap>
        <HeaderBar title="Assignment" />
        <Card>
          <p style={{ color: "#6b7280" }}>Loading assignment…</p>
        </Card>
      </PageWrap>
    );
  }

  if (!authUser) {
    return (
      <PageWrap>
        <HeaderBar title="Assignment" />
        <Card>
          <p style={{ color: "#6b7280" }}>Please sign in to access this assignment.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            <Btn variant="back" onClick={() => onNavigate("sat-training")}>Back to Training</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  if (error) {
    return (
      <PageWrap>
        <HeaderBar title="Assignment" />
        <Card>
          <p style={{ color: "#ef4444" }}>{error}</p>
          <Btn variant="back" onClick={() => onNavigate("sat-training")}>Back to Training</Btn>
        </Card>
      </PageWrap>
    );
  }

  if (!questions.length) {
    return (
      <PageWrap>
        <HeaderBar title="Assignment" />
        <Card>
          <p style={{ color: "#6b7280" }}>No questions were provided for this assignment.</p>
          <Btn variant="back" onClick={() => onNavigate("sat-training")}>Back to Training</Btn>
        </Card>
      </PageWrap>
    );
  }

  if (submitted) {
    const correctCount = Object.entries(answers).reduce((sum, [id, value]) => {
      const q = questions.find((item) => item.id === id);
      if (!q) return sum;
      const expected = q.correct ?? q.answer;
      if (expected == null) return sum;
      return sum + (compareAnswer(expected, value) ? 1 : 0);
    }, 0);
    return (
      <PageWrap>
        <HeaderBar title={title} />
        <Card>
          <h3 style={{ marginTop: 0, color: "#111827" }}>Submission saved</h3>
          <p style={{ color: "#6b7280" }}>
            You answered {correctCount} out of {questions.length} questions correctly.
            {Number.isFinite(elapsedSec) && elapsedSec > 0 && (
              <> Total time: {Math.floor(elapsedSec / 60)}m {(Math.round(elapsedSec) % 60).toString().padStart(2, "0")}s.</>
            )}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant="secondary" onClick={() => onNavigate("sat-training")}>Back to Training</Btn>
            <Btn variant="primary" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || null;
  const qNumber = currentIndex + 1;
  const timeLabel = meta && Number(meta.durationSec) > 0 ? fmtTimer(Math.max(0, timerRemaining)) : `${qNumber}/${totalQuestions}`;
  const isLastQuestion = currentIndex >= totalQuestions - 1;
  const submitDisabled = saving || totalQuestions === 0;
  const unansweredCount = unanswered.length;

  const headerControls = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {meta && Number(meta.durationSec) > 0 && (
        <div style={{ fontWeight: 700, minWidth: 72, textAlign: "right" }}>{timeLabel}</div>
      )}
      {questions.length > 1 && (
        <button
          type="button"
          onClick={() => setShowPalette(true)}
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#2563eb",
            fontWeight: 600,
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          Question Map
        </button>
      )}
    </div>
  );

  const handleChoice = (value) => {
    if (!currentQuestion) return;
    updateAnswer(currentQuestion.id, value);
  };

  const handleTextChange = (event) => {
    if (!currentQuestion) return;
    updateAnswer(currentQuestion.id, event.target.value);
  };

  return (
    <PageWrap>
      <HeaderBar title={title} right={headerControls} />
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {practice?.kind ? practice.kind.charAt(0).toUpperCase() + practice.kind.slice(1) : "Assignment"}
            </div>
            <h3 style={{ margin: "4px 0 0", color: "#111827" }}>Question {qNumber}</h3>
          </div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            {meta && Number(meta.durationSec) > 0 ? (
              <>Time remaining: {timeLabel}</>
            ) : (
              <>Progress {qNumber}/{totalQuestions}</>
            )}
          </div>
        </div>
        <div style={{ margin: "16px 0" }}>
          <ProgressBar value={qNumber} max={totalQuestions} />
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.6, color: "#111827", whiteSpace: "pre-wrap" }}>
          {currentQuestion?.prompt || "Untitled question"}
        </div>
        {currentQuestion?.choices?.length ? (
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {currentQuestion.choices.map((choice) => {
              const selected = answers[currentQuestion.id] === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => handleChoice(choice.value)}
                  style={{
                    textAlign: "left",
                    borderRadius: 10,
                    padding: "12px 14px",
                    border: selected ? "2px solid #2563eb" : "1px solid #d1d5db",
                    background: selected ? "rgba(37,99,235,0.08)" : "#fff",
                    color: "#111827",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{choice.value}</div>
                  <div style={{ color: "#4b5563", fontSize: 14, marginTop: 4 }}>{choice.label}</div>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Your answer</label>
            <input
              type="text"
              value={answers[currentQuestion?.id] ?? ""}
              onChange={handleTextChange}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
              placeholder="Type your answer"
            />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 12, flexWrap: "wrap" }}>
          <Btn variant="secondary" disabled={currentIndex === 0} onClick={goPrev}>Previous</Btn>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {!isLastQuestion && (
              <Btn variant="secondary" onClick={goNext}>Next</Btn>
            )}
            <Btn variant="primary" disabled={submitDisabled} onClick={handleSubmit}>
              {saving ? "Saving..." : unansweredCount > 0 ? "Submit Anyway" : "Submit"}
            </Btn>
          </div>
        </div>
        {unansweredCount > 0 && !submitDisabled && (
          <div style={{ marginTop: 12, color: "#f97316", fontSize: 13 }}>
            {unansweredCount} unanswered question{unansweredCount === 1 ? "" : "s"} remaining.
          </div>
        )}
        {saveError && (
          <div style={{ marginTop: 16, color: "#ef4444", fontSize: 13 }}>
            {saveError}
          </div>
        )}
      </Card>
      {showPalette && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowPalette(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", width: "min(520px, 92vw)", maxHeight: "80vh", overflowY: "auto", padding: 16, boxShadow: "0 18px 36px rgba(15,23,42,0.25)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#111827" }}>Question Map</h3>
              <button
                type="button"
                onClick={() => setShowPalette(false)}
                style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}
              >
                Close
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(48px,1fr))", gap: 8 }}>
              {questions.map((q, idx) => {
                const number = idx + 1;
                const answered = answeredSet.has(q.id);
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id || number}
                    type="button"
                    onClick={() => jumpToIndex(idx)}
                    style={{
                      padding: "10px 0",
                      borderRadius: 8,
                      border: isCurrent ? "2px solid #2563eb" : "1px solid #d1d5db",
                      background: answered ? "rgba(37,99,235,0.12)" : "#fff",
                      color: "#111827",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {number}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </PageWrap>
  );
}

export default SATAssignment;
