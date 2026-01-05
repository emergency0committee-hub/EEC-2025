// Shared SAT test/practice interface
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card, ProgressBar } from "../../../components/Layout.jsx";
import Btn from "../../../components/Btn.jsx";
import { SATFooterBar } from "../SATLayout.jsx";
import PaletteOverlay from "../../test/PaletteOverlay.jsx";
import useCountdown from "../../../hooks/useCountdown.js";
import "katex/dist/katex.min.css";

import { saveSatResult, saveSatTraining, saveSatAnswerRows } from "../../../lib/supabaseStorage.js";
import { loadRWModules, loadMathModules, MATH_MODULES, normalizeEnglishSkill, normalizeDifficulty } from "../../../sat/questions.js";
import { renderMathText } from "../../../lib/mathText.jsx";
import { fetchQuestionBankByIds } from "../../../lib/assignmentQuestions.js";
import { supabase } from "../../../lib/supabase.js";
import { BANKS, mapBankQuestionToResource } from "../../../lib/questionBanks.js";
import {
  startLiveTestSession,
  updateLiveTestSession,
  completeLiveTestSession,
} from "../../../lib/liveTestSessions.js";

const LIVE_TEST_TABLE = (import.meta.env.VITE_LIVE_TEST_TABLE || "cg_live_test_sessions").trim();

const TRAINING_KIND_WHITELIST = ["classwork", "homework", "quiz", "lecture", "test"];
const normalizeTrainingKind = (value) => {
  const str = String(value || "").trim().toLowerCase();
  if (TRAINING_KIND_WHITELIST.includes(str)) return str;
  if (["exam", "diagnostic", "sat", "assessment"].includes(str)) return "test";
  if (["practice", "session"].includes(str)) return "classwork";
  return "classwork";
};

const compareAnswer = (expected, actual) => {
  if (expected == null || expected === "") return null;
  if (actual == null || actual === "") return false;
  const norm = (val) => String(val).trim().toLowerCase();
  const expectedList = String(expected)
    .split(/[\n\r,;|]+/)
    .map((e) => norm(e))
    .filter(Boolean);
  if (expectedList.length === 0) return null;
  const actualNorm = norm(actual);
  return expectedList.includes(actualNorm);
};

