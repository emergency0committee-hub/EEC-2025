// src/pages/sat/SATAssignment.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card, ProgressBar } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import useCountdown from "../../hooks/useCountdown.js";
import { supabase } from "../../lib/supabase.js";
import { beginSatTrainingSession, saveSatTraining, updateSatTrainingSession } from "../../lib/supabaseStorage.js";
import "katex/dist/katex.min.css";
import { renderMathText } from "../../lib/mathText.jsx";
import { fetchQuestionBankByIds } from "../../lib/assignmentQuestions.js";
import { BANKS, mapBankQuestionToResource } from "../../lib/questionBanks.js";

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

const looksLikeRefs = (items) =>
  Array.isArray(items) &&
  items.length > 0 &&
  items.every((item) => item && Object.prototype.hasOwnProperty.call(item, "questionId"));

const hydrateQuestionReferences = async (refs = [], meta = {}) => {
  if (!looksLikeRefs(refs)) return [];
  const groups = refs.reduce((acc, ref) => {
    const refId = ref?.questionId != null ? String(ref.questionId) : null;
    if (!refId) return acc;
    const bankId = ref.bank || meta.questionBank || "math";
    const bank = BANKS[bankId] || BANKS.math;
    if (!bank?.table) return acc;
    if (!acc.has(bankId)) acc.set(bankId, { bank, ids: new Set() });
    acc.get(bankId).ids.add(refId);
    return acc;
  }, new Map());
  if (groups.size === 0) return [];
  const fetched = new Map();
  await Promise.all(
    Array.from(groups.values()).map(async ({ bank, ids }) => {
      const rows = await fetchQuestionBankByIds({ table: bank.table, ids: Array.from(ids) });
      rows.forEach((row) => {
        const mapped = mapBankQuestionToResource(row);
        if (mapped && row?.id != null) fetched.set(String(row.id), mapped);
      });
    }),
  );
  return refs
    .map((ref) => {
      const refId = ref?.questionId != null ? String(ref.questionId) : null;
      if (!refId) return null;
      return fetched.get(refId) || null;
    })
    .filter(Boolean);
};

