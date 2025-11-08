// src/pages/sat/SATExam.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card, ProgressBar } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { SATFooterBar } from "./SATLayout.jsx";
import PaletteOverlay from "../test/PaletteOverlay.jsx";
import useCountdown from "../../hooks/useCountdown.js";
import "katex/dist/katex.min.css";

import { supabase } from "../../lib/supabase.js";
import { saveSatResult } from "../../lib/supabaseStorage.js";
import { loadRWModules, MATH_MODULES, normalizeEnglishSkill, normalizeDifficulty } from "../../sat/questions.js";
import { renderMathText } from "../../lib/mathText.jsx";
import { fetchQuestionBankByIds } from "../../lib/assignmentQuestions.js";
import { BANKS, mapBankQuestionToResource } from "../../lib/questionBanks.js";

export default function SATExam({ onNavigate, practice = null, preview = false }) {
  SATExam.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    practice: PropTypes.object,
    preview: PropTypes.bool,
  };

  const previewMode = Boolean(preview || practice?.preview);

  // Require auth
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try { const { data: { user } } = await supabase.auth.getUser(); if (alive) setAuthUser(user || null); }
      finally { if (alive) setAuthLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  if (!authLoading && !authUser) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Diagnostic" />
        <Card>
          <p style={{ color: "#6b7280" }}>Please sign in to take the diagnostic.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  // Build modules [RW1, RW2, M1, M2]
  const [rwMods, setRwMods] = useState([[], []]);
  useEffect(() => { (async () => { const rw = await loadRWModules(); setRwMods(rw); })(); }, []);
  const [loadedCustom, setLoadedCustom] = useState(null); // { questions, durationSec, title, meta, kind }

  const defaultPracticeMeta = (kind) => {
    const k = (kind || "classwork").toLowerCase();
    const base = {
      durationSec: k === "homework" ? null : 15 * 60,
      allowRetake: k !== "quiz" && k !== "test",
      resumeMode: k === "homework" ? "resume" : "restart",
      attemptLimit: k === "quiz" || k === "test" ? 1 : null,
    };
    if (k === "test") {
      base.durationSec = 35 * 60;
    }
    return base;
  };

  const mergePracticeMeta = (kind, sourceMeta = null, fallbackDuration = null) => {
    const meta = { ...defaultPracticeMeta(kind) };
    if (typeof fallbackDuration === "number" && fallbackDuration > 0 && meta.durationSec !== null) {
      meta.durationSec = fallbackDuration;
    }
    if (sourceMeta && typeof sourceMeta === "object") {
      if (sourceMeta.durationSec != null) {
        const dur = Number(sourceMeta.durationSec);
        meta.durationSec = Number.isFinite(dur) && dur > 0 ? dur : null;
      }
      if (sourceMeta.allowRetake != null) meta.allowRetake = !!sourceMeta.allowRetake;
      if (sourceMeta.resumeMode) meta.resumeMode = String(sourceMeta.resumeMode);
      if (sourceMeta.attemptLimit != null) {
        const lim = Number(sourceMeta.attemptLimit);
        meta.attemptLimit = Number.isFinite(lim) && lim > 0 ? lim : null;
      }
    }
    if (meta.resumeMode === "resume") meta.durationSec = null;
    if (meta.allowRetake === false && meta.attemptLimit == null) meta.attemptLimit = 1;
    return meta;
  };

  const normalizeQuestions = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map((item, idx) => {
      const q = item || {};
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
        choices,
        answerType: q.answerType || (hasChoices ? "choice" : "numeric"),
      };
    });
  };

  const hydrateQuestionReferences = async (refs = [], meta = {}) => {
    if (!Array.isArray(refs) || refs.length === 0) return [];
    const groups = refs.reduce((acc, ref) => {
      const refId = ref?.questionId != null ? String(ref.questionId) : null;
      if (!refId) return acc;
      const bankId = ref.bank || meta.questionBank || "math";
      const bank = BANKS[bankId] || BANKS.math;
      if (!bank?.table) return acc;
      if (!acc.has(bankId)) {
        acc.set(bankId, { bank, ids: new Set(), order: [] });
      }
      const group = acc.get(bankId);
      group.ids.add(refId);
      group.order.push(refId);
      return acc;
    }, new Map());
    if (groups.size === 0) return [];
    const fetched = new Map();
    await Promise.all(
      Array.from(groups.values()).map(async ({ bank, ids }) => {
        const rows = await fetchQuestionBankByIds({
          table: bank.table,
          ids: Array.from(ids),
        });
        rows.forEach((row) => {
          fetched.set(String(row.id), mapBankQuestionToResource(row));
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

  const materializeQuestions = async (items = [], meta = {}) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const refs =
      meta?.questionRefs ||
      items.every((item) => item && Object.prototype.hasOwnProperty.call(item, "questionId"));
    if (!refs) return normalizeQuestions(items);
    const hydrated = await hydrateQuestionReferences(items, meta);
    return normalizeQuestions(hydrated);
  };

  // If practice came only with a resourceId, fetch questions from Supabase
  useEffect(() => {
    (async () => {
      if (!practice || loadedCustom || (practice.custom && Array.isArray(practice.custom.questions))) return;
      const resId = practice.resourceId;
      if (!resId) return;
      try {
        const table = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
        const { data, error } = await supabase.from(table).select("*").eq("id", resId).limit(1).single();
        if (error) return;
        // Decode questions from payload or data URL
        let items = [];
        if (data?.payload?.items && Array.isArray(data.payload.items)) items = data.payload.items;
        else if (data?.url && String(data.url).startsWith("data:application/json")) {
          try {
            const base64 = String(data.url).split(",")[1] || "";
            const json = decodeURIComponent(escape(window.atob(base64)));
            const obj = JSON.parse(json);
            if (Array.isArray(obj.items)) items = obj.items;
          } catch {}
        }
        if (items.length) {
          const payloadMeta = data?.payload?.meta || data?.payload?.settings || {};
          const refMeta = practice.meta || payloadMeta || {};
          const questionMeta = {
            questionRefs:
              refMeta.questionRefs ??
              payloadMeta.questionRefs ??
              items.every((item) => item && item.questionId),
            questionBank: refMeta.questionBank || payloadMeta.questionBank || null,
          };
          const normalized = await materializeQuestions(items, questionMeta);
          const kind = practice.kind || data?.kind || "classwork";
          const fallbackDuration = practice.custom?.durationSec != null ? Number(practice.custom.durationSec) : null;
          const meta = mergePracticeMeta(kind, practice.meta || payloadMeta || null, fallbackDuration);
          meta.questionRefs = questionMeta.questionRefs || undefined;
          setLoadedCustom({
            questions: normalized,
            durationSec: meta.durationSec,
            meta,
            kind,
            title: data?.title || practice.custom?.title || "Custom Quiz",
          });
        }
      } catch {}
    })();
  }, [practice, loadedCustom]);

  useEffect(() => {
    (async () => {
      if (!practice?.custom || loadedCustom || !practice.custom.questionRefs) return;
      const normalized = await materializeQuestions(practice.custom.questions || [], practice.custom);
      const kind = practice.kind || practice.custom.kind || "classwork";
      const meta = mergePracticeMeta(kind, practice.meta || practice.custom.meta, practice.custom.durationSec);
      setLoadedCustom({
        questions: normalized,
        durationSec: meta.durationSec,
        meta,
        kind,
        title: practice.custom.title || "Custom Quiz",
      });
    })();
  }, [practice, loadedCustom]);

  const modules = useMemo(() => {
    if (practice) {
      // Custom quiz (from Classwork/Homework/Quiz CSV) or loaded by id
      const customSource =
        (loadedCustom && Array.isArray(loadedCustom.questions))
          ? loadedCustom
          : (practice.custom && Array.isArray(practice.custom.questions))
            ? practice.custom
            : null;
      if (customSource && Array.isArray(customSource.questions)) {
        const qs = normalizeQuestions(customSource.questions || []);
        const kind = practice.kind || customSource.kind || "classwork";
        const meta = mergePracticeMeta(kind, practice.meta || customSource.meta, customSource.durationSec);
        const title = customSource.title || 'Custom Quiz';
        return [{
          key: 'custom',
          title,
          durationSec: meta.durationSec,
          questions: qs,
          meta,
          kind,
        }];
      }
      // Simple practice: one module per selection
      if (practice.section === 'MATH') {
        const m = MATH_MODULES[0] || [];
        const meta = mergePracticeMeta(practice.kind || 'classwork', practice.meta, 15 * 60);
        return [{ key: 'pm', title: 'Math Practice', durationSec: meta.durationSec, questions: m, meta, kind: practice.kind || 'classwork' }];
      }
      const meta = mergePracticeMeta(practice.kind || 'classwork', practice.meta, 15 * 60);
      return [{ key: 'prw', title: 'Reading & Writing Practice', durationSec: meta.durationSec, questions: (rwMods[0] || []).slice(0, 10), meta, kind: practice.kind || 'classwork' }];
    }
    return [
      { key: "rw1", title: "Reading & Writing - Module 1", durationSec: 35 * 60, questions: rwMods[0] || [] },
      { key: "rw2", title: "Reading & Writing - Module 2", durationSec: 35 * 60, questions: rwMods[1] || [] },
      { key: "m1",  title: "Math - Module 1",              durationSec: 35 * 60, questions: MATH_MODULES[0] || [] },
      { key: "m2",  title: "Math - Module 2",              durationSec: 35 * 60, questions: MATH_MODULES[1] || [] },
    ];
  }, [rwMods, practice, loadedCustom]);

  const [modIdx, setModIdx] = useState(0);
  const mod = modules[modIdx];
  const totalMods = modules.length;
  const isTimed = !previewMode && Number.isFinite(mod?.durationSec) && mod.durationSec > 0;
  const resumeEnabled = Boolean(practice?.meta?.resumeMode === "resume" && practice?.resourceId);
  const resumeKey = resumeEnabled ? `cg_sat_resume_${practice.resourceId}` : null;
  const [resumeLoaded, setResumeLoaded] = useState(!resumeEnabled);
  const [answers, setAnswers] = useState({}); // { modKey: { qid: value } }
  const [flags, setFlags] = useState({}); // { modKey: { qid: true } }
  const [showPalette, setShowPalette] = useState(false);
  const [showPassage, setShowPassage] = useState(true);
  const [showTimer, setShowTimer] = useState(() => isTimed);
  const [page, setPage] = useState(1);
  const [overlay, setOverlay] = useState({ open: false, title: "", message: "" });
  const [summaryModal, setSummaryModal] = useState({ open: false, stats: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectionActive, setSectionActive] = useState(true);
  const qCount = mod?.questions?.length || 0;
  const cd = useCountdown(isTimed ? mod?.durationSec : 60);
  const startedAtRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const prevPageRef = useRef(1);
  const timesRef = useRef({}); // { qid: seconds }
  const pendingResultRef = useRef(null);
  useEffect(() => {
    if (!resumeEnabled || resumeLoaded || !resumeKey || !mod || !Array.isArray(mod.questions)) return;
    try {
      const raw = localStorage.getItem(resumeKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === "object") {
          if (saved.answers && typeof saved.answers === "object") setAnswers(saved.answers);
          if (saved.flags && typeof saved.flags === "object") setFlags(saved.flags);
          if (Number.isFinite(saved.page)) {
            const maxPage = mod.questions.length || 1;
            setPage(Math.min(maxPage, Math.max(1, saved.page)));
          }
          if (saved.times && typeof saved.times === "object") timesRef.current = saved.times;
        }
      }
    } catch (e) {
      console.warn("resume load", e);
    } finally {
      setResumeLoaded(true);
    }
  }, [resumeEnabled, resumeLoaded, resumeKey, mod]);

  const persistProgress = useCallback(() => {
    if (!resumeEnabled || !resumeKey || !resumeLoaded) return;
    try {
      const payload = {
        answers,
        flags,
        page,
        times: timesRef.current,
      };
      localStorage.setItem(resumeKey, JSON.stringify(payload));
    } catch (e) {
      console.warn("resume save", e);
    }
  }, [answers, flags, page, resumeEnabled, resumeKey, resumeLoaded]);

  useEffect(() => {
    persistProgress();
  }, [answers, flags, page, persistProgress]);


  useEffect(() => {
    if (!mod) return;
    setPage(1);
    questionStartRef.current = null;
    prevPageRef.current = 1;
    timesRef.current = {};
    persistProgress();
  }, [modIdx, mod?.durationSec]);

  useEffect(() => {
    if (!mod) return;
    const duration = mod?.durationSec || 60;
    if (sectionActive) {
      cd.reset(duration);
      if (isTimed) cd.start();
      else cd.stop();
      setShowTimer(isTimed);
      questionStartRef.current = Date.now();
      prevPageRef.current = 1;
    } else {
      cd.stop();
      setShowTimer(false);
    }
  }, [sectionActive, isTimed, mod?.durationSec]);

  useEffect(() => { // auto-advance on timer end
    if (!isTimed || !sectionActive) return;
    if (cd.remaining <= 0) {
      handleNextModule();
    }
  }, [cd.remaining, isTimed, sectionActive]);

  // Track time spent per question
  useEffect(() => {
    if (!mod || !Array.isArray(mod.questions) || mod.questions.length === 0) return;
    const prev = prevPageRef.current;
    if (prev !== page) {
      const prevQ = mod.questions[prev - 1];
      if (prevQ) {
        const now = Date.now();
        const deltaSec = Math.max(0, Math.round((now - (questionStartRef.current || now)) / 1000));
        const t = timesRef.current;
        t[prevQ.id] = (t[prevQ.id] || 0) + deltaSec;
        questionStartRef.current = now;
        persistProgress();
      }
      prevPageRef.current = page;
    } else if (!questionStartRef.current) {
      questionStartRef.current = Date.now();
    }
  }, [page, mod]);

  // If launched with a resourceId and custom payload hasn't loaded yet, show a loading state
  if (practice && practice.resourceId && (!loadedCustom && (!practice.custom || !Array.isArray(practice.custom.questions) || practice.custom.questions.length === 0))) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Quiz" />
        <Card>
          <p style={{ color: "#6b7280" }}>Loading quiz…</p>
          <Btn variant="back" onClick={() => onNavigate("sat-training")}>Back</Btn>
        </Card>
      </PageWrap>
    );
  }

  if (!mod) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Quiz" />
        <Card>
          <p style={{ color: "#6b7280" }}>No module available.</p>
          <Btn variant="primary" onClick={() => onNavigate("sat-training")}>Back to Training</Btn>
        </Card>
      </PageWrap>
    );
  }

  // No questions found fallback
  if (!Array.isArray(mod.questions) || mod.questions.length === 0) {
    return (
      <PageWrap>
        <HeaderBar title={mod.title || "SAT Quiz"} />
        <Card>
          <p style={{ color: "#6b7280" }}>No questions found in this quiz.</p>
          <Btn variant="primary" onClick={() => onNavigate("sat-training")}>Back to Training</Btn>
        </Card>
      </PageWrap>
    );
  }

  const q = mod.questions[page - 1] || null;
  const percent = qCount ? Math.round((page / qCount) * 100) : 0;

  const currentAns = answers[mod.key] || {};
  const currentFlags = flags[mod.key] || {};
  const updateAnswer = (qid, val) => {
    setAnswers((s) => {
      const next = { ...(s[mod.key] || {}) };
      if (val === null || val === undefined) {
        delete next[qid];
      } else {
        next[qid] = val;
      }
      return { ...s, [mod.key]: next };
    });
  };
  const toggleFlag = (qid) => setFlags((s) => ({ ...s, [mod.key]: { ...(s[mod.key] || {}), [qid]: !((s[mod.key] || {})[qid]) } }));

  const handleNextModule = () => {
    if (modIdx + 1 < totalMods) {
      captureCurrentQuestionTime();
      setSectionActive(false);
      setModIdx(modIdx + 1);
    } else {
      prepareSubmit();
    }
  };

  const isAnswerCorrect = (question, value) => {
    if (!question) return false;
    if (value === null || value === undefined || value === '') return false;
    const type = question.answerType || ((Array.isArray(question.choices) && question.choices.length > 0) ? 'choice' : 'numeric');
    if (type === 'numeric') {
      const valStr = String(value).trim();
      if (!valStr) return false;
      const correctStr = String(question.correct ?? '').trim();
      if (!correctStr) return false;
      if (valStr === correctStr) return true;
      const valNum = Number(valStr);
      const correctNum = Number(correctStr);
      if (!Number.isNaN(valNum) && !Number.isNaN(correctNum)) return valNum === correctNum;
      return false;
    }
    const picked = String(value || '').trim().toUpperCase();
    const correct = String(question.correct || '').trim().toUpperCase();
    return Boolean(picked) && Boolean(correct) && picked === correct;
  };

  const scoreSummary = () => {
    // Simple baseline scoring: count correct per module
    const summary = { rw: { correct: 0, total: 0 }, math: { correct: 0, total: 0 } };
    modules.forEach((m) => {
      const isRW = m.key.startsWith("rw");
      const a = answers[m.key] || {};
      m.questions.forEach((q) => {
        const t = isRW ? summary.rw : summary.math;
        t.total += 1;
       if (isAnswerCorrect(q, a[q.id])) t.correct += 1;
      });
    });
    return summary;
  };

  const aggregatePercentsBy = (getKey) => {
    const totals = { rw: {}, math: {} };
    modules.forEach((m) => {
      const section = m.key.startsWith("rw") ? "rw" : "math";
      const a = answers[m.key] || {};
      (m.questions || []).forEach((q) => {
        const key = getKey(q, section);
        if (!key) return;
        const bucket = totals[section][key] || { correct: 0, total: 0 };
        bucket.total += 1;
        if (isAnswerCorrect(q, a[q.id])) bucket.correct += 1;
        totals[section][key] = bucket;
      });
    });
    const out = {};
    Object.entries(totals).forEach(([section, map]) => {
      out[section] = {};
      Object.entries(map).forEach(([key, data]) => {
        out[section][key] = data.total ? Math.round((data.correct / data.total) * 100) : 0;
      });
    });
    return out;
  };

  const captureCurrentQuestionTime = () => {
    try {
      if (mod && Array.isArray(mod.questions)) {
        const curQ = mod.questions[Math.max(0, page - 1)];
        if (curQ) {
          const now = Date.now();
          const deltaSec = Math.max(0, Math.round((now - (questionStartRef.current || now)) / 1000));
          timesRef.current[curQ.id] = (timesRef.current[curQ.id] || 0) + deltaSec;
          questionStartRef.current = now;
          persistProgress();
        }
      }
    }
    catch {}
  };

  const prepareSubmit = () => {
    if (summaryModal.open) return;
    const finishedAt = Date.now();
    try { cd.stop(); } catch {}
    const elapsedSec = Math.round((finishedAt - startedAtRef.current) / 1000);
    captureCurrentQuestionTime();
    const summary = scoreSummary();
    const skillPercents = aggregatePercentsBy((q, section) => {
      if (section !== "rw") return null;
      return q.skillKey || normalizeEnglishSkill(q.skill || "").key;
    });
    const difficultyPercents = aggregatePercentsBy((q, section) => {
      if (section !== "rw") return null;
      return q.difficultyKey || normalizeDifficulty(q.difficulty || "");
    });
    let totalCorrect = 0;
    let totalQuestions = 0;
    modules.forEach((m) => {
      const a = answers[m.key] || {};
      (m.questions || []).forEach((q) => {
        totalQuestions += 1;
        if (isAnswerCorrect(q, a[q.id])) totalCorrect += 1;
      });
    });
    const avgSec = totalQuestions ? Math.round(elapsedSec / totalQuestions) : 0;
    const stats = { totalCorrect, totalQuestions, avgSec };
    pendingResultRef.current = { finishedAt, elapsedSec, summary, stats, skillPercents, difficultyPercents };
    setSummaryModal({ open: true, stats });
  };

  const finalizeSubmit = async () => {
    if (!pendingResultRef.current) {
      prepareSubmit();
      return;
    }
    const { elapsedSec, summary, stats, skillPercents, difficultyPercents } = pendingResultRef.current;
    try { cd.stop(); } catch {}
    setIsSubmitting(true);
    try {
      if (practice) {
        const { saveSatTraining } = await import("../../lib/supabaseStorage.js");
        const ansMap = answers[mod.key] || {};
        const correctMap = {};
        try {
          (mod.questions || []).forEach((q) => {
            if (q && q.id && q.correct != null) {
              correctMap[q.id] = String(q.correct);
            }
          });
        } catch {}
        const practiceKind = practice.kind || mod?.kind || 'classwork';
        const practiceMeta = mergePracticeMeta(practiceKind, practice.meta || mod?.meta || loadedCustom?.meta, mod?.durationSec);
        await saveSatTraining({
          kind: practiceKind,
          section: practice.section || null,
          unit: practice.unit || null,
          lesson: practice.lesson || null,
          summary,
          answers: {
            choices: ansMap,
            times: timesRef.current || {},
            correct: correctMap,
            resourceId: practice.resourceId || null,
            className: practice.className || null,
            meta: practiceMeta,
            status: "completed",
            durationSec: practiceMeta.durationSec,
            elapsedSec,
            attempt: practice.attemptIndex ?? null,
          },
          elapsedSec,
          resourceId: practice.resourceId || null,
          className: practice.className || null,
          status: "completed",
          meta: practiceMeta,
          durationSec: practiceMeta.durationSec,
          attempt: practice.attemptIndex ?? null,
        });

        if (resumeKey) {
          try { localStorage.removeItem(resumeKey); } catch {}
        }

        const isResourceAttempt = Boolean(practice.resourceId || (practice.custom && Array.isArray(practice.custom.questions)));
        const sourceQuestions = isResourceAttempt
          ? ((practice.custom && Array.isArray(practice.custom.questions)) ? practice.custom.questions : (modules[0]?.questions || []))
          : [];

        if (isResourceAttempt && Array.isArray(sourceQuestions) && sourceQuestions.length) {
          const qs = sourceQuestions;
          const bySkill = new Map();
          const a = answers[modules[0]?.key || "custom"] || {};
          qs.forEach((q) => {
            const label = (q.skill || "").trim() || "General";
            const rec = bySkill.get(label) || { label, correct: 0, total: 0 };
            rec.total += 1;
            if (isAnswerCorrect(q, a[q.id])) rec.correct += 1;
            bySkill.set(label, rec);
          });
          const count = qs.length;
          setSummaryModal({ open: false, stats: null });
          pendingResultRef.current = null;
          alert("Thanks! Your responses were submitted.");
          onNavigate("sat-training");
          return;
        }
        setSummaryModal({ open: false, stats: null });
        pendingResultRef.current = null;
        onNavigate('sat-training');
      } else {
        const moduleMeta = modules.map((m) => ({ key: m.key, title: m.title, count: m.questions.length }));
        if (previewMode) {
          const previewSubmission = {
            ts: new Date().toISOString(),
            participant: { name: "Admin Preview" },
            pillar_agg: { summary, skills: skillPercents, difficulty: difficultyPercents },
            pillar_counts: { modules: moduleMeta, elapsedSec },
            meta: { preview: true },
          };
          pendingResultRef.current = null;
          onNavigate('sat-results', { submission: previewSubmission });
          return;
        }
        await saveSatResult({
          summary,
          skills: skillPercents,
          difficulty: difficultyPercents,
          answers,
          modules: moduleMeta,
          elapsedSec,
        });
        pendingResultRef.current = null;
        setSummaryModal({ open: false, stats: null });
        alert("Thanks! Your responses were submitted.");
        onNavigate('sat-training');
      }
    } catch (e) {
      console.error("SAT save failed:", e);
      alert(e?.message || String(e));
      } finally {
      setIsSubmitting(false);
    }
  };
  const cancelSummary = () => {
    setSummaryModal({ open: false, stats: null });
    pendingResultRef.current = null;
    questionStartRef.current = Date.now();
    try { cd.start(); } catch {}
  };

  const fmtSeconds = (sec) => {
    const total = Number.isFinite(sec) ? Math.max(0, sec) : 0;
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    if (minutes && seconds) return `${minutes}m ${seconds}s`;
    if (minutes) return `${minutes}m`;
    return `${seconds}s`;
  };

  // Helpers
  const letter = (i) => String.fromCharCode(65 + i); // 0 -> A

  const openOverlay = (title, message) => setOverlay({ open: true, title, message });
  const closeOverlay = () => setOverlay((o) => ({ ...o, open: false }));

  const previewBanner = previewMode ? (
    <Card style={{ border: "1px solid #f97316", background: "#fff7ed", color: "#9a3412", marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Admin Preview Mode</div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        This run is for testing only. Responses are not saved to Supabase, but you can complete the full flow to verify questions, timers, and scoring.
      </p>
    </Card>
  ) : null;

  if (!sectionActive) {
    return (
      <PageWrap>
        {previewBanner}
        <Card>
          <h3 style={{ marginTop: 0 }}>{mod.title || "Next Section"}</h3>
          <p style={{ color: "#6b7280" }}>
            Take a short break. When you are ready, begin the next section to continue the diagnostic.
          </p>
          <Btn variant="primary" onClick={() => setSectionActive(true)} style={{ marginTop: 12 }}>
            Begin {mod.title || "Next Section"}
          </Btn>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      {previewBanner}
      {/* Bluebook-style header */}
      <div style={{ padding: "6px 0 4px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 12,
        }}>
          {/* Left: Section title with Directions underneath */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 700, color: "#111827" }}>{mod.title}</div>
            <div>
              <button
                type="button"
                onClick={() => openOverlay("Directions", "Read each question carefully and choose the best answer. You may mark items for review and return before submitting the section.")}
                style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
              >
                Directions ▾
              </button>
            </div>
          </div>

          {/* Center: Timer + Hide */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#111827", minHeight: 24 }}>
              {isTimed ? (showTimer ? cd.fmt(cd.remaining) : "—") : "Untimed"}
            </div>
            <div style={{ marginTop: 6 }}>
              {isTimed ? (
                <button
                  type="button"
                  onClick={() => setShowTimer((v) => !v)}
                  style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 999, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}
                >
                  {showTimer ? "Hide" : "Show"}
                </button>
              ) : (
                <span style={{ color: "#6b7280", fontSize: 12 }}>No timer</span>
              )}
            </div>
          </div>

          {/* Right: Annotate / More */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => openOverlay("Annotate", "Annotation tools are coming soon.")} style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Annotate</button>
            <button type="button" onClick={() => openOverlay("More", "Additional options are coming soon.")} style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>More</button>
          </div>
        </div>
        <div style={{ borderTop: "2px dashed #d1d5db", marginTop: 8, marginBottom: 8 }} />
      </div>

      {/* Bluebook-like split layout with center divider */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 0, minHeight: 420 }}>
        {/* Left: Passage + Stem */}
        <div style={{ paddingRight: 16 }}>
          <div style={{ marginBottom: 8, color: "#6b7280", fontSize: 13 }}>Question {page} of {qCount}</div>
          {q?.passage && showPassage && (
            <div style={{ marginBottom: 12, padding: 14, background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 8, color: "#374151" }}>
              {renderMathText(q.passage)}
            </div>
          )}
          <div>
            <div style={{ margin: 0, color: "#111827", lineHeight: 1.5, fontWeight: 500, fontSize: 14 }}>
              {renderMathText(q?.text || "No question available.")}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ background: "#e5e7eb", width: 1 }} />

        {/* Right: Answers card */}
        <div style={{ paddingLeft: 16 }}>
          {q && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 700, border: "1px solid #d1d5db", borderRadius: 8, padding: "4px 8px" }}>
                  {page}
                </div>
                <button
                  type="button"
                  onClick={() => toggleFlag(q.id)}
                  style={{ border: "1px solid #d1d5db", background: currentFlags[q.id] ? "#fef3c7" : "#fff", color: "#374151", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
                  title="Mark for Review"
                >
                  {currentFlags[q.id] ? "Marked for Review" : "Mark for Review"}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
             {(() => {
            const hasChoices = Array.isArray(q?.choices) && q.choices.some((ch) => ch && ch.label);
            const type = q?.answerType || (hasChoices ? "choice" : "numeric");
            if (type === "text") {
              const value = currentAns[q.id] ?? "";
              return (
                <div style={{ display: "grid", gap: 6 }}>
                  <label htmlFor={`text_${q.id}`} style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>Enter your answer</label>
                  <input
                    id={`text_${q.id}`}
                    type="text"
                    value={value}
                    onChange={(e) => {
                      const raw = e.target.value;
                      updateAnswer(q.id, raw === "" ? null : raw);
                    }}
                    style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #2563eb", fontSize: 16 }}
                  />
                </div>
              );
            }
            if (type === "numeric" || !hasChoices) {
              const value = currentAns[q.id] ?? "";
              return (
                <div style={{ display: "grid", gap: 6 }}>
                  <label htmlFor={`numeric_${q.id}`} style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>Enter your answer</label>
                  <input
                    id={`numeric_${q.id}`}
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => {
                      const raw = e.target.value;
                      updateAnswer(q.id, raw === "" ? null : raw);
                    }}
                    style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #2563eb", fontSize: 16 }}
                  />
                </div>
              );
            }
            return (q?.choices || []).map((ch, idx) => {
                const isSelected = currentAns[q.id] === ch.value;
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => updateAnswer(q.id, ch.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      width: "100%", padding: "12px 14px",
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? "#2563eb" : "#d1d5db"}`,
                      background: isSelected ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: 999,
                      border: `2px solid ${isSelected ? "#2563eb" : "#9ca3af"}`,
                      color: isSelected ? "#2563eb" : "#374151",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                      background: isSelected ? "#dbeafe" : "#fff",
                    }}>
                      {letter(idx)}
                    </span>
                    <span style={{ color: "#111827" }}>
                      {renderMathText(ch.label || ch.text || ch.value)}
                    </span>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </div>

      <SATFooterBar
        userLabel={(authUser?.user_metadata?.name || authUser?.email || " ")}
        questionLabel={`Question ${Math.min(page, qCount || 0)} of ${qCount || 0}`}
        onTogglePalette={() => setShowPalette((v) => !v)}
        onBack={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(qCount, p + 1))}
        onFinish={handleNextModule}
        canBack={page !== 1}
        canNext={page < qCount}
        isLast={page >= qCount}
      />      {showPalette && (
        <PaletteOverlay
          totalQuestions={qCount}
          currentIndex={page}
          onJump={(idx1) => { setPage(idx1); setShowPalette(false); }}
          onClose={() => setShowPalette(false)}
          answeredIndexes={(function() {
            const set = new Set();
            for (let i = 0; i < qCount; i++) {
              const qid = mod.questions[i]?.id;
              if (qid && currentAns[qid] != null) set.add(i + 1);
            }
            return set;
          })()}
          flaggedIndexes={(function() {
            const set = new Set();
            for (let i = 0; i < qCount; i++) {
              const qid = mod.questions[i]?.id;
              if (qid && currentFlags[qid]) set.add(i + 1);
            }
            return set;
          })()}
        />
      )}

{summaryModal.open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={cancelSummary}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 12px 30px rgba(15,23,42,0.25)", width: "min(520px, 92vw)", padding: 20, display: "grid", gap: 14 }}
          >
            <h3 style={{ margin: 0, color: "#111827" }}>Ready to Submit?</h3>
            {(() => {
              const stats = summaryModal.stats || { totalCorrect: 0, totalQuestions: 0, avgSec: 0 };
              return (
                <div style={{ color: "#374151", fontSize: 15, lineHeight: 1.6 }}>
                  <div><strong>Total correct:</strong> {stats.totalCorrect}</div>
                  <div><strong>Total questions:</strong> {stats.totalQuestions}</div>
                  <div><strong>Average time per question:</strong> {fmtSeconds(stats.avgSec)}</div>
                </div>
              );
            })()}
            <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
              {previewMode ? "Submit to finish your preview and view the score breakdown (nothing will be saved)." : "Submit to save your work and view detailed results."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={cancelSummary}
                disabled={isSubmitting}
                style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={finalizeSubmit}
                disabled={isSubmitting}
                style={{ border: "none", background: "#2563eb", color: "#fff", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}
              >
                {isSubmitting ? "Submitting…" : "Submit & View Results"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic overlay modal for header buttons */}
      {overlay.open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={closeOverlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 10px 24px rgba(0,0,0,0.12)", width: "min(560px, 90vw)", padding: 16 }}
          >
            <h3 style={{ marginTop: 0, color: "#111827" }}>{overlay.title}</h3>
            <p style={{ color: "#374151" }}>{overlay.message}</p>
            <p style={{ color: "#6b7280", fontSize: 13 }}>Tap Close to return to your test.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={closeOverlay} style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </PageWrap>
  );
}