export default function SATTestInterface({
  onNavigate,
  practice = null,
  preview = false,
  mode = "exam",
  examSections = null,
  contextTitle = null,
  testType = null,
}) {
  SATTestInterface.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    practice: PropTypes.object,
    preview: PropTypes.bool,
    mode: PropTypes.oneOf(["exam", "assignment", "practice"]),
    examSections: PropTypes.arrayOf(PropTypes.string),
    contextTitle: PropTypes.string,
    testType: PropTypes.string,
  };

  const previewMode = Boolean(preview || practice?.preview);
  const resolvedContextTitle = contextTitle || "SAT Diagnostic";
  const resolvedTestType = (testType || "diagnostic").toString().trim().toLowerCase();
  const [sessionPaused, setSessionPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  // Disable text selection/copy during the SAT test
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const prevUserSelect = document.body.style.userSelect;
    const prevWebkit = document.body.style.webkitUserSelect;
    const prevMoz = document.body.style.MozUserSelect;
    const prevMs = document.body.style.msUserSelect;
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.body.style.MozUserSelect = "none";
    document.body.style.msUserSelect = "none";
    return () => {
      document.body.style.userSelect = prevUserSelect;
      document.body.style.webkitUserSelect = prevWebkit;
      document.body.style.MozUserSelect = prevMoz;
      document.body.style.msUserSelect = prevMs;
    };
  }, []);

  // Require auth
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const pauseRequestedRef = useRef(false);
  const requestPause = useCallback(
    (reason) => {
      if (previewMode) return;
      pauseRequestedRef.current = true;
      setPauseReason(reason || "left");
      setSessionPaused(true);
    },
    [previewMode]
  );
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onVis = () => { if (document.hidden) requestPause("tab"); };
    const onBlur = () => requestPause("blur");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [requestPause]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try { const { data: { user } } = await supabase.auth.getUser(); if (alive) setAuthUser(user || null); }
      finally { if (alive) setAuthLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    pauseRequestedRef.current = false;
    setSessionPaused(false);
    setPauseReason("");
  }, [authUser?.id, previewMode]);
  useEffect(() => {
    if (!authUser?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("email,name,full_name,username,school,school_name,organization,org,company,class_name,phone")
          .eq("email", authUser.email)
          .maybeSingle();
        if (!cancelled && !error && data) {
          setProfile(data);
        }
        if (!cancelled && error) {
          console.warn("profile fetch failed", error);
        }
      } catch (err) {
        if (!cancelled) console.warn("profile fetch failed", err);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser]);
  // Build modules [RW1, RW2, M1, M2]
  const [rwMods, setRwMods] = useState([[], []]);
  const [mathMods, setMathMods] = useState([[], []]);
  const [mathPool, setMathPool] = useState([]);
  const [mathSectionQuestions, setMathSectionQuestions] = useState([[], []]); // [section1, section2]

  const normalizedExamSections = useMemo(() => {
    if (!Array.isArray(examSections) || examSections.length === 0) return null;
    return new Set(examSections.map((s) => String(s || "").trim().toUpperCase()).filter(Boolean));
  }, [examSections]);

  const includeRW =
    !normalizedExamSections ||
    normalizedExamSections.has("RW") ||
    normalizedExamSections.has("ENGLISH") ||
    normalizedExamSections.has("READING");

  const includeMath = !normalizedExamSections || normalizedExamSections.has("MATH");

  const readingCompetitionTable =
    import.meta.env.VITE_SAT_READING_COMPETITION_TABLE ||
    import.meta.env.VITE_SAT_RW_TABLE ||
    import.meta.env.VITE_DIAGNOSTIC_BANK_TABLE ||
    "cg_sat_diagnostic_questions";

  useEffect(() => {
    let cancelled = false;
    if (!includeRW) {
      setRwMods([[], []]);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const tableOverride = resolvedTestType === "reading_competition" ? readingCompetitionTable : null;
        const rw = await loadRWModules(tableOverride ? { table: tableOverride } : undefined);
        if (!cancelled) setRwMods(rw);
      } catch (err) {
        console.warn("Failed to load RW modules", err);
        if (!cancelled) setRwMods([[], []]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [includeRW, resolvedTestType, readingCompetitionTable]);

  useEffect(() => {
    let cancelled = false;
    if (!includeMath) {
      setMathMods([[], []]);
      setMathPool([]);
      setMathSectionQuestions([[], []]);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const math = await loadMathModules();
        if (!cancelled) setMathMods(math);
      } catch (err) {
        console.warn("Failed to load math modules", err);
        if (!cancelled) setMathMods([[], []]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [includeMath]);
  useEffect(() => {
    // Load full diagnostic math pool (we need buckets by difficulty)
    (async () => {
      if (!includeMath) return;
      try {
        const table = import.meta.env.VITE_DIAGNOSTIC_BANK_TABLE || "cg_sat_diagnostic_questions";
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("subject", "MATH")
          .limit(500);
        if (error) {
          console.warn("Load diagnostic math pool failed", error.message || error);
          return;
        }
        const mapped = (data || []).map((row, idx) => {
          const qtext = String(row.question || "").trim();
          if (!qtext) return null;
          const qTypeRaw = String(row.question_type || row.type || "").toLowerCase();
          const isFill = qTypeRaw === "fill";
          const choices = isFill
            ? []
            : [
                { value: "A", label: row.answer_a || row.answerA || "" },
                { value: "B", label: row.answer_b || row.answerB || "" },
                { value: "C", label: row.answer_c || row.answerC || "" },
                { value: "D", label: row.answer_d || row.answerD || "" },
              ].filter((ch) => String(ch.label || "").trim().length > 0);
          const correctRaw = String(row.correct || row.correct_answer || "").trim();
          const skillInfo = normalizeMathSkill(row.skill || row.lesson || row.unit || "");
          return {
            id: row.id || `math_diag_${idx}`,
            text: qtext,
            passage: row.passage || null,
            choices,
            correct: correctRaw || null,
            answerType: isFill ? "text" : "choice",
            skill: row.skill || "",
            skillKey: skillInfo?.lessonKey || null,
            unitKey: skillInfo?.unitKey || null,
            difficulty: row.difficulty || row.hardness || "",
            difficultyKey: normalizeDifficulty(row.difficulty || row.hardness || ""),
          };
        }).filter(Boolean);
        setMathPool(mapped);
      } catch (err) {
        console.warn("Failed to load diagnostic math pool", err);
      }
    })();
  }, [includeMath]);
  const [loadedCustom, setLoadedCustom] = useState(null); // { questions, durationSec, title, meta, kind }
  const reviewOnly = Boolean(practice?.reviewOnly);
  const practiceDeadlineIso =
    practice?.deadline ||
    practice?.meta?.deadline ||
    practice?.custom?.meta?.deadline ||
    null;
  const deadlineDate = practiceDeadlineIso ? new Date(practiceDeadlineIso) : null;
  const deadlineLabel =
    deadlineDate && !Number.isNaN(deadlineDate.getTime()) ? deadlineDate.toLocaleString() : null;

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
      const rawType = String(q.question_type || q.type || q.answerType || "").toLowerCase();
      const isFill = rawType.startsWith("f") || rawType === "text";
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
        answerType: q.answerType || (isFill ? "text" : (hasChoices ? "choice" : "numeric")),
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

  const sampleQuestions = useCallback((pool = [], count = 22, excludeIds = new Set(), fallback = []) => {
    const filtered = pool.filter((q) => !excludeIds.has(q.id));
    const merged = filtered.length >= count ? filtered : filtered.concat(fallback.filter((q) => !excludeIds.has(q.id)));
    const arr = merged.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.min(count, arr.length));
  }, []);

  const mathBuckets = useMemo(() => {
    const easy = [];
    const medium = [];
    const hard = [];
    mathPool.forEach((q) => {
      const diff = normalizeDifficulty(q.difficulty || q.difficultyKey || "");
      if (diff === "hard") hard.push(q);
      else if (diff === "medium") medium.push(q);
      else easy.push(q);
    });
    return { easy, medium, hard };
  }, [mathPool]);

  useEffect(() => {
    if (!mathBuckets.medium.length) return;
    const first = sampleQuestions(mathBuckets.medium, 22);
    const exclude = new Set(first.map((q) => q.id));
    const second = sampleQuestions(mathBuckets.easy, 22, exclude, mathBuckets.medium);
    setMathSectionQuestions([first, second]);
  }, [mathBuckets, sampleQuestions]);

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
        const m = mathMods[0] && mathMods[0].length ? mathMods[0] : (MATH_MODULES[0] || []);
        const meta = mergePracticeMeta(practice.kind || 'classwork', practice.meta, 15 * 60);
        return [{ key: 'pm', title: 'Math Practice', durationSec: meta.durationSec, questions: m, meta, kind: practice.kind || 'classwork' }];
      }
      const meta = mergePracticeMeta(practice.kind || 'classwork', practice.meta, 15 * 60);
      return [{ key: 'prw', title: 'Reading & Writing Practice', durationSec: meta.durationSec, questions: (rwMods[0] || []).slice(0, 10), meta, kind: practice.kind || 'classwork' }];
    }
    const fullModules = [
      { key: "rw1", title: "Reading & Writing - Module 1", durationSec: 35 * 60, questions: rwMods[0] || [] },
      { key: "rw2", title: "Reading & Writing - Module 2", durationSec: 35 * 60, questions: rwMods[1] || [] },
      {
        key: "m1",
        title: "Math - Module 1",
        durationSec: 35 * 60,
        questions:
          (mathSectionQuestions[0] && mathSectionQuestions[0].length ? mathSectionQuestions[0] : null) ||
          (mathMods[0] && mathMods[0].length ? mathMods[0] : (MATH_MODULES[0] || [])),
      },
      {
        key: "m2",
        title: "Math - Module 2",
        durationSec: 35 * 60,
        questions:
          (mathSectionQuestions[1] && mathSectionQuestions[1].length ? mathSectionQuestions[1] : null) ||
          (mathMods[1] && mathMods[1].length ? mathMods[1] : (MATH_MODULES[1] || [])),
      },
    ];
    if (Array.isArray(examSections) && examSections.length) {
      const normalized = new Set(examSections.map((s) => String(s || "").trim().toUpperCase()).filter(Boolean));
      const includeRW = normalized.has("RW") || normalized.has("ENGLISH") || normalized.has("READING");
      const includeMath = normalized.has("MATH");
      const filtered = fullModules.filter((m) => {
        const isRW = m.key.startsWith("rw");
        return isRW ? includeRW : includeMath;
      });
      return filtered.length ? filtered : fullModules;
    }
    return fullModules;
  }, [rwMods, practice, loadedCustom, mathSectionQuestions, mathMods, examSections]);

  const [modIdx, setModIdx] = useState(0);
  const mod = modules[modIdx];
  const totalMods = modules.length;
  const isTimed = !previewMode && !reviewOnly && Number.isFinite(mod?.durationSec) && mod.durationSec > 0;
  const resumeEnabled = Boolean(practice?.meta?.resumeMode === "resume" && practice?.resourceId);
    const resumeKey = resumeEnabled ? `cg_sat_resume_${practice.resourceId}` : null;
    const [answers, setAnswers] = useState({}); // { modKey: { qid: value } }
    const updateAnswerRef = useRef(null);
    const handleNextModuleRef = useRef(null);
    const [liveSessionId, setLiveSessionId] = useState(null);
    const liveUpdateRef = useRef({ lastSentAt: 0, lastCount: -1 });

  const [pendingReviewAnswers, setPendingReviewAnswers] = useState(null);
  const [resumeLoaded, setResumeLoaded] = useState(!resumeEnabled);
  const [reviewAnswersLoaded, setReviewAnswersLoaded] = useState(!reviewOnly);
  const [flags, setFlags] = useState({}); // { modKey: { qid: true } }
  const [showPalette, setShowPalette] = useState(false);
  const [showPassage, setShowPassage] = useState(true);
  const [showTimer, setShowTimer] = useState(() => isTimed);
  const [page, setPage] = useState(1);
  const [overlay, setOverlay] = useState({ open: false, title: "", message: "" });
  const [summaryModal, setSummaryModal] = useState({ open: false, stats: null, reason: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectionActive, setSectionActive] = useState(true);
  const [finalTimeout, setFinalTimeout] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => {
      setIsNarrow(window.innerWidth <= 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 900 : false));

  useEffect(() => {
    if (!reviewOnly || reviewAnswersLoaded) return;
    if (!practice?.resourceId) return;
    if (!authUser?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
        const { data, error } = await supabase
          .from(tTable)
          .select("answers")
          .eq("resource_id", practice.resourceId)
          .eq("user_email", authUser.email)
          .order("ts", { ascending: false })
          .limit(1);
        if (!cancelled && !error && data && data.length) {
          const saved = data[0]?.answers?.choices || {};
          setPendingReviewAnswers(saved || {});
        }
      } catch (err) {
        if (!cancelled) console.warn("review answer fetch", err);
      } finally {
        if (!cancelled) setReviewAnswersLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewOnly, reviewAnswersLoaded, practice?.resourceId, authUser?.email]);

  useEffect(() => {
    if (!pendingReviewAnswers) return;
    if (!mod?.key) return;
    setAnswers((prev) => ({ ...prev, [mod.key]: pendingReviewAnswers }));
    setPendingReviewAnswers(null);
  }, [pendingReviewAnswers, mod]);
  const qCount = mod?.questions?.length || 0;
    const cd = useCountdown(isTimed ? mod?.durationSec : 60);
    const startedAtRef = useRef(Date.now());
    const questionStartRef = useRef(Date.now());
    const prevPageRef = useRef(1);
    const timesRef = useRef({}); // { qid: seconds }
    const pendingResultRef = useRef(null);

    const totalQuestionsCount = useMemo(
      () => modules.reduce((sum, m) => sum + (m?.questions?.length || 0), 0),
      [modules]
    );
    const answeredCount = useMemo(() => {
      return Object.values(answers || {}).reduce((sum, modAns) => {
        if (!modAns || typeof modAns !== "object") return sum;
        return sum + Object.keys(modAns).length;
      }, 0);
    }, [answers]);
    const enableLiveSession = !previewMode && !practice;
    const liveTestType =
      resolvedTestType === "reading_competition" ? "sat_reading_competition" : "sat_diagnostic";
    const participantName =
      profile?.name ||
      profile?.full_name ||
      profile?.username ||
      authUser?.user_metadata?.name ||
      authUser?.email ||
      null;
    const participantSchool =
      profile?.school ||
      profile?.school_name ||
      profile?.organization ||
      profile?.org ||
      profile?.company ||
      null;

    useEffect(() => {
      if (!enableLiveSession || !authUser?.id) return;
      let cancelled = false;
      (async () => {
        try {
          const session = await startLiveTestSession({
            userId: authUser.id,
            userEmail: authUser.email || profile?.email || null,
            name: participantName,
            school: participantSchool,
            className: profile?.class_name || null,
            testType: liveTestType,
            totalQuestions: totalQuestionsCount,
            startedAt: new Date(startedAtRef.current || Date.now()).toISOString(),
          });
          if (!cancelled && session?.sessionId) {
            setLiveSessionId(session.sessionId);
          }
        } catch (err) {
          console.warn("live session start", err);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [
      enableLiveSession,
      authUser?.id,
      authUser?.email,
      participantName,
      participantSchool,
      profile?.email,
      profile?.class_name,
      liveTestType,
      totalQuestionsCount,
    ]);

    useEffect(() => {
      if (!enableLiveSession || !liveSessionId || sessionPaused) return;
      const now = Date.now();
      const last = liveUpdateRef.current;
      if (answeredCount === last.lastCount && now - last.lastSentAt < 15000) return;
      liveUpdateRef.current = { lastCount: answeredCount, lastSentAt: now };
      updateLiveTestSession(liveSessionId, {
        answered_count: answeredCount,
        total_questions: totalQuestionsCount,
        status: "in_progress",
      }).catch((err) => {
        console.warn("live session update", err);
      });
    }, [enableLiveSession, liveSessionId, answeredCount, totalQuestionsCount, sessionPaused]);

    useEffect(() => {
      if (!enableLiveSession || !liveSessionId || !sessionPaused) {
        if (!sessionPaused) pauseRequestedRef.current = false;
        return;
      }
      if (!pauseRequestedRef.current) return;
      updateLiveTestSession(liveSessionId, {
        status: "paused",
      })
        .then(() => {
          pauseRequestedRef.current = false;
        })
        .catch((err) => {
          console.warn("live session pause", err);
        });
    }, [enableLiveSession, liveSessionId, sessionPaused]);

    useEffect(() => {
      if (!enableLiveSession || !liveSessionId) return;
      let active = true;
      const poll = async () => {
        try {
          const { data, error } = await supabase
            .from(LIVE_TEST_TABLE)
            .select("status")
            .eq("id", liveSessionId)
            .maybeSingle();
          if (!active) return;
          if (error) throw error;
          const status = data?.status || "";
          if (status === "paused") {
            pauseRequestedRef.current = false;
            setSessionPaused(true);
          } else if (status === "in_progress") {
            if (!pauseRequestedRef.current) {
              setSessionPaused(false);
              setPauseReason("");
            }
          }
        } catch (err) {
          console.warn("live session poll", err);
        }
      };
      poll();
      const t = setInterval(poll, 5000);
      return () => {
        active = false;
        clearInterval(t);
      };
    }, [enableLiveSession, liveSessionId]);

    useEffect(() => {
      if (sessionPaused) {
        cd.stop();
        return;
      }
      if (sectionActive && isTimed) {
        cd.start();
      }
    }, [sessionPaused, sectionActive, isTimed, cd.start, cd.stop]);

    const isMathSection = useMemo(() => {
      if (!mod) return false;
      const key = String(mod.key || "").toLowerCase();
    if (key.startsWith("m")) return true;
    const title = String(mod.title || "").toLowerCase();
    if (title.includes("math")) return true;
    const subject = String(
      mod.meta?.subject ||
        practice?.meta?.subject ||
        practice?.custom?.meta?.subject ||
        practice?.section ||
        "",
    ).toLowerCase();
    return subject.includes("math");
  }, [mod, practice]);
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
    setFinalTimeout(false);
    setPage(1);
    questionStartRef.current = null;
    prevPageRef.current = 1;
    timesRef.current = {};
    persistProgress();
  }, [modIdx, mod?.durationSec]);

  useEffect(() => {
    if (!isMathSection) {
      setShowCalculator(false);
    }
  }, [isMathSection, modIdx]);

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
    if (!isTimed || !sectionActive || finalTimeout) return;
    if (cd.remaining <= 0) {
      if (modIdx + 1 < totalMods) {
        handleNextModule();
      } else {
        handleNextModule("timeout");
      }
    }
  }, [cd.remaining, isTimed, sectionActive, modIdx, totalMods, finalTimeout]);

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
  if (!authLoading && !authUser) {
    return (
      <PageWrap>
        <HeaderBar title={resolvedContextTitle} />
        <Card>
          <p style={{ color: "#6b7280" }}>Please sign in to start {resolvedContextTitle}.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  if (practice && practice.resourceId && (!loadedCustom && (!practice.custom || !Array.isArray(practice.custom.questions) || practice.custom.questions.length === 0))) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Quiz" />
        <Card>
          <p style={{ color: "#6b7280" }}>Loading quizâ€¦</p>
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
    if (finalTimeout || reviewOnly) return;
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
  updateAnswerRef.current = updateAnswer;
  const toggleFlag = (qid) => {
    if (finalTimeout || reviewOnly) return;
    setFlags((s) => ({ ...s, [mod.key]: { ...(s[mod.key] || {}), [qid]: !((s[mod.key] || {})[qid]) } }));
  };

  const handleNextModule = (finishReason = "submit") => {
    if (modIdx + 1 < totalMods) {
      captureCurrentQuestionTime();
      if (mod?.key === "m1" && mathBuckets) {
        const a = answers[mod.key] || {};
        let correctCount = 0;
        (mod.questions || []).forEach((q) => {
          if (isAnswerCorrect(q, a[q.id])) correctCount += 1;
        });
        const targetBucket = correctCount >= 17 ? mathBuckets.hard : mathBuckets.easy;
        const exclude = new Set((mathSectionQuestions[0] || []).map((q) => q.id));
        const fallback =
          correctCount >= 17
            ? [...mathBuckets.medium, ...mathBuckets.easy]
            : [...mathBuckets.medium];
        const nextQs = sampleQuestions(targetBucket, 22, exclude, fallback);
        setMathSectionQuestions(([first]) => [
          first && first.length ? first : (mod.questions || []),
          nextQs,
        ]);
      }
      setSectionActive(false);
      setModIdx(modIdx + 1);
    } else {
      if (finishReason === "timeout") {
        setFinalTimeout(true);
      }
      prepareSubmit(finishReason);
    }
  };
  handleNextModuleRef.current = handleNextModule;

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

  const MATH_SKILL_MAP = {
    // Algebra
    "linear equations and inequalities": { unitKey: "algebra", lessonKey: "linear_equations" },
    "linear equations": { unitKey: "algebra", lessonKey: "linear_equations" },
    "linear functions": { unitKey: "algebra", lessonKey: "linear_functions" },
    "systems of linear equations": { unitKey: "algebra", lessonKey: "systems" },
    "systems": { unitKey: "algebra", lessonKey: "systems" },
    // PSDA
    "ratios, proportions, and percentages": { unitKey: "psda", lessonKey: "ratios" },
    "ratios": { unitKey: "psda", lessonKey: "ratios" },
    "rates": { unitKey: "psda", lessonKey: "rates" },
    "probability": { unitKey: "psda", lessonKey: "probability" },
    "data interpretation": { unitKey: "psda", lessonKey: "data_interpretation" },
    "statistics": { unitKey: "psda", lessonKey: "statistics" },
    // Advanced Math
    "rational expressions and equations": { unitKey: "adv_math", lessonKey: "rational_expressions" },
    "quadratic functions": { unitKey: "adv_math", lessonKey: "quadratic_functions" },
    "exponential functions": { unitKey: "adv_math", lessonKey: "exponential_functions" },
    "exponent rules": { unitKey: "adv_math", lessonKey: "exponent_rules" },
    "polynomial expressions": { unitKey: "adv_math", lessonKey: "polynomial_expressions" },
    // Geometry & Trig
    "angle relationships": { unitKey: "geo_trig", lessonKey: "angle_relationships" },
    "coordinate geometry": { unitKey: "geo_trig", lessonKey: "coordinate_geometry" },
    "area and perimeter": { unitKey: "geo_trig", lessonKey: "area_perimeter" },
    "right triangle trigonometry": { unitKey: "geo_trig", lessonKey: "right_triangle_trig" },
    "volume and surface area": { unitKey: "geo_trig", lessonKey: "volume_surface_area" },
  };

  const normalizeMathSkill = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return null;
    const key = raw.toLowerCase().replace(/[^a-z0-9&]+/g, " ").trim();
    return MATH_SKILL_MAP[key] || null;
  };

  const buildAnswerRows = (submissionId, savedEmail = null) => {
    if (!submissionId) return [];
    const userEmail = savedEmail || authUser?.email || null;
    const rows = [];
    modules.forEach((m) => {
      const section = m.key.startsWith("rw") ? "ENGLISH" : "MATH";
      const a = answers[m.key] || {};
      (m.questions || []).forEach((q) => {
        if (!q) return;
        const selected = a[q.id] ?? null;
        const correct = q.correct ?? q.correct_answer ?? null;
        const answerType = q.answerType || ((Array.isArray(q.choices) && q.choices.length) ? "choice" : "text");
        const timeSec = timesRef.current?.[q.id] ?? null;
        const mathSkillInfo =
          q.skillKey && q.unitKey
            ? { unitKey: q.unitKey, lessonKey: q.skillKey }
            : normalizeMathSkill(q.skill || q.lesson || q.unit || "");
        const englishSkill = normalizeEnglishSkill(q.skill || "").key || q.skill || null;
        rows.push({
          submission_id: submissionId,
          user_email: userEmail,
          module_key: m.key,
          question_id: q.id,
          question_text: q.text || q.question || q.prompt || "",
          subject: section,
          skill: section === "MATH" ? (mathSkillInfo?.lessonKey || q.skill || null) : englishSkill,
          unit: section === "MATH" ? (mathSkillInfo?.unitKey || null) : null,
          lesson: section === "MATH" ? (mathSkillInfo?.lessonKey || null) : null,
          difficulty: q.difficultyKey || normalizeDifficulty(q.difficulty || ""),
          answer_type: answerType,
          selected: selected == null ? null : String(selected),
          correct_answer: correct == null ? null : String(correct),
          is_correct: isAnswerCorrect(q, selected),
          time_sec: Number.isFinite(timeSec) ? timeSec : null,
        });
      });
    });
    return rows;
  };

  const prepareSubmit = (reason = "submit") => {
    if (summaryModal.open) return;
    const finishedAt = Date.now();
    try { cd.stop(); } catch {}
    const elapsedSec = Math.round((finishedAt - startedAtRef.current) / 1000);
    captureCurrentQuestionTime();
    const summary = scoreSummary();
    // Reading/Writing skills (flat map)
    const rwSkillPercents = aggregatePercentsBy((q, section) => {
      if (section !== "rw") return null;
      return q.skillKey || normalizeEnglishSkill(q.skill || "").key;
    }).rw || {};

    // Math skills (nested unit/lesson map)
    const mathLessonCounts = {};
    modules.forEach((m) => {
      const section = m.key.startsWith("rw") ? "rw" : "math";
      if (section !== "math") return;
      const a = answers[m.key] || {};
      (m.questions || []).forEach((q) => {
        const skillInfo = q.skillKey && q.unitKey
          ? { unitKey: q.unitKey, lessonKey: q.skillKey }
          : normalizeMathSkill(q.skill || q.lesson || q.unit || "");
        if (!skillInfo) return;
        const { unitKey, lessonKey } = skillInfo;
        if (!unitKey || !lessonKey) return;
        const bucket = mathLessonCounts[lessonKey] || { correct: 0, total: 0, unitKey, lessonKey };
        bucket.total += 1;
        if (isAnswerCorrect(q, a[q.id])) bucket.correct += 1;
        mathLessonCounts[lessonKey] = bucket;
      });
    });
    const mathSkillPercents = {};
    Object.entries(mathLessonCounts).forEach(([lessonKey, data]) => {
      const pct = data.total ? Math.round((data.correct / data.total) * 100) : 0;
      const unitKey = data.unitKey;
      if (!mathSkillPercents[unitKey]) {
        mathSkillPercents[unitKey] = { pct: 0, lessons: {}, _counts: { correct: 0, total: 0 } };
      }
      mathSkillPercents[unitKey].lessons[lessonKey] = pct;
      mathSkillPercents[unitKey]._counts.correct += data.correct;
      mathSkillPercents[unitKey]._counts.total += data.total;
    });
    Object.entries(mathSkillPercents).forEach(([unitKey, info]) => {
      const { correct, total } = info._counts;
      info.pct = total ? Math.round((correct / total) * 100) : 0;
      delete info._counts;
    });

    const skillPercents = { rw: rwSkillPercents, math: mathSkillPercents };

    const difficultyPercents = aggregatePercentsBy((q, section) => {
      if (section !== "rw") return null;
      return q.difficultyKey || normalizeDifficulty(q.difficulty || "");
    });
    let totalQuestions = 0;
    modules.forEach((m) => {
      const a = answers[m.key] || {};
      (m.questions || []).forEach((q) => {
        totalQuestions += 1;
      });
    });
    const stats = { totalQuestions, elapsedSec };
    pendingResultRef.current = { finishedAt, elapsedSec, summary, stats, skillPercents, difficultyPercents };
    setSummaryModal({ open: true, stats, reason });
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
        const ansMap = answers[mod.key] || {};
        const correctMap = {};
        try {
          (mod.questions || []).forEach((q) => {
            if (q && q.id && q.correct != null) {
              correctMap[q.id] = String(q.correct);
            }
          });
        } catch {}
        const questionTexts = {};
        try {
          (mod.questions || []).forEach((q, idx) => {
            if (!q) return;
            const idKey = q.id || q.questionId || `q_${idx + 1}`;
            if (!idKey) return;
            const rawText = q.text || q.question || q.prompt || q.title || null;
            if (!rawText) return;
            questionTexts[idKey] = String(rawText);
          });
        } catch {}
        const practiceKind = normalizeTrainingKind(practice.kind || mod?.kind || 'classwork');
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
            questionTexts,
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
          setSummaryModal({ open: false, stats: null, reason: null });
          pendingResultRef.current = null;
          alert("Thanks! Your responses were submitted.");
          onNavigate("sat-training");
          return;
        }
        setSummaryModal({ open: false, stats: null, reason: null });
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
        const startedAtIso = new Date(startedAtRef.current).toISOString();
        const finishedAtIso = new Date(Date.now()).toISOString();
        const participantPayload = {
          name: profile?.name || profile?.full_name || profile?.username || null,
          email: authUser?.email || profile?.email || null,
          phone: profile?.phone || null,
          school: profile?.school || profile?.school_name || profile?.organization || profile?.org || profile?.company || null,
          class_name: profile?.class_name || null,
          test_type: resolvedTestType,
          started_at: startedAtIso,
          finished_at: finishedAtIso,
        };
          const saved = await saveSatResult({
            summary,
            skills: skillPercents,
            difficulty: difficultyPercents,
            answers,
            modules: moduleMeta,
            elapsedSec,
            participant: participantPayload,
          });
          if (liveSessionId) {
            try {
              await completeLiveTestSession(liveSessionId, {
                answered_count: answeredCount,
                total_questions: totalQuestionsCount,
              });
            } catch (err) {
              console.warn("live session completion failed", err);
            }
          }
          pendingResultRef.current = null;
          setSummaryModal({ open: false, stats: null, reason: null });
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
    const reason = summaryModal.reason;
    setSummaryModal({ open: false, stats: null, reason: null });
    pendingResultRef.current = null;
    if (reason === "timeout") {
      return;
    }
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

  const headerGridStyle = isNarrow
    ? { display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }
    : { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 };

  const questionLayoutStyle = isNarrow
    ? { display: "flex", flexDirection: "column", gap: 16 }
    : { display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 0, minHeight: 420 };

  const actionButtonsStyle = isNarrow
    ? { display: "flex", flexWrap: "wrap", gap: 8 }
    : { display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" };
  const questionPadding = isNarrow ? 12 : 16;

  // Keyboard shortcuts removed per request (mouse/tap only)

  if (!sectionActive) {
    return (
      <PageWrap>
        {previewBanner}
        <Card>
          <h3 style={{ marginTop: 0 }}>{mod.title || "Next Section"}</h3>
          <p style={{ color: "#6b7280" }}>
            Take a short break. When you are ready, begin the next section to continue.
          </p>
          <Btn variant="primary" onClick={() => setSectionActive(true)} style={{ marginTop: 12 }}>
            Begin {mod.title || "Next Section"}
          </Btn>
        </Card>
      </PageWrap>
    );
  }

    if (!previewMode && sessionPaused) {
      return (
        <PageWrap>
          <Card>
            <div style={{ color: "#111827", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              Session paused
            </div>
            <p style={{ color: "#6b7280", margin: 0 }}>
              {pauseReason
                ? "You left the test. The session is locked until an admin allows you to continue."
                : "This session is paused. Waiting for admin approval to continue."}
            </p>
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <Btn variant="back" onClick={() => onNavigate("home")}>
                Back Home
              </Btn>
            </div>
          </Card>
        </PageWrap>
      );
    }

  return (
    <PageWrap style={{ userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none", msUserSelect: "none" }}>
      {previewBanner}
      {isMathSection && showCalculator && (
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
              borderRadius: isNarrow ? 12 : 16,
              width: isNarrow ? "100%" : "min(960px, 95vw)",
              height: isNarrow ? "90vh" : "min(640px, 90vh)",
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
                borderBottomLeftRadius: isNarrow ? 12 : 16,
                borderBottomRightRadius: isNarrow ? 12 : 16,
              }}
              allowFullScreen
            />
          </div>
        </div>
      )}
      {/* Bluebook-style header */}
      <div style={{ padding: "6px 0 4px" }}>
        <div style={headerGridStyle}>
          {/* Left: Section title with Directions underneath */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 700, color: "#111827" }}>{mod.title}</div>
            <div>
              <button
                type="button"
                onClick={() => openOverlay("Directions", "Read each question carefully and choose the best answer. You may mark items for review and return before submitting the section.")}
                style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
              >
                Directions â–¾
              </button>
            </div>
          </div>

          {/* Center: Timer + Hide */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#111827", minHeight: 24 }}>
              {isTimed ? (showTimer ? cd.fmt(cd.remaining) : "â€”") : "Untimed"}
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

          {/* Right: Annotate / More / Calculator */}
          <div style={actionButtonsStyle}>
            {isMathSection && (
              <button
                type="button"
                onClick={() => setShowCalculator(true)}
                style={{ border: "1px solid #d1d5db", background: "#fff", color: "#2563eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}
              >
                Calculator
              </button>
            )}
            <button type="button" onClick={() => openOverlay("Annotate", "Annotation tools are coming soon.")} style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Annotate</button>
            <button type="button" onClick={() => openOverlay("More", "Additional options are coming soon.")} style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>More</button>
          </div>
        </div>
        <div style={{ borderTop: "2px dashed #d1d5db", marginTop: 8, marginBottom: 8 }} />
      </div>

      {/* Bluebook-like split layout with center divider */}
      <div style={questionLayoutStyle}>
        {/* Left: Passage + Stem */}
        <div
          style={{
            paddingRight: questionPadding,
            paddingLeft: isNarrow ? questionPadding : 0,
            paddingBottom: isNarrow ? 16 : 0,
            borderBottom: isNarrow ? "1px solid #e5e7eb" : "none",
          }}
        >
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
        {!isNarrow && <div style={{ background: "#e5e7eb", width: 1 }} />}

        {/* Right: Answers card */}
        <div
          style={{
            paddingLeft: questionPadding,
            paddingRight: isNarrow ? questionPadding : 0,
          }}
        >
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
              Review mode - answers are locked{deadlineLabel ? ` (Deadline: ${deadlineLabel})` : "."}
            </div>
          )}
          {q && (
            <div
              style={{
                display: "flex",
                flexDirection: isNarrow ? "column" : "row",
                alignItems: isNarrow ? "flex-start" : "center",
                justifyContent: "space-between",
                gap: isNarrow ? 8 : 0,
                marginBottom: 10,
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 700, border: "1px solid #d1d5db", borderRadius: 8, padding: "4px 8px" }}>
                  {page}
                </div>
                <button
                  type="button"
                  onClick={() => toggleFlag(q.id)}
                  disabled={reviewOnly}
                  style={{
                    border: "1px solid #d1d5db",
                    background: currentFlags[q.id] ? "#fef3c7" : "#fff",
                    color: "#374151",
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: reviewOnly ? "not-allowed" : "pointer",
                    opacity: reviewOnly ? 0.6 : 1,
                  }}
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
              const correctValue = q?.correct ?? q?.answer ?? null;
              const currentValue = currentAns[q.id] ?? "";
              const reviewHasCorrect = reviewOnly && correctValue != null;
              if (type === "text") {
                const isCorrect = reviewHasCorrect ? compareAnswer(correctValue, currentValue) : null;
                const borderColor = reviewHasCorrect
                  ? isCorrect
                    ? "#16a34a"
                    : currentValue
                    ? "#dc2626"
                    : "#d1d5db"
                  : "#2563eb";
                return (
                  <div style={{ display: "grid", gap: 6 }}>
                    <label htmlFor={`text_${q.id}`} style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>Enter your answer</label>
                    <input
                      id={`text_${q.id}`}
                      type="text"
                      value={currentValue}
                      disabled={reviewOnly}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateAnswer(q.id, raw === "" ? null : raw);
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: `2px solid ${borderColor}`,
                        fontSize: 16,
                        background: reviewOnly ? "#f8fafc" : "#fff",
                      }}
                    />
                  </div>
                );
              }
              if (type === "numeric" || !hasChoices) {
                const isCorrect = reviewHasCorrect ? compareAnswer(correctValue, currentValue) : null;
                const borderColor = reviewHasCorrect
                  ? isCorrect
                    ? "#16a34a"
                    : currentValue
                    ? "#dc2626"
                    : "#d1d5db"
                  : "#2563eb";
                return (
                  <div style={{ display: "grid", gap: 6 }}>
                    <label htmlFor={`numeric_${q.id}`} style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>Enter your answer</label>
                    <input
                      id={`numeric_${q.id}`}
                      type="text"
                      inputMode="decimal"
                      value={currentValue}
                      disabled={reviewOnly}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateAnswer(q.id, raw === "" ? null : raw);
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: `2px solid ${borderColor}`,
                        fontSize: 16,
                        background: reviewOnly ? "#f8fafc" : "#fff",
                      }}
                    />
                  </div>
                );
              }
              const userValue = currentAns[q.id];
              return (q?.choices || []).map((ch, idx) => {
                const isSelected = userValue === ch.value;
                const isCorrectChoice = reviewHasCorrect ? compareAnswer(correctValue, ch.value) : null;
                let border = `2px solid ${isSelected ? "#2563eb" : "#d1d5db"}`;
                let background = isSelected ? "#eff6ff" : "#fff";
                let textColor = "#111827";
                let badgeBorder = `2px solid ${isSelected ? "#2563eb" : "#9ca3af"}`;
                let badgeColor = isSelected ? "#2563eb" : "#374151";
                let badgeBg = isSelected ? "#dbeafe" : "#fff";
                if (reviewHasCorrect) {
                  if (isCorrectChoice) {
                    border = "2px solid #16a34a";
                    background = "#ecfdf5";
                    textColor = "#065f46";
                    badgeBorder = "2px solid #16a34a";
                    badgeColor = "#065f46";
                    badgeBg = "#d1fae5";
                  } else if (isSelected) {
                    border = "2px solid #dc2626";
                    background = "#fef2f2";
                    textColor = "#991b1b";
                    badgeBorder = "2px solid #dc2626";
                    badgeColor = "#991b1b";
                    badgeBg = "#fee2e2";
                  } else {
                    border = "2px solid #e5e7eb";
                    background = "#fff";
                    textColor = "#111827";
                    badgeBorder = "2px solid #d1d5db";
                    badgeColor = "#6b7280";
                    badgeBg = "#fff";
                  }
                }
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => updateAnswer(q.id, ch.value)}
                    disabled={reviewOnly}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border,
                      background,
                      cursor: reviewOnly ? "default" : "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      border: badgeBorder,
                      color: badgeColor,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      background: badgeBg,
                    }}>
                      {letter(idx)}
                    </span>
                    <span style={{ color: textColor }}>
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
        onFinish={reviewOnly ? () => onNavigate(practice?.returnRoute || "sat-training") : () => handleNextModule(finalTimeout ? "timeout" : "submit")}
        canBack={page !== 1}
        canNext={page < qCount}
        isLast={page >= qCount}
        compact={isNarrow}
      />
      {showPalette && (
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

{!reviewOnly && summaryModal.open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", backdropFilter: "blur(2px)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={summaryModal.reason === "timeout" ? undefined : cancelSummary}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 12px 30px rgba(15,23,42,0.25)", width: "min(520px, 92vw)", padding: 20, display: "grid", gap: 14 }}
          >
            <h3 style={{ margin: 0, color: "#111827" }}>
              {summaryModal.reason === "timeout" ? "Time's Up" : "Ready to Submit?"}
            </h3>
            {(() => {
              const stats = summaryModal.stats || { totalQuestions: 0, elapsedSec: 0 };
              return (
                <div style={{ color: "#374151", fontSize: 15, lineHeight: 1.6 }}>
                  <div><strong>Total questions:</strong> {stats.totalQuestions}</div>
                  <div><strong>Time spent:</strong> {fmtSeconds(stats.elapsedSec)}</div>
                </div>
              );
            })()}
            <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
              {summaryModal.reason === "timeout"
                ? "Time is up. Your responses will be submitted as they are."
                : "Submit to save your work."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              {summaryModal.reason !== "timeout" && (
                <button
                  type="button"
                  onClick={cancelSummary}
                  disabled={isSubmitting}
                  style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}
                >
                  Review Answers
                </button>
              )}
              <button
                type="button"
                onClick={finalizeSubmit}
                disabled={isSubmitting}
                style={{ border: "none", background: "#2563eb", color: "#fff", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}
              >
                {isSubmitting ? "Submittingâ€¦" : "Submit"}
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