const materializeQuestionItems = async (items = [], meta = {}) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const requiresHydration =
    meta?.questionRefs ||
    looksLikeRefs(items);
  if (!requiresHydration) return items;
  const hydrated = await hydrateQuestionReferences(items, meta);
  return hydrated.length ? hydrated : [];
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
  const [sessionReady, setSessionReady] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const questionTimers = useRef({});
  const questionStartRef = useRef(null);
  const startedAtRef = useRef(null);
  const resumePayloadRef = useRef(null);
  const sessionRef = useRef(null);
  const sessionMetaRef = useRef(null);
  const submittedRef = useRef(false);
  const userEmail = authUser?.email || "";

  const practiceKind = String(practice?.kind || "").toLowerCase();
  const practiceSection = practice?.section || null;
  const practiceUnit = practice?.unit || null;
  const practiceLesson = practice?.lesson || null;
  const practiceResourceId = practice?.resourceId || null;
  const practiceClassName = practice?.className || null;
  const practiceAttemptIndex = practice?.attemptIndex ?? null;
  const metaSignature = JSON.stringify(meta || {});

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

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

  const assignmentSubject = useMemo(() => {
    const sources = [
      practice?.subject,
      practice?.meta?.subject,
      practice?.custom?.subject,
      practice?.custom?.meta?.subject,
      meta?.subject,
    ];
    const found = sources.find((value) => typeof value === "string" && value.trim().length > 0);
    return found ? found.trim().toLowerCase() : "";
  }, [practice?.subject, practice?.meta, practice?.custom, meta?.subject]);
  const isMathAssignment =
    assignmentSubject === "math" ||
    String(practiceSection || "").toUpperCase() === "MATH" ||
    Boolean(practiceUnit);
  const isHomework = practiceKind === "homework";
  const deadlineIso =
    practice?.deadline ||
    practice?.meta?.deadline ||
    practice?.custom?.meta?.deadline ||
    meta?.deadline ||
    null;
  const deadlineDate = deadlineIso ? new Date(deadlineIso) : null;
  const hasValidDeadline = deadlineDate && !Number.isNaN(deadlineDate.getTime());
  const deadlinePassed = Boolean(hasValidDeadline && Date.now() > deadlineDate.getTime());
  const deadlineLabel = hasValidDeadline ? deadlineDate.toLocaleString() : null;
  const reviewOnly = Boolean(practice?.reviewOnly) || (isHomework && deadlinePassed);

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
        let list = (custom && Array.isArray(custom.questions) ? custom.questions : practice?.questions) || [];
        const metaSource = custom?.meta || practice?.custom?.meta || practice?.meta || {};
        const questionMeta = {
          questionRefs:
            metaSource.questionRefs != null
              ? Boolean(metaSource.questionRefs)
              : looksLikeRefs(list),
          questionBank: metaSource.questionBank || practice?.custom?.questionBank || null,
        };
        if (questionMeta.questionRefs || looksLikeRefs(list)) {
          list = await materializeQuestionItems(list, questionMeta);
        }
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
    if (!reviewOnly || !practiceResourceId || !userEmail) return;
    (async () => {
      try {
        const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
        const { data, error } = await supabase
          .from(tTable)
          .select("answers")
          .eq("resource_id", practiceResourceId)
          .eq("user_email", userEmail)
          .order("ts", { ascending: false })
          .limit(1);
        if (!error && data && data.length) {
          const record = data[0];
          const savedAnswers = record?.answers?.choices || {};
          setAnswers(savedAnswers || {});
          setSubmitted(true);
        }
      } catch (err) {
        console.warn("load homework submission", err);
      }
    })();
  }, [practiceResourceId, reviewOnly, userEmail]);

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

  const computeElapsedSeconds = useCallback(() => {
    let totalElapsed = Object.values(questionTimers.current || {}).reduce((sum, value) => sum + value, 0);
    if (questionStartRef.current != null) {
      const delta = (performance.now() - questionStartRef.current) / 1000;
      if (Number.isFinite(delta) && delta > 0) totalElapsed += delta;
    } else if (startedAtRef.current != null) {
      const delta = (Date.now() - startedAtRef.current) / 1000;
      if (Number.isFinite(delta) && delta > 0) totalElapsed += delta;
    }
    return Math.max(0, Math.round(totalElapsed));
  }, []);

  useEffect(() => {
    if (practiceKind !== "homework") return;
    if (sessionRef.current) return;
    if (authLoading || loading) return;
    if (!authUser) return;
    if (!questions.length) return;

    let cancelled = false;
    (async () => {
      try {
        const nowIso = new Date().toISOString();
        const baseMeta = {
          ...(meta ? { ...meta } : {}),
          session: {
            startedAt: nowIso,
            lastHeartbeat: nowIso,
          },
        };
        sessionMetaRef.current = baseMeta;
        const { sessionId } = await beginSatTrainingSession({
          kind: practiceKind || "homework",
          section: practiceSection,
          unit: practiceUnit,
          lesson: practiceLesson,
          resourceId: practiceResourceId,
          className: practiceClassName,
          meta: baseMeta,
          durationSec: meta?.durationSec ?? null,
          attempt: practiceAttemptIndex,
          status: "active",
        });
        if (!cancelled && sessionId) {
          sessionRef.current = sessionId;
          setSessionReady(true);
        }
      } catch (err) {
        console.warn("beginSatTrainingSession", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    authUser,
    loading,
    meta?.durationSec,
    metaSignature,
    practiceAttemptIndex,
    practiceClassName,
    practiceKind,
    practiceLesson,
    practiceResourceId,
    practiceSection,
    practiceUnit,
    questions.length,
  ]);

  useEffect(() => {
    if (practiceKind !== "homework") return;
    if (!sessionRef.current || !sessionReady) return;
    if (submitted) return;

    let active = true;
    const heartbeat = async () => {
      if (!active || !sessionRef.current || submittedRef.current) return;
      try {
        const elapsed = computeElapsedSeconds();
        const nowIso = new Date().toISOString();
        const baseMeta = {
          ...(sessionMetaRef.current ? { ...sessionMetaRef.current } : meta ? { ...meta } : {}),
        };
        const sessionInfo = {
          ...(baseMeta.session || {}),
          lastHeartbeat: nowIso,
          lastElapsed: elapsed,
        };
        if (meta && Number(meta.durationSec) > 0) {
          sessionInfo.estimatedRemaining = Math.max(0, Math.round(Number(meta.durationSec) - elapsed));
        }
        baseMeta.session = sessionInfo;
        sessionMetaRef.current = baseMeta;
        await updateSatTrainingSession(sessionRef.current, {
          status: "active",
          elapsed_sec: elapsed,
          meta: baseMeta,
        });
      } catch (err) {
        console.warn("satHomework heartbeat", err);
      }
    };

    heartbeat();
    const interval = setInterval(heartbeat, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [computeElapsedSeconds, metaSignature, practiceKind, sessionReady, submitted]);

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

  const formatAnswerForDisplay = (question, value) => {
    if (value == null || value === "") return "—";
    if (question?.choices?.length) {
      const match = question.choices.find((choice) => String(choice.value) === String(value));
      return match ? `${value} - ${match.label}` : String(value);
    }
    return String(value);
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

  const handleChoice = (value) => {
    if (reviewOnly) return;
    if (!currentQuestion) return;
    updateAnswer(currentQuestion.id, value);
  };

  const handleTextChange = (event) => {
    if (reviewOnly) return;
    if (!currentQuestion) return;
    updateAnswer(currentQuestion.id, event.target.value);
  };

  const handleResumeHomework = () => {
    submittedRef.current = false;
    setSubmitted(false);
    setSaveError("");
  };

  const handleSubmit = async () => {
    if (reviewOnly) return;
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
      section: practiceSection,
    });

    const nowIso = new Date().toISOString();
    const baseMeta = {
      ...(sessionMetaRef.current ? { ...sessionMetaRef.current } : meta ? { ...meta } : {}),
    };
    baseMeta.session = {
      ...(baseMeta.session || {}),
      lastHeartbeat: nowIso,
      finishedAt: nowIso,
    };
    sessionMetaRef.current = baseMeta;

    const answerRecord = {
      resourceId: practiceResourceId,
      className: practiceClassName,
      status: "completed",
      kind: practice?.kind || null,
      unit: practiceUnit,
      lesson: practiceLesson,
      meta: baseMeta,
      choices: choicesPayload,
      correct: Object.keys(correctPayload).length ? correctPayload : null,
      times: Object.keys(timesPayload).length ? timesPayload : null,
      durationSec: meta?.durationSec || null,
      elapsedSec: elapsedRounded,
    };

    setSaving(true);
    setSaveError("");
    try {
      submittedRef.current = true;
      await saveSatTraining({
        kind: practice?.kind || "classwork",
        section: practiceSection,
        unit: practiceUnit,
        lesson: practiceLesson,
        summary,
        answers: answerRecord,
        elapsedSec: elapsedRounded,
        resourceId: practiceResourceId,
        className: practiceClassName,
        status: "completed",
        meta: baseMeta,
        attempt: practiceAttemptIndex,
        durationSec: meta?.durationSec ?? null,
        sessionId: sessionRef.current,
      });
      if (resumeKey) {
        try { localStorage.removeItem(resumeKey); } catch {}
      }
      setSubmitted(true);
      setShowPalette(false);
      setSessionReady(false);
      sessionRef.current = null;
    } catch (err) {
      console.error(err);
      setSaveError(err?.message || "Failed to save results.");
      submittedRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (practiceKind !== "homework") return () => {};
    return () => {
      if (!sessionRef.current || submittedRef.current) return;
      const nowIso = new Date().toISOString();
      const elapsed = computeElapsedSeconds();
      const baseMeta = {
        ...(sessionMetaRef.current ? { ...sessionMetaRef.current } : meta ? { ...meta } : {}),
      };
      baseMeta.session = {
        ...(baseMeta.session || {}),
        lastHeartbeat: nowIso,
        abandonedAt: nowIso,
      };
      sessionMetaRef.current = baseMeta;
      updateSatTrainingSession(sessionRef.current, {
        status: "abandoned",
        elapsed_sec: elapsed,
        meta: baseMeta,
      }).catch((err) => console.warn("satHomework abandon", err));
    };
  }, [computeElapsedSeconds, metaSignature, practiceKind]);

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

  if (submitted && !reviewOnly) {
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
            {isHomework && !deadlinePassed && (
              <Btn variant="primary" onClick={handleResumeHomework}>Edit Homework</Btn>
            )}
          </div>
        </Card>
      </PageWrap>
    );
  }

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || null;
  const qNumber = currentIndex + 1;
  const currentCorrectValue = currentQuestion ? (currentQuestion.correct ?? currentQuestion.answer ?? null) : null;
  const currentUserAnswer = currentQuestion ? answers[currentQuestion.id] : null;
  const currentAnswerCorrect =
    currentCorrectValue != null ? compareAnswer(currentCorrectValue, currentUserAnswer) : null;
  const currentCorrectDisplay =
    currentQuestion && currentCorrectValue != null ? formatAnswerForDisplay(currentQuestion, currentCorrectValue) : null;
  const timeLabel = meta && Number(meta.durationSec) > 0 ? fmtTimer(Math.max(0, timerRemaining)) : `${qNumber}/${totalQuestions}`;
  const isLastQuestion = currentIndex >= totalQuestions - 1;
  const submitDisabled = saving || totalQuestions === 0;
  const unansweredCount = unanswered.length;
  const headerControls = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {meta && Number(meta.durationSec) > 0 && (
        <div style={{ fontWeight: 700, minWidth: 72, textAlign: "right" }}>{timeLabel}</div>
      )}
      {deadlineLabel && (
        <div style={{ fontSize: 12, color: "#9ca3af", minWidth: 140 }}>
          Due {deadlineLabel}
        </div>
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
      {isMathAssignment && (
        <button
          type="button"
          onClick={() => setShowCalculator(true)}
          aria-label="Open calculator"
          style={{
            border: "1px solid #d1d5db",
            background: "#111827",
            color: "#fff",
            fontWeight: 600,
            borderRadius: 8,
            padding: "6px",
            cursor: "pointer",
            width: 40,
            height: 40,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            aria-hidden
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <line x1="4" y1="8" x2="20" y2="8" />
            <line x1="9" y1="13" x2="9" y2="18" />
            <line x1="6" y1="15.5" x2="12" y2="15.5" />
            <line x1="14.5" y1="13" x2="18" y2="13" />
            <line x1="14.5" y1="18" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <PageWrap>
      <HeaderBar title={title} right={headerControls} />
      {showCalculator && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Desmos Calculator"
          onClick={() => setShowCalculator(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.75)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "min(960px, 95vw)",
              height: "min(640px, 90vh)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 70px rgba(15,23,42,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong style={{ fontSize: 16 }}>Desmos Calculator</strong>
              <button
                type="button"
                onClick={() => setShowCalculator(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#2563eb",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
            <iframe
              title="Desmos Graphing Calculator"
              src="https://www.desmos.com/calculator?lang=en"
              style={{
                flex: 1,
                border: "none",
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }}
              allowFullScreen
            />
          </div>
        </div>
      )}
      <Card>
        {reviewOnly && (
          <div
            style={{
              background: "#fefce8",
              border: "1px solid #facc15",
              color: "#92400e",
              padding: "10px 12px",
              borderRadius: 10,
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            Review mode — answers are locked. Correct answers are highlighted in green.
          </div>
        )}
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
        <div style={{ fontSize: 16, lineHeight: 1.6, color: "#111827" }}>
          {renderMathText(currentQuestion?.prompt || "Untitled question")}
        </div>
        {currentQuestion?.choices?.length ? (
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {currentQuestion.choices.map((choice) => {
              const selected = answers[currentQuestion.id] === choice.value;
              const isCorrectChoice =
                currentCorrectValue != null ? compareAnswer(currentCorrectValue, choice.value) : null;
              const showReview = reviewOnly && currentCorrectValue != null;
              let border = selected ? "2px solid #2563eb" : "1px solid #d1d5db";
              let background = selected ? "rgba(37,99,235,0.08)" : "#fff";
              let textColor = "#111827";
              let cursor = "pointer";
              if (showReview) {
                cursor = "default";
                if (isCorrectChoice) {
                  border = "2px solid #16a34a";
                  background = "rgba(34,197,94,0.12)";
                  textColor = "#065f46";
                } else if (selected && isCorrectChoice === false) {
                  border = "2px solid #dc2626";
                  background = "rgba(248,113,113,0.12)";
                  textColor = "#991b1b";
                } else {
                  border = "1px solid #e5e7eb";
                  background = "#fff";
                  textColor = "#111827";
                }
              }
              return (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => handleChoice(choice.value)}
                  disabled={reviewOnly}
                  style={{
                    textAlign: "left",
                    borderRadius: 10,
                    padding: "12px 14px",
                    border,
                    background,
                    color: textColor,
                    cursor,
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{choice.value}</div>
                  <div style={{ color: "#4b5563", fontSize: 14, marginTop: 4 }}>
                    {renderMathText(choice.label || choice.text || choice.value)}
                  </div>
                </button>
              );
            })}
            {null}
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Your answer</label>
            <input
              type="text"
              value={answers[currentQuestion?.id] ?? ""}
              onChange={handleTextChange}
              readOnly={reviewOnly}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border:
                  reviewOnly && currentCorrectValue != null
                    ? currentAnswerCorrect
                      ? "2px solid #16a34a"
                      : "2px solid #dc2626"
                    : "1px solid #d1d5db",
                background: reviewOnly ? "#f8fafc" : "#fff",
                color:
                  reviewOnly && currentCorrectValue != null
                    ? currentAnswerCorrect
                      ? "#065f46"
                      : "#991b1b"
                    : "#111827",
              }}
              placeholder="Type your answer"
            />
            {null}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 12, flexWrap: "wrap" }}>
          <Btn variant="secondary" disabled={currentIndex === 0} onClick={goPrev}>Previous</Btn>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {!isLastQuestion && (
              <Btn variant="secondary" onClick={goNext}>Next</Btn>
            )}
            {!reviewOnly && (
              <Btn variant="primary" disabled={submitDisabled} onClick={handleSubmit}>
                {saving ? "Saving..." : unansweredCount > 0 ? "Submit Anyway" : "Submit"}
              </Btn>
            )}
          </div>
        </div>
        {unansweredCount > 0 && !submitDisabled && !reviewOnly && (
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
