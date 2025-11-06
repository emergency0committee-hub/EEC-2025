// src/pages/sat/SATTraining.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";
import { fetchQuestionBankSample } from "../../lib/assignmentQuestions.js";
import {
  BANKS,
  mapBankQuestionToResource,
  SUBJECT_OPTIONS,
  MATH_UNIT_OPTIONS,
  MATH_LESSON_OPTIONS,
} from "../../lib/questionBanks.js";

const FIRST_MATH_UNIT = MATH_UNIT_OPTIONS[0]?.value || "";
const firstLessonForUnit = (unit) => {
  const lessons = MATH_LESSON_OPTIONS[unit] || [];
  return lessons[0]?.value || "";
};
const BANK_LABELS = {
  math: "Math Bank",
  english: "English Bank",
  tests: "Test Bank",
};

const defaultDurationForKind = (kind) => {
  const value = String(kind || "quiz").toLowerCase();
  if (value === "homework") return "";
  if (value === "quiz") return "15";
  return "20";
};

const resolveBankConfig = (bankId) => BANKS[bankId] || BANKS.math;

const normalizeKeyValue = (value) => String(value == null ? "" : value).trim().toLowerCase();
const buildStatKey = (meta = {}) =>
  [meta.subject, meta.unit, meta.lesson].map((part, idx) => normalizeKeyValue(part || (idx === 0 ? "unknown" : ""))).join("::");
const parseStatKey = (key = "") => {
  const [subject = "unknown", unit = "", lesson = ""] = String(key || "").split("::");
  return { subject, unit, lesson };
};

const findSubjectLabel = (value) => {
  const normalized = normalizeKeyValue(value);
  const match = SUBJECT_OPTIONS.find((opt) => normalizeKeyValue(opt.value) === normalized);
  return match?.label?.EN || (value ? String(value) : "—");
};

const findMathUnitLabel = (value) => {
  if (!value) return "—";
  const match = MATH_UNIT_OPTIONS.find((opt) => opt.value === value);
  return match?.label?.EN || value;
};

const findMathLessonLabel = (unit, lesson) => {
  if (!lesson) return "—";
  const list = MATH_LESSON_OPTIONS[unit] || [];
  const match = list.find((opt) => opt.value === lesson);
  return match?.label?.EN || lesson;
};

const formatUnitLabel = (subject, unit) => {
  if (!unit) return "—";
  return normalizeKeyValue(subject) === "math" ? findMathUnitLabel(unit) : unit;
};

const formatLessonLabel = (subject, unit, lesson) => {
  if (!lesson) return "—";
  return normalizeKeyValue(subject) === "math" ? findMathLessonLabel(unit, lesson) : lesson;
};

const createDefaultAutoAssign = (bankId = "math") => {
  const bank = resolveBankConfig(bankId);
  const subject = bank.subjectLocked
    ? bank.defaultSubject
    : bank.defaultSubject || SUBJECT_OPTIONS[0]?.value || "math";
  const supportsMathUnits = bank.supportsUnitLesson && subject === "math";
  const unit = supportsMathUnits ? FIRST_MATH_UNIT : "";
  const lesson = supportsMathUnits ? firstLessonForUnit(unit) : "";
  return {
    bank: bank.id,
    subject,
    kind: "quiz",
    questionCount: "10",
    durationMin: defaultDurationForKind("quiz"),
    title: "",
    unit,
    lesson,
  };
};

const CLASS_ASSIGN_ON_CONFLICT = "student_email,class_name";
const needsLegacyConflictFallback = (error) => {
  if (!error) return false;
  const message = String(error.message || "");
  return /no unique|matching.*on conflict/i.test(message);
};

export default function SATTraining({ onNavigate }) {
  SATTraining.propTypes = { onNavigate: PropTypes.func.isRequired };
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  // Admin session flag early so we can use it for initial UI
  const isAdmin = (() => { try { return localStorage.getItem("cg_admin_ok_v1") === "1"; } catch { return false; } })();

  // Declare all hooks unconditionally to keep hook order stable across renders
  const [tab, setTab] = useState(isAdmin ? "admin" : "classwork"); // stream | classwork | people | admin

  // Classroom-like seed data
  const streamPosts = useMemo(() => ([
    { id: "p1", title: "Welcome to SAT Training", body: "Use Classwork to pick a topic. Practice sets are untimed.", ts: new Date().toLocaleString() },
    { id: "p2", title: "Tip", body: "Focus on 2-3 skills per session for best results.", ts: new Date().toLocaleString() },
  ]), []);

  const classwork = useMemo(() => ([
    {
      topic: "Math",
      items: [
        { id: "m_algebra", title: "Algebra", desc: "Linear equations, functions, and systems.", action: () => onNavigate("sat-exam", { practice: { section: "MATH", unit: "algebra" } }) },
        { id: "m_psda", title: "Problem Solving & Data Analysis", desc: "Ratios, percentages, probability, and data.", action: () => onNavigate("sat-exam", { practice: { section: "MATH", unit: "psda" } }) },
        { id: "m_adv", title: "Advanced Math", desc: "Quadratics, exponentials, and polynomials.", action: () => onNavigate("sat-exam", { practice: { section: "MATH", unit: "adv_math" } }) },
        { id: "m_geo", title: "Geometry & Trig", desc: "Angles, coordinate geometry, triangles, volume.", action: () => onNavigate("sat-exam", { practice: { section: "MATH", unit: "geo_trig" } }) },
      ],
    },
  ]), [onNavigate]);

  // Admin: classes management
  const [classesLoading, setClassesLoading] = useState(false);
  const [classes, setClasses] = useState([]); // [{ name, count }]
  const [selectedClass, setSelectedClass] = useState("");
  const [classEmails, setClassEmails] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [classLogs, setClassLogs] = useState([]);
  const [viewClassLog, setViewClassLog] = useState(null);
  // Class sub-tabs (admin view)
  const [classTab, setClassTab] = useState("classwork"); // classwork | analytics
  const [assignForm, setAssignForm] = useState({ email: "", className: "" });
  const [savingAssign, setSavingAssign] = useState(false);
  const [knownEmails, setKnownEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  const fmtDate = (iso, time = false) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      if (time) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const fmtDuration = (sec) => {
    const n = Number(sec);
    if (!Number.isFinite(n) || n < 0) return "—";
    const mm = Math.floor(n / 60).toString().padStart(2, "0");
    const ss = Math.floor(n % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Classwork resources
  const [resLoading, setResLoading] = useState(false);
  // Student class & resources
  const [studentClass, setStudentClass] = useState("");
  const [studentResLoading, setStudentResLoading] = useState(false);
  const [studentResources, setStudentResources] = useState([]);
  const [studentAttempts, setStudentAttempts] = useState({});
  const groupedStudentResources = useMemo(() => {
    const groups = {
      exam: [],
      quiz: [],
      classwork: [],
      homework: [],
      other: [],
    };
    (studentResources || []).forEach((resource) => {
      const kind = String(resource?.kind || "classwork").toLowerCase();
      if (["exam", "sat", "test", "practice"].includes(kind)) {
        groups.exam.push(resource);
      } else if (kind === "quiz") {
        groups.quiz.push(resource);
      } else if (kind === "homework") {
        groups.homework.push(resource);
      } else if (kind === "classwork") {
        groups.classwork.push(resource);
      } else {
        groups.other.push(resource);
      }
    });
    return groups;
  }, [studentResources]);
  const hasAnyStudentResource = useMemo(
    () =>
      ["exam", "quiz", "classwork", "homework", "other"].some(
        (key) => (groupedStudentResources[key] || []).length > 0,
      ),
    [groupedStudentResources],
  );
  const [autoAssign, setAutoAssign] = useState(() => createDefaultAutoAssign("math"));
  const [autoGenerating, setAutoGenerating] = useState(false);

  const openClassLog = (row) => setViewClassLog(row);
  const closeClassLog = () => setViewClassLog(null);

  const DEFAULT_META = {
    classwork: { durationSec: 20 * 60, allowRetake: true, resumeMode: "restart", attemptLimit: null },
    homework: { durationSec: null, allowRetake: true, resumeMode: "resume", attemptLimit: null },
    quiz: { durationSec: 15 * 60, allowRetake: false, resumeMode: "restart", attemptLimit: 1 },
  };

  const baseMeta = (kind) => {
    const k = (kind || "classwork").toLowerCase();
    return { ...(DEFAULT_META[k] || DEFAULT_META.classwork) };
  };

  const buildMeta = (kind, durationInput) => {
    const meta = baseMeta(kind);
    if (meta.resumeMode === "resume") {
      meta.durationSec = null;
    } else {
      const minutes = Number.parseInt(durationInput, 10);
      if (Number.isFinite(minutes) && minutes > 0) {
        meta.durationSec = minutes * 60;
      }
    }
    if (meta.resumeMode === "resume") meta.durationSec = null;
    if (meta.allowRetake === false && meta.attemptLimit == null) meta.attemptLimit = 1;
    if (!(meta.durationSec > 0) && meta.resumeMode !== "resume") {
      meta.durationSec = baseMeta(kind).durationSec;
    }
    return meta;
  };

  const formatDuration = (sec) => {
    const num = Number(sec);
    if (!Number.isFinite(num) || num <= 0) return "Untimed";
    const minutes = Math.round(num / 60);
    if (minutes >= 120) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) return `${hours}h`;
      return `${hours}h ${mins}m`;
    }
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
  };

  const loadClasses = useCallback(async () => {
    if (!isAdmin) return;
    setClassesLoading(true);
    try {
      const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
      const { data, error } = await supabase.from(table).select("class_name, student_email").limit(2000);
      if (error) throw error;
      const map = new Map();
      (data || []).forEach((r) => {
        const name = r.class_name || "(Unassigned)";
        map.set(name, (map.get(name) || 0) + 1);
      });
      const arr = Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClasses(arr);
    } catch (e) {
      console.warn(e);
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }, [isAdmin]);

  const loadKnownEmails = useCallback(async () => {
    if (!isAdmin) {
      setKnownEmails([]);
      return;
    }
    setLoadingEmails(true);
    try {
      const emails = new Set();
      try {
        const rpc = await supabase.rpc("list_user_emails");
        if (!rpc.error && rpc.data) {
          rpc.data.forEach((entry) => {
            if (entry?.email) emails.add(entry.email);
          });
        }
      } catch {}
      try {
        const pr = await supabase.from("profiles").select("email").limit(5000);
        if (!pr.error && pr.data) {
          pr.data.forEach((entry) => {
            if (entry?.email) emails.add(entry.email);
          });
        }
      } catch {}
      try {
        const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        const ar = await supabase.from(table).select("student_email").limit(5000);
        if (!ar.error && ar.data) {
          ar.data.forEach((entry) => {
            if (entry?.student_email) emails.add(entry.student_email);
          });
        }
      } catch {}
      try {
        const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
        const tr = await supabase.from(tTable).select("user_email").limit(5000);
        if (!tr.error && tr.data) {
          tr.data.forEach((entry) => {
            if (entry?.user_email) emails.add(entry.user_email);
          });
        }
      } catch {}
      try {
        const sTable = import.meta.env.VITE_SUBMISSIONS_TABLE || "cg_submissions";
        const sr = await supabase.from(sTable).select("user_email").limit(5000);
        if (!sr.error && sr.data) {
          sr.data.forEach((entry) => {
            if (entry?.user_email) emails.add(entry.user_email);
          });
        }
      } catch {}
      setKnownEmails(Array.from(emails).filter(Boolean).sort((a, b) => a.localeCompare(b)));
    } catch (e) {
      console.warn("load known emails", e);
      setKnownEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  }, [isAdmin]);

  const handleAssignInput = (field, value) => {
    setAssignForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveAssignment = async () => {
    if (!isAdmin) return;
    const email = (assignForm.email || "").trim();
    const className = (assignForm.className || "").trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      alert("Enter a valid student email.");
      return;
    }
    if (!className) {
      alert("Enter a class name.");
      return;
    }
    setSavingAssign(true);
    try {
      const { data: me } = await supabase.auth.getUser();
      const adminEmail = me?.user?.email || null;
      const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
      const payload = { student_email: email, class_name: className, assigned_by: adminEmail };
      let { error } = await supabase
        .from(table)
        .upsert(payload, { onConflict: CLASS_ASSIGN_ON_CONFLICT });
      if (needsLegacyConflictFallback(error)) {
        try {
          await supabase.from(table).delete().eq("student_email", email);
        } catch {}
        ({ error } = await supabase.from(table).insert(payload));
      }
      if (error) throw error;
      setAssignForm({ email: "", className: "" });
      await loadClasses();
      alert("Class assignment saved.");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to save class assignment.");
    } finally {
      setSavingAssign(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setClassesLoading(true);
      try {
        const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        const { data, error } = await supabase.from(table).select("class_name, student_email").limit(2000);
        if (error) throw error;
        const map = new Map();
        (data || []).forEach((r) => {
          const name = r.class_name || "(Unassigned)";
          map.set(name, (map.get(name) || 0) + 1);
        });
        const arr = Array.from(map.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setClasses(arr);
      } catch (e) {
        console.warn(e);
        setClasses([]);
      } finally {
        setClassesLoading(false);
      }
    })();
  }, [isAdmin]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    loadKnownEmails();
  }, [loadKnownEmails]);

  const pillStyles = {
    base: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 },
    complete: { background: "#ecfdf5", color: "#047857" },
    info: { background: "#eef2ff", color: "#4338ca" },
    warn: { background: "#fef3c7", color: "#92400e" },
  };

  const extractResourceMeta = (resource) => {
    const meta = baseMeta(resource?.kind);
    const src = (() => {
      if (resource?.payload && typeof resource.payload === "object") {
        if (resource.payload.meta && typeof resource.payload.meta === "object") return resource.payload.meta;
        if (resource.payload.settings && typeof resource.payload.settings === "object") return resource.payload.settings;
      }
      if (resource?.meta && typeof resource.meta === "object") return resource.meta;
      if (resource?.settings && typeof resource.settings === "object") return resource.settings;
      if (resource?.url && String(resource.url).startsWith("data:application/json")) {
        try {
          const base64 = String(resource.url).split(",")[1] || "";
          const json = decodeURIComponent(escape(window.atob(base64)));
          const obj = JSON.parse(json);
          if (obj && typeof obj.meta === "object") return obj.meta;
        } catch {}
      }
      return null;
    })();
    if (src) {
      if (src.durationSec != null && Number.isFinite(Number(src.durationSec))) {
        meta.durationSec = Math.max(0, Number(src.durationSec));
      }
      if (src.allowRetake != null) meta.allowRetake = !!src.allowRetake;
      if (src.resumeMode) meta.resumeMode = String(src.resumeMode);
      if (src.attemptLimit != null) {
        const lim = Number(src.attemptLimit);
        meta.attemptLimit = Number.isFinite(lim) && lim > 0 ? lim : null;
      }
    }
    if (resource?.duration_sec != null && Number.isFinite(Number(resource.duration_sec))) {
      meta.durationSec = Math.max(0, Number(resource.duration_sec));
    }
    if (meta.resumeMode === "resume") meta.durationSec = null;
    if (meta.allowRetake === false && meta.attemptLimit == null) meta.attemptLimit = 1;
    if (!(meta.durationSec > 0) && meta.resumeMode !== "resume") {
      meta.durationSec = baseMeta(resource?.kind).durationSec;
    }
    return meta;
  };

  const normalizeResourceItems = (items) => {
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

  const getResourceQuestions = (resource) => {
    try {
      if (Array.isArray(resource?.payload?.items)) return normalizeResourceItems(resource.payload.items);
      if (resource?.url && String(resource.url).startsWith("data:application/json")) {
        const base64 = String(resource.url).split(",")[1] || "";
        const json = decodeURIComponent(escape(window.atob(base64)));
        const obj = JSON.parse(json);
        if (Array.isArray(obj.items)) return normalizeResourceItems(obj.items);
      }
    } catch (e) {
      console.warn("read resource questions", e);
    }
    return [];
  };

  const buildAttemptIndex = (rows = []) => {
    const map = {};
    (rows || []).forEach((row) => {
      const data = row || {};
      const answers = data.answers || {};
      const resourceId = data.resource_id || answers.resourceId || answers.resource_id;
      if (!resourceId) return;
      const status = answers.status || data.status || "completed";
      const entry = {
        id: data.id,
        status,
        ts: data.ts || data.created_at || null,
        elapsedSec: Number(data.elapsed_sec || answers.elapsedSec || 0),
        summary: data.summary || null,
        meta: answers.meta || null,
      };
      if (!map[resourceId]) map[resourceId] = { attempts: [], latest: entry };
      map[resourceId].attempts.push(entry);
      const latest = map[resourceId].latest;
      if (!latest || (entry.ts && (!latest.ts || new Date(entry.ts) > new Date(latest.ts)))) {
        map[resourceId].latest = entry;
      }
      if (entry.status === "completed") map[resourceId].completed = true;
    });
    return map;
  };

  const [resources, setResources] = useState([]);
  const bankCatalogRef = useRef({});
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [catalogLoadingBank, setCatalogLoadingBank] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const usedQuestionIds = useMemo(() => {
    const ids = new Set();
    (resources || []).forEach((resource) => {
      const questions = getResourceQuestions(resource) || [];
      questions.forEach((question) => {
        const key = question?.id != null ? String(question.id) : null;
        if (key) ids.add(key);
      });
    });
    return ids;
  }, [resources]);
  const handleAutoAssignChange = (field, rawValue) => {
    setAutoAssign((prev) => {
      let next = { ...prev };
      let value = rawValue;

      if (field === "questionCount") {
        value = String(rawValue ?? "").replace(/[^\d]/g, "");
        next.questionCount = value;
      } else if (field === "durationMin") {
        value = String(rawValue ?? "").replace(/[^\d]/g, "");
        next.durationMin = value;
      } else if (field === "bank") {
        const bank = resolveBankConfig(rawValue);
        next = {
          ...next,
          bank: bank.id,
          subject: bank.subjectLocked
            ? bank.defaultSubject
            : next.subject || bank.defaultSubject || SUBJECT_OPTIONS[0]?.value || "math",
        };
      } else if (field === "subject") {
        next.subject = String(value || "");
      } else if (field === "kind") {
        const kindValue = String(rawValue || "quiz").toLowerCase();
        next.kind = kindValue;
        next.durationMin = defaultDurationForKind(kindValue);
      } else if (field === "title") {
        next.title = value ?? "";
      } else if (field === "unit") {
        next.unit = String(value || "");
      } else if (field === "lesson") {
        next.lesson = String(value || "");
      }

      const activeBank = resolveBankConfig(next.bank);
      let subjectValue = next.subject;
      if (activeBank.subjectLocked) {
        subjectValue = activeBank.defaultSubject;
        next.subject = subjectValue;
      } else if (!subjectValue) {
        subjectValue = activeBank.defaultSubject || SUBJECT_OPTIONS[0]?.value || "math";
        next.subject = subjectValue;
      }

      const supportsMathUnits = activeBank.supportsUnitLesson && subjectValue === "math";
      if (!supportsMathUnits) {
        next.unit = "";
        next.lesson = "";
      } else {
        const unitValue = MATH_UNIT_OPTIONS.some((opt) => opt.value === next.unit)
          ? next.unit
          : FIRST_MATH_UNIT;
        if (field !== "unit") {
          next.unit = unitValue;
        }
        const lessonsForUnit = MATH_LESSON_OPTIONS[next.unit] || [];
        if (field === "unit") {
          const lessonList = MATH_LESSON_OPTIONS[String(value || "")] || [];
          if (!lessonList.some((opt) => opt.value === next.lesson)) {
            next.lesson = lessonList[0]?.value || "";
          }
        } else if (!lessonsForUnit.some((opt) => opt.value === next.lesson)) {
          next.lesson = lessonsForUnit[0]?.value || "";
        }
      }

      if (next.kind === "homework") {
        next.durationMin = "";
      }

      return next;
    });
  };

  async function saveResource({
    items,
    kind,
    title,
    unit,
    lesson,
    durationInput,
    metaExtras = {},
  }) {
    if (!selectedClass) throw new Error("Pick a class first");
    const questionItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (questionItems.length === 0) throw new Error("No questions available to save.");
    const resolvedKind = (kind || "quiz").toLowerCase();
    const resolvedTitle =
      (title || "").trim() ||
      `${resolvedKind.charAt(0).toUpperCase()}${resolvedKind.slice(1)} (${questionItems.length} Qs)`;
    const meta = buildMeta(resolvedKind, durationInput);
    const payloadMeta = {
      ...meta,
      unit: unit || null,
      lesson: lesson || null,
      questionCount: questionItems.length,
      ...metaExtras,
    };

    const rTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
    const { data: me } = await supabase.auth.getUser();
    const by = me?.user?.email || userEmail || null;

    let inserted = null;
    const baseRow = {
      class_name: selectedClass,
      title: resolvedTitle,
      unit: unit || null,
      lesson: lesson || null,
      url: "",
      kind: resolvedKind,
      created_by: by,
      payload: { items: questionItems, meta: payloadMeta },
    };
    try {
      const { data, error } = await supabase.from(rTable).insert(baseRow).select().single();
      if (error) throw error;
      inserted = data;
    } catch (e) {
      const missingColumn = e?.code === "42703" || /column .* does not exist/i.test(e?.message || "");
      if (!missingColumn) throw e;
      const fallbackPayload = { items: questionItems, meta: payloadMeta };
      try {
        const { data, error } = await supabase
          .from(rTable)
          .insert({
            class_name: selectedClass,
            title: resolvedTitle,
            unit: unit || null,
            lesson: lesson || null,
            url: "",
            kind: resolvedKind,
            created_by: by,
            payload: fallbackPayload,
          })
          .select()
          .single();
        if (error) throw error;
        inserted = data;
      } catch (inner) {
        const json = JSON.stringify(fallbackPayload);
        const dataUrl = `data:application/json;base64,${btoa(unescape(encodeURIComponent(json)))}`;
        const { data, error } = await supabase
          .from(rTable)
          .insert({
            class_name: selectedClass,
            title: resolvedTitle,
            unit: unit || null,
            lesson: lesson || null,
            url: dataUrl,
            kind: resolvedKind,
            created_by: by,
          })
          .select()
          .single();
        if (error) throw error;
        inserted = data;
      }
    }

    if (inserted && (!inserted.payload || typeof inserted.payload !== "object")) {
      inserted = { ...inserted, payload: { items: questionItems, meta: payloadMeta } };
    } else if (inserted?.payload?.meta) {
      inserted = {
        ...inserted,
        payload: { ...inserted.payload, meta: { ...payloadMeta, ...inserted.payload.meta } },
      };
    }
    inserted = {
      ...inserted,
      unit: inserted.unit ?? (unit || null),
      lesson: inserted.lesson ?? (lesson || null),
    };
    return inserted;
  }

  async function handleAutoGenerate() {
    if (!selectedClass) {
      alert("Pick a class first");
      return;
    }
    const bank = resolveBankConfig(autoAssign.bank);
    const subject = bank.subjectLocked
      ? bank.defaultSubject
      : autoAssign.subject || bank.defaultSubject || SUBJECT_OPTIONS[0]?.value || "math";
    const supportsMathUnits = bank.supportsUnitLesson && subject === "math";
    const unitValue = supportsMathUnits ? autoAssign.unit : "";
    const lessonValue = supportsMathUnits ? autoAssign.lesson : "";
    const requestedCount = Number.parseInt(autoAssign.questionCount, 10);
    if (!Number.isFinite(requestedCount) || requestedCount <= 0) {
      alert("Enter how many questions you want to include.");
      return;
    }
    if (supportsMathUnits && !unitValue) {
      alert("Pick a unit.");
      return;
    }
    if (supportsMathUnits && !lessonValue) {
      alert("Pick a lesson.");
      return;
    }

    const questionLimit = Math.min(Math.max(requestedCount, 1), 200);
    setAutoGenerating(true);
    try {
      const rows = await fetchQuestionBankSample({
        table: bank.table,
        subject,
        unit: supportsMathUnits ? unitValue : undefined,
        lesson: supportsMathUnits ? lessonValue : undefined,
        limit: questionLimit,
      });
      const candidates = (rows || []).map(mapBankQuestionToResource).filter(Boolean);
      if (!candidates.length) {
        throw new Error("No questions found for the selected filters.");
      }

      const seenIds = new Set();
      const deduped = [];
      candidates.forEach((item) => {
        const key = item?.id != null ? String(item.id) : null;
        if (!key || seenIds.has(key)) return;
        seenIds.add(key);
        deduped.push(item);
      });

      const freshItems = deduped.filter((item) => {
        const key = item?.id != null ? String(item.id) : null;
        if (!key) return true;
        return !usedQuestionIds.has(key);
      });

      if (!freshItems.length) {
        alert("All matching questions were already used in this class. Adjust your filters or archive older assignments.");
        return;
      }

      const items = freshItems.slice(0, requestedCount);
      if (items.length < requestedCount) {
        const proceed = window.confirm(
          `Only ${items.length} unused question${items.length === 1 ? "" : "s"} are available for this class. Continue anyway?`,
        );
        if (!proceed) {
          return;
        }
      }

      const subjectLabel =
        SUBJECT_OPTIONS.find((opt) => opt.value === subject)?.label?.EN || subject || "";
      const kindLabel = String(autoAssign.kind || "quiz").toLowerCase();
      const titleBase = (autoAssign.title || "").trim();
      const defaultTitleParts = [];
      if (subjectLabel) defaultTitleParts.push(subjectLabel);
      defaultTitleParts.push(kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1));
      defaultTitleParts.push(`(${items.length} Qs)`);
      const title = titleBase || defaultTitleParts.join(" ");
      const durationInput = kindLabel === "homework" ? "" : autoAssign.durationMin;

      const metaExtras = {
        questionBank: bank.id,
        subject,
        unit: supportsMathUnits ? unitValue : null,
        lesson: supportsMathUnits ? lessonValue : null,
        source: "question-bank",
      };

      const inserted = await saveResource({
        items,
        kind: kindLabel,
        title,
        unit: supportsMathUnits ? unitValue : null,
        lesson: supportsMathUnits ? lessonValue : null,
        durationInput,
        metaExtras,
      });
      setResources((list) => [inserted, ...list]);
      setAutoAssign((prev) => ({
        ...prev,
        title: "",
        questionCount: String(requestedCount),
      }));
      alert(`Assignment created with ${items.length} question${items.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      alert(error?.message || "Failed to build assignment from the question bank.");
    } finally {
      setAutoGenerating(false);
    }
  }

  const activeBank = useMemo(() => resolveBankConfig(autoAssign.bank), [autoAssign.bank]);
  const activeSubject = activeBank.subjectLocked
    ? activeBank.defaultSubject
    : autoAssign.subject || activeBank.defaultSubject || SUBJECT_OPTIONS[0]?.value || "math";
  const showMathSelectors = activeBank.supportsUnitLesson && activeSubject === "math";
  const activeLessons = MATH_LESSON_OPTIONS[autoAssign.unit] || [];
  const subjectDisplayLabel =
    SUBJECT_OPTIONS.find((opt) => opt.value === activeSubject)?.label?.EN || activeSubject;
  const activeBankLabel = BANK_LABELS[activeBank.id] || "Question Bank";

  const ensureBankCatalog = useCallback(
    async (bankId) => {
      const targetBank = bankId || autoAssign.bank || "math";
      const config = resolveBankConfig(targetBank);
      if (bankCatalogRef.current[config.id]) {
        return bankCatalogRef.current[config.id];
      }
      setCatalogLoadingBank(config.id);
      setCatalogError(null);
      try {
        const rows = [];
        const chunkSize = 1000;
        const maxRows = 20000; // guard to avoid runaway downloads if the bank explodes in size
        for (let start = 0; start < maxRows; start += chunkSize) {
          const end = start + chunkSize - 1;
          const { data, error } = await supabase
            .from(config.table)
            .select("*")
            .range(start, end);
          if (error) throw error;
          if (Array.isArray(data) && data.length > 0) {
            rows.push(...data);
            if (data.length < chunkSize) break;
          } else {
            break;
          }
        }
        const metaById = {};
        const totals = {};
        rows.forEach((row) => {
          const questionId =
            row?.id ??
            row?.uuid ??
            row?.question_id ??
            row?.questionid ??
            row?.questionId ??
            null;
          if (questionId == null) return;
          const idKey = String(questionId);
          const meta = {
            subject: row?.subject || config.defaultSubject || "math",
            unit: row?.unit || "",
            lesson: row?.lesson || "",
          };
          metaById[idKey] = meta;
          const bucketKey = buildStatKey(meta);
          totals[bucketKey] = (totals[bucketKey] || 0) + 1;
        });
        bankCatalogRef.current[config.id] = { metaById, totals };
        setCatalogVersion((v) => v + 1);
        setCatalogError(null);
        return bankCatalogRef.current[config.id];
      } catch (error) {
        console.warn("question catalog load", error);
        setCatalogError(error?.message || "Failed to load question counts.");
        return null;
      } finally {
        setCatalogLoadingBank((current) => (current === config.id ? null : current));
      }
    },
    [autoAssign.bank],
  );

  useEffect(() => {
    if (!isAdmin || !selectedClass) return;
    ensureBankCatalog(activeBank.id).catch(() => {});
  }, [activeBank.id, ensureBankCatalog, isAdmin, selectedClass]);

  const refreshQuestionStats = useCallback(() => {
    const key = activeBank.id;
    if (bankCatalogRef.current[key]) {
      delete bankCatalogRef.current[key];
      setCatalogVersion((v) => v + 1);
    }
    ensureBankCatalog(key).catch(() => {});
  }, [activeBank.id, ensureBankCatalog]);

  const questionStats = useMemo(() => {
    const catalog = bankCatalogRef.current[activeBank.id];
    if (!catalog) return [];
    const totals = catalog.totals || {};
    const usedCounts = {};
    usedQuestionIds.forEach((value) => {
      if (value == null) return;
      const idKey = String(value);
      const meta = catalog.metaById?.[idKey] || { subject: activeSubject || "unknown", unit: "", lesson: "" };
      const bucketKey = buildStatKey(meta);
      usedCounts[bucketKey] = (usedCounts[bucketKey] || 0) + 1;
    });
    const normalizedSubject = normalizeKeyValue(activeSubject);
    const combinedKeys = Object.keys({ ...totals, ...usedCounts }).filter((key) => {
      if (!normalizedSubject) return true;
      const { subject } = parseStatKey(key);
      return normalizeKeyValue(subject) === normalizedSubject;
    });
    const rows = combinedKeys.map((key) => {
      const { subject, unit, lesson } = parseStatKey(key);
      const total = totals[key] || 0;
      const used = usedCounts[key] || 0;
      return {
        key,
        subject,
        unit,
        lesson,
        total,
        used,
        remaining: Math.max(0, total - used),
      };
    });
    rows.sort((a, b) => {
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      if (a.unit !== b.unit) return a.unit.localeCompare(b.unit);
      return a.lesson.localeCompare(b.lesson);
    });
    return rows;
  }, [activeBank.id, activeSubject, catalogVersion, usedQuestionIds]);

  const highlightKey = useMemo(() => {
    if (!activeSubject) return null;
    const meta = {
      subject: activeSubject,
      unit: showMathSelectors ? autoAssign.unit : "",
      lesson: showMathSelectors ? autoAssign.lesson : "",
    };
    return buildStatKey(meta);
  }, [activeSubject, autoAssign.lesson, autoAssign.unit, showMathSelectors]);

  const highlightStats = highlightKey ? questionStats.find((row) => row.key === highlightKey) : null;
  const catalogBusy = catalogLoadingBank === activeBank.id;
  const catalogLoaded = Boolean(bankCatalogRef.current[activeBank.id]);
  const usedQuestionCount = usedQuestionIds.size;
  const selectedClassLabel = selectedClass || "this class";
  useEffect(() => {
    if (!isAdmin || !selectedClass) return;
    (async () => {
      try {
        // Load student emails
        const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        const { data, error } = await supabase.from(table).select("student_email").eq("class_name", selectedClass).limit(5000);
        if (error) throw error;
        const emails = Array.from(new Set((data || []).map(r => r.student_email).filter(Boolean)));
        setClassEmails(emails);
        // Load logs
        setLogsLoading(true);
        try {
          if (emails.length > 0) {
            const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
            const { data: logs, error: lerr } = await supabase.from(tTable).select("*").in("user_email", emails).order("ts", { ascending: false }).limit(500);
            if (lerr) throw lerr;
            setClassLogs(logs || []);
          } else {
            setClassLogs([]);
          }
        } finally {
          setLogsLoading(false);
        }

        // Load classwork resources
        try {
          setResLoading(true);
          const rTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
          const { data: rs, error: rerr } = await supabase
            .from(rTable)
            .select("*")
            .eq("class_name", selectedClass)
            .order("ts", { ascending: false })
            .limit(1000);
          if (rerr) throw rerr;
          setResources(rs || []);
        } catch (e) {
          console.warn(e);
          setResources([]);
        } finally {
          setResLoading(false);
        }
      } catch (e) {
        console.warn(e);
        setClassEmails([]);
        setClassLogs([]);
        setLogsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedClass]);

  const deleteResource = async (row) => {
    if (!row) return;
    const ok = window.confirm(`Delete resource "${row.title || ''}"?`);
    if (!ok) return;
    try {
      const rTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
      const { error } = await supabase.from(rTable).delete().eq("id", row.id);
      if (error) throw error;
      setResources((list) => list.filter((x) => x.id !== row.id));
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to delete resource");
    }
  };

  const people = useMemo(() => ([
    { role: "Teacher", name: "Practice Bot" },
    { role: "Student", name: "You" },
  ]), []);

  const TabButton = ({ id, children }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        border: "none",
        background: tab === id ? "#111827" : "#fff",
        color: tab === id ? "#fff" : "#374151",
        borderRadius: 999,
        padding: "8px 14px",
        cursor: "pointer",
      }}
    >{children}</button>
  );


  function decodeResourceQuestions(r) {
    return getResourceQuestions(r);
  }

  const renderStudentResourceCard = (resource) => {
    if (!resource) return null;
    const key = resource.id || `${resource.title || "resource"}_${resource.url || "link"}`;
    const items = decodeResourceQuestions(resource) || [];
    const meta = extractResourceMeta(resource);
    const practiceMeta = { ...meta };
    const kindLower = String(resource.kind || "classwork").toLowerCase();
    if (kindLower === "homework") {
      practiceMeta.resumeMode = "restart";
      practiceMeta.durationSec = null;
    }
    const attemptInfo = resource?.id ? studentAttempts[resource.id] || null : null;
    const attemptCount = attemptInfo?.attempts?.length || 0;
    const latestStatus = attemptInfo?.latest?.status || null;
    const completed = attemptInfo?.completed ?? (latestStatus === "completed");
    const attemptLimit = practiceMeta?.attemptLimit != null ? practiceMeta.attemptLimit : null;
    const allowRetake = practiceMeta?.allowRetake !== false;
    const limitReached = items.length > 0 && completed && ((!allowRetake && attemptLimit == null) || (attemptLimit != null && attemptCount >= attemptLimit));
    const canStart = items.length > 0 && !limitReached;
    const kindLabel = (resource.kind || "classwork").toLowerCase();
    const prettyKind = kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1);
    const durationLabel = items.length > 0 ? formatDuration(practiceMeta?.durationSec) : null;
    const attemptLabel = attemptCount > 0 ? `Attempts: ${attemptCount}${attemptLimit ? `/${attemptLimit}` : ""}` : null;
    let hasResume = false;
    if (practiceMeta?.resumeMode === "resume" && resource?.id) {
      try { hasResume = Boolean(localStorage.getItem(`cg_sat_resume_${resource.id}`)); } catch {}
    }
    const startLabel = limitReached
      ? "Completed"
      : (practiceMeta?.resumeMode === "resume" && hasResume ? "Resume" : `Start ${prettyKind}`);
    const startAttemptIndex = attemptCount + 1;
    const routeTarget = ["exam", "sat", "diagnostic", "test"].includes(kindLower) ? "sat-exam" : "sat-assignment";
    const launchPractice = () => {
      if (!canStart) return;
      const durationSec = (typeof practiceMeta.durationSec === "number" && practiceMeta.durationSec > 0) ? practiceMeta.durationSec : null;
      onNavigate(routeTarget, {
        practice: {
          kind: resource.kind || "classwork",
          resourceId: resource.id || null,
          className: studentClass || null,
          section: resource.section || null,
          unit: resource.unit || null,
          lesson: resource.lesson || null,
          meta: practiceMeta,
          attemptIndex: startAttemptIndex,
          custom: {
            questions: items,
            durationSec,
            title: resource.title || prettyKind,
            meta: practiceMeta,
          },
        },
      });
    };
    const pill = (variant, text) => (
      <span key={`${key}_${variant}_${text}`} style={{ ...pillStyles.base, ...(pillStyles[variant] || {}) }}>{text}</span>
    );

    return (
      <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>{resource.title || "Untitled Resource"}</div>
          <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{prettyKind}</span>
        </div>
        {(resource.unit || resource.lesson) && (
          <div style={{ color: '#6b7280', fontSize: 12 }}>
            {[resource.unit, resource.lesson].filter(Boolean).join(' - ')}
          </div>
        )}
        {(resource.url && (!resource.payload || !items.length)) && (
          <div style={{ marginTop: 4, wordBreak: 'break-word' }}>
            <a href={resource.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{resource.url}</a>
          </div>
        )}
        {items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {completed && pill("complete", "Completed")}
            {!completed && !attemptCount && pill("info", "Not started")}
            {attemptLabel && pill("info", attemptLabel)}
            {durationLabel && pill("info", `Time: ${durationLabel}`)}
            {limitReached && pill("warn", "Retake locked")}
          </div>
        )}
        <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {resource.url && <Btn variant="secondary" onClick={() => window.open(resource.url, "_blank")}>Open</Btn>}
          {items.length > 0 && (
            <Btn
              variant="primary"
              disabled={!canStart}
              onClick={launchPractice}
            >
              {startLabel}
            </Btn>
          )}
        </div>
        {limitReached && (
          <div style={{ color: '#ef4444', fontSize: 12 }}>
            You have completed this {prettyKind.toLowerCase()}. Ask your teacher if you need another attempt.
          </div>
        )}
      </div>
    );
  };

  const resourceGroupOrder = [
    { key: "exam", title: "Exams", subtitle: "Full SAT-style tests assigned by your teacher." },
    { key: "quiz", title: "Quizzes", subtitle: "Quick checks assigned by your teacher." },
    { key: "classwork", title: "Classwork", subtitle: "Practice sets to work on during class time." },
    { key: "homework", title: "Homework", subtitle: "Assignments you can resume from home." },
    { key: "other", title: "Additional Resources", subtitle: "Links and materials shared by your teacher." },
  ];
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const email = auth?.user?.email || "";
        setUserEmail(email);
        if (!email) { setAllowed(false); return; }
        const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        const { data, error } = await supabase
          .from(table)
          .select("class_name")
          .eq("student_email", email)
          .limit(1);
        if (error) { console.warn("Class check error", error); setAllowed(false); }
        else {
          const ok = (data && data.length > 0);
          setAllowed(ok);
          if (ok && !isAdmin) {
            const cls = data[0]?.class_name || "";
            setStudentClass(cls);
            try {
              setStudentResLoading(true);
              const rTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
              const { data: resData, error: resError } = await supabase
                .from(rTable)
                .select("*")
                .eq("class_name", cls)
                .order("ts", { ascending: false })
                .limit(1000);
              if (resError) throw resError;
              const resources = resData || [];
              setStudentResources(resources);
              try {
                const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
                let attemptsData = [];
                if (email) {
                  const baseQuery = supabase
                    .from(tTable)
                    .select("*")
                    .eq("user_email", email)
                    .order("ts", { ascending: false })
                    .limit(500);
                  let resp;
                  if (cls) {
                    resp = await baseQuery.eq("class_name", cls);
                    if (resp.error && (resp.error.code === "42703" || /column .* does not exist/i.test(resp.error.message || ""))) {
                      resp = await supabase
                        .from(tTable)
                        .select("*")
                        .eq("user_email", email)
                        .order("ts", { ascending: false })
                        .limit(500);
                    }
                  } else {
                    resp = await baseQuery;
                  }
                  if (resp.error) throw resp.error;
                  attemptsData = resp.data || [];
                }
                setStudentAttempts(buildAttemptIndex(attemptsData));
              } catch (attemptErr) {
                console.warn(attemptErr);
                setStudentAttempts(buildAttemptIndex([]));
              }
            } catch (e) {
              console.warn(e);
              setStudentResources([]);
              setStudentAttempts(buildAttemptIndex([]));
            } finally {
              setStudentResLoading(false);
            }
          }
        }
      } catch (e) {
        console.warn(e);
        setAllowed(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Training" right={null} />
        <Card><p style={{ color: "#6b7280" }}>Checking access...</p></Card>
      </PageWrap>
    );
  }

  if (!allowed && !isAdmin) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Training" right={null} />
        <Card>
          {!userEmail ? (
            <>
              <p style={{ color: "#6b7280" }}>
                You need to sign in to access SAT Training.
              </p>
              <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            </>
          ) : (
            <>
              <p style={{ color: "#6b7280" }}>
                Your administrator needs to assign you a class before you can use SAT Training.
              </p>
              <p style={{ color: "#9ca3af", fontSize: 12 }}>
                Ask your admin to assign a class to {userEmail} in the Admin dashboard.
              </p>
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  if (isAdmin) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Training" right={null} />
        <div style={{ display: 'grid', gap: 16 }}>
          {!selectedClass ? (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ marginTop: 0 }}>Your Classes</h3>
                <div style={{ color: '#6b7280', fontSize: 12 }}>{classesLoading ? 'Loading…' : `${classes.length} class${classes.length === 1 ? '' : 'es'}`}</div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  border: '1px dashed #dbeafe',
                  borderRadius: 12,
                  padding: 16,
                  background: '#f8fafc',
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Create or Assign a Class</div>
                    <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
                      Add a student email and class name. New names create classes automatically.
                    </p>
                  </div>
                  <Btn
                    variant="secondary"
                    onClick={() => loadClasses()}
                    style={{ minWidth: 150 }}
                    disabled={classesLoading}
                  >
                    {classesLoading ? 'Refreshing…' : 'Refresh list'}
                  </Btn>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    alignItems: 'flex-end',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Student Email</label>
                    <input
                      type="email"
                      list="sat-training-email-options"
                      placeholder="student@example.com"
                      value={assignForm.email}
                      onChange={(e) => handleAssignInput("email", e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Class Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Cohort A"
                      value={assignForm.className}
                      onChange={(e) => handleAssignInput("className", e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <Btn
                      variant="primary"
                      onClick={saveAssignment}
                      disabled={savingAssign}
                      style={{ width: '100%' }}
                    >
                      {savingAssign ? 'Saving...' : 'Save Assignment'}
                    </Btn>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {loadingEmails ? 'Loading known student emails…' : 'Suggestions appear as you type.'}
                </div>
                <datalist id="sat-training-email-options">
                  {knownEmails.map((email) => (
                    <option key={email} value={email} />
                  ))}
                </datalist>
              </div>
              {classes.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No classes found yet. Use the form above to create your first class.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {classes.map((c) => (
                    <div key={c.name} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{c.name}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{c.count} student{c.count === 1 ? '' : 's'}</div>
                      <div style={{ marginTop: 10 }}>
                        <Btn variant="secondary" onClick={() => setSelectedClass(c.name)}>Open</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 style={{ marginTop: 0 }}>Class: {selectedClass}</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="back" onClick={() => { setSelectedClass(""); setClassLogs([]); setClassEmails([]); }}>Back to Classes</Btn>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {['classwork', 'analytics'].map((id) => (
                    <button
                      key={id}
                      onClick={() => setClassTab(id)}
                      style={{
                        border: 'none',
                        borderRadius: 999,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        background: classTab === id ? '#111827' : '#fff',
                        color: classTab === id ? '#fff' : '#374151',
                        fontWeight: 600,
                      }}
                    >
                      {id === 'classwork' ? 'Classwork' : 'Analysis'}
                    </button>
                  ))}
                </div>

                {classTab === 'classwork' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Build From Question Bank</div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <select
                            value={activeBank.id}
                            onChange={(e) => handleAutoAssignChange("bank", e.target.value)}
                            style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                          >
                            {Object.values(BANKS).map((bank) => (
                              <option key={bank.id} value={bank.id}>
                                {BANK_LABELS[bank.id] || bank.id}
                              </option>
                            ))}
                          </select>
                          <select
                            value={autoAssign.kind}
                            onChange={(e) => handleAutoAssignChange("kind", e.target.value)}
                            style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                          >
                            <option value="classwork">Classwork</option>
                            <option value="homework">Homework</option>
                            <option value="quiz">Quiz</option>
                          </select>
                          {activeBank.subjectLocked ? (
                            <div
                              style={{
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                background: '#f9fafb',
                                color: '#374151',
                                minWidth: 140,
                              }}
                            >
                              {subjectDisplayLabel}
                            </div>
                          ) : (
                            <select
                              value={activeSubject}
                              onChange={(e) => handleAutoAssignChange("subject", e.target.value)}
                              style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                            >
                              {SUBJECT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label.EN || opt.value}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {showMathSelectors && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <select
                              value={autoAssign.unit}
                              onChange={(e) => handleAutoAssignChange("unit", e.target.value)}
                              style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
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
                              style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                            >
                              {activeLessons.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label.EN || opt.value}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <input
                            type="number"
                            min="1"
                            placeholder="Questions"
                            value={autoAssign.questionCount}
                            onChange={(e) => handleAutoAssignChange("questionCount", e.target.value)}
                            style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, minWidth: 140 }}
                          />
                          <input
                            type="number"
                            min="1"
                            placeholder="Duration (min)"
                            value={autoAssign.kind === "homework" ? "" : autoAssign.durationMin}
                            onChange={(e) => handleAutoAssignChange("durationMin", e.target.value)}
                            disabled={autoAssign.kind === "homework"}
                            style={{
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: 8,
                              minWidth: 160,
                              background: autoAssign.kind === "homework" ? '#f9fafb' : '#ffffff',
                              color: autoAssign.kind === "homework" ? '#9ca3af' : '#111827',
                            }}
                          />
                        </div>

                        <input
                          type="text"
                          value={autoAssign.title}
                          onChange={(e) => handleAutoAssignChange("title", e.target.value)}
                          placeholder="Title (optional)"
                          style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}
                        />

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                          <Btn
                            variant="secondary"
                            onClick={handleAutoGenerate}
                            disabled={autoGenerating}
                          >
                            {autoGenerating ? "Building..." : "Build Assignment"}
                          </Btn>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>
                            We will pick random questions from the {activeBankLabel.toLowerCase()} based on your filters.
                          </span>
                        </div>
                    </div>
                  </div>

                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>Question Availability</div>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>
                            Tracking unique questions already assigned in {selectedClassLabel}.
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{usedQuestionCount} used</span>
                          <Btn variant="secondary" disabled={catalogBusy} onClick={refreshQuestionStats}>
                            {catalogBusy ? 'Loading...' : 'Refresh'}
                          </Btn>
                        </div>
                      </div>
                      {catalogError && (
                        <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 12 }}>{catalogError}</div>
                      )}
                      {highlightStats ? (
                        <div style={{ marginTop: 10, fontSize: 13, color: '#374151' }}>
                          Current selection:&nbsp;
                          <strong>{findSubjectLabel(highlightStats.subject)}</strong>
                          {highlightStats.unit ? (
                            <>
                              {' · '}
                              <strong>{formatUnitLabel(highlightStats.subject, highlightStats.unit)}</strong>
                            </>
                          ) : null}
                          {highlightStats.lesson ? (
                            <>
                              {' · '}
                              <strong>{formatLessonLabel(highlightStats.subject, highlightStats.unit, highlightStats.lesson)}</strong>
                            </>
                          ) : null}
                          <div style={{ marginTop: 4 }}>
                            <span style={{ color: '#15803d', fontWeight: 600 }}>{highlightStats.remaining}</span>
                            {' '}of {highlightStats.total} remain unused in this class.
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
                          Select a unit and lesson to highlight its availability.
                        </div>
                      )}
                      {(!catalogLoaded && catalogBusy) ? (
                        <div style={{ marginTop: 12, color: '#6b7280' }}>Loading question counts...</div>
                      ) : questionStats.length === 0 ? (
                        <div style={{ marginTop: 12, color: '#6b7280' }}>
                          Question stats will appear once the {activeBankLabel.toLowerCase()} loads.
                        </div>
                      ) : (
                        <div style={{ marginTop: 12, overflowX: 'auto', overflowY: 'auto', maxHeight: 260 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: 8, textAlign: 'left' }}>Subject</th>
                                <th style={{ padding: 8, textAlign: 'left' }}>Unit</th>
                                <th style={{ padding: 8, textAlign: 'left' }}>Lesson</th>
                                <th style={{ padding: 8, textAlign: 'left' }}>Total</th>
                                <th style={{ padding: 8, textAlign: 'left' }}>Used (class)</th>
                                <th style={{ padding: 8, textAlign: 'left' }}>Remaining</th>
                              </tr>
                            </thead>
                            <tbody>
                              {questionStats.map((row) => {
                                const isHighlight = highlightKey && row.key === highlightKey;
                                return (
                                  <tr
                                    key={row.key}
                                    style={{
                                      borderBottom: '1px solid #e5e7eb',
                                      background: isHighlight ? '#fefce8' : 'transparent',
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

                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Resources</div>
                      {resLoading ? (
                        <div style={{ color: '#6b7280' }}>Loading…</div>
                      ) : resources.length === 0 ? (
                        <div style={{ color: '#6b7280' }}>No resources yet.</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                          {resources.map((r) => {
                            const key = r.id || `${r.title}_${r.url}`;
                            const meta = extractResourceMeta(r);
                            const questions = decodeResourceQuestions(r) || [];
                            const practiceMeta = { ...meta };
                            const kindLower = String(r.kind || "classwork").toLowerCase();
                            if (kindLower === "homework") {
                              practiceMeta.resumeMode = "restart";
                              practiceMeta.durationSec = null;
                            }
                            const practiceDuration = (typeof practiceMeta.durationSec === "number" && practiceMeta.durationSec > 0)
                              ? practiceMeta.durationSec
                              : null;
                            const previewRoute = ["exam", "sat", "diagnostic", "test"].includes(kindLower) ? "sat-exam" : "sat-assignment";
                            return (
                              <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ fontWeight: 700 }}>{r.title || 'Untitled Resource'}</div>
                                  <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{r.kind || 'classwork'}</span>
                                </div>
                                {(r.unit || r.lesson) && (
                                  <div style={{ color: '#6b7280', fontSize: 12 }}>
                                    {[r.unit, r.lesson].filter(Boolean).join(' - ')}
                                  </div>
                                )}
                                {r.url && (
                                  <div style={{ wordBreak: 'break-word', fontSize: 12 }}>
                                    <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{r.url}</a>
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
                                  {questions.length > 0 && <span style={{ ...pillStyles.base, ...pillStyles.info }}>Questions: {questions.length}</span>}
                                  <span style={{ ...pillStyles.base, ...pillStyles.info }}>Time: {formatDuration(practiceMeta?.durationSec)}</span>
                                  <span style={{ ...pillStyles.base, ...(practiceMeta?.allowRetake === false ? pillStyles.warn : pillStyles.info) }}>
                                    {practiceMeta?.allowRetake === false ? 'Single attempt' : 'Retakes allowed'}
                                  </span>
                                  <span style={{ ...pillStyles.base, ...(practiceMeta?.resumeMode === 'resume' ? pillStyles.complete : pillStyles.info) }}>
                                    {practiceMeta?.resumeMode === 'resume' ? 'Resume enabled' : 'Restart each time'}
                                  </span>
                                </div>
                                <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                                  {r.url && <Btn variant="secondary" onClick={() => window.open(r.url, '_blank')}>Open</Btn>}
                                  {questions.length > 0 && (
                                    <Btn
                                      variant="secondary"
                                      onClick={() => onNavigate(previewRoute, {
                                        practice: {
                                          kind: r.kind,
                                          resourceId: r.id,
                                          className: selectedClass,
                                          unit: r.unit || null,
                                          lesson: r.lesson || null,
                                          meta: practiceMeta,
                                          custom: {
                                            questions,
                                            title: r.title,
                                            durationSec: practiceDuration,
                                            meta: practiceMeta,
                                          },
                                        },
                                      })}
                                    >
                                      Preview
                                    </Btn>
                                  )}
                                  <Btn variant="back" onClick={() => deleteResource(r)}>Delete</Btn>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {classTab === 'analytics' && (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 700 }}>Recent Training Results</div>
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{logsLoading ? 'Loading…' : `${classLogs.length} record${classLogs.length === 1 ? '' : 's'}`}</div>
                    </div>
                    {classLogs.length === 0 ? (
                      <div style={{ color: '#6b7280', marginTop: 6 }}>No activity yet.</div>
                    ) : (
                      <div style={{ overflowX: 'auto', marginTop: 6 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                          <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                              <th style={{ padding: 10, textAlign: 'left' }}>Date</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Time</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Student</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Section</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Unit/Lesson</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Score</th>
                              <th style={{ padding: 10, textAlign: 'left' }}>Manage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classLogs.map((r) => {
                              const rw = r.summary?.rw;
                              const m = r.summary?.math;
                              let score = '-';
                              if (rw?.total || rw?.correct) score = `${rw.correct || 0}/${rw.total || 0}`;
                              if (m?.total || m?.correct) score = `${m.correct || 0}/${m.total || 0}`;
                              return (
                                <tr key={`${r.id || ''}_${r.ts}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                  <td style={{ padding: 10 }}>{fmtDate(r.ts)}</td>
                                  <td style={{ padding: 10 }}>{fmtDate(r.ts, true)}</td>
                                  <td style={{ padding: 10 }}>{r.user_email || '-'}</td>
                                  <td style={{ padding: 10 }}>{r.section || '-'}</td>
                                  <td style={{ padding: 10 }}>{r.unit || r.lesson || '-'}</td>
                                  <td style={{ padding: 10 }}>{score}</td>
                                  <td style={{ padding: 10 }}>
                                    <button
                                      type="button"
                                      onClick={() => openClassLog(r)}
                                      style={{ border: '1px solid #d1d5db', background: '#ffffff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
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
          )}
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      {/* Google Classroom-like banner */}
      <div style={{
        borderRadius: 16,
        background: "linear-gradient(135deg, #3b82f6, #14b8a6)",
        color: "#fff",
        padding: 20,
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>SAT Training</div>
        <div style={{ opacity: 0.9 }}>Practice by section and skill</div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <TabButton id="stream">Stream</TabButton>
          <TabButton id="classwork">Classwork</TabButton>
          <TabButton id="people">People</TabButton>
          {isAdmin && <TabButton id="admin">Admin</TabButton>}
        </div>
      </div>

      {/* STREAM */}
      {tab === "stream" && (
        <div style={{ display: "grid", gap: 12 }}>
          {streamPosts.map((p) => (
            <Card key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ marginTop: 0 }}>{p.title}</h3>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{p.ts}</div>
              </div>
              <p style={{ color: "#374151" }}>{p.body}</p>
            </Card>
          ))}
          <div>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </div>
      )}

            {/* CLASSWORK */}
      {tab === "classwork" && (
        <div style={{ display: "grid", gap: 16 }}>
          {isAdmin ? (
            classwork.map((section) => (
              <Card key={section.topic}>
                <h3 style={{ marginTop: 0 }}>{section.topic}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                  {section.items.map((it) => (
                    <div key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{it.title}</div>
                      <div style={{ color: "#6b7280", fontSize: 13, margin: "6px 0 10px" }}>{it.desc}</div>
                      <Btn variant="secondary" onClick={it.action}>Open Practice</Btn>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          ) : (
            <>
              {studentResLoading ? (
                <Card>
                  <p style={{ color: "#6b7280" }}>Loading assignments…</p>
                </Card>
              ) : (
                <>
                  {resourceGroupOrder.map((group) => {
                    const list = groupedStudentResources[group.key] || [];
                    if (!list.length) return null;
                    return (
                      <Card key={group.key}>
                        <h3 style={{ marginTop: 0 }}>{group.title}</h3>
                        {group.subtitle && <p style={{ color: "#6b7280", marginTop: 4 }}>{group.subtitle}</p>}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                          {list.map((res) => renderStudentResourceCard(res))}
                        </div>
                      </Card>
                    );
                  })}
                  {!hasAnyStudentResource && (
                    <Card>
                      <p style={{ color: "#6b7280" }}>No assignments yet. Check back soon!</p>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
          <div>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </div>
      )}{/* PEOPLE */}
      {tab === "people" && (
      <Card>
        <h3 style={{ marginTop: 0 }}>People</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {people.map((p, i) => (
            <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: "#6b7280" }}>{p.role}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
        </div>
      </Card>
    )}

      {viewClassLog && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeClassLog}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, width: 'min(820px, 94vw)', maxHeight: '85vh', overflowY: 'auto', padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0 }}>Submission Details</h3>
              <button
                type="button"
                onClick={closeClassLog}
                style={{ border: '1px solid #d1d5db', background: '#ffffff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 10, color: '#6b7280', display: 'grid', gap: 4 }}>
              <div><strong>Student:</strong> {viewClassLog.user_email || '—'}</div>
              <div>
                <strong>Section:</strong> {viewClassLog.section || '—'} &nbsp;·&nbsp;
                <strong>Unit:</strong> {viewClassLog.unit || '—'} &nbsp;·&nbsp;
                <strong>Lesson:</strong> {viewClassLog.lesson || '—'}
              </div>
              <div>
                <strong>Date:</strong> {fmtDate(viewClassLog.ts)} &nbsp;·&nbsp;
                <strong>Time:</strong> {fmtDate(viewClassLog.ts, true)}
              </div>
              <div><strong>Duration:</strong> {fmtDuration(Number(viewClassLog.elapsed_sec || 0))}</div>
            </div>

            {(() => {
              const cards = [];
              const addCard = (label, data) => {
                if (!data) return;
                const total = data.total || 0;
                const correct = data.correct || 0;
                const percent = total ? Math.round((correct / total) * 100) : null;
                cards.push(
                  <div key={label} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb' }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{correct}/{total}</div>
                    <div style={{ color: '#6b7280', marginTop: 2 }}>{percent != null ? `${percent}% correct` : 'No data'}</div>
                  </div>
                );
              };
              addCard('Reading & Writing', viewClassLog.summary?.rw);
              addCard('Math', viewClassLog.summary?.math);
              if (!cards.length) return null;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
                  {cards}
                </div>
              );
            })()}

            {viewClassLog.metrics && Object.keys(viewClassLog.metrics).length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                <h4 style={{ marginTop: 0 }}>Metrics</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: '#6b7280' }}>
                  {Object.entries(viewClassLog.metrics).map(([key, val]) => (
                    <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', background: '#f9fafb' }}>
                      <strong style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</strong>: {typeof val === 'number' ? Math.round(val * 100) / 100 : String(val)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <h4 style={{ margin: '0 0 8px 0' }}>Question Breakdown</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: 8, textAlign: 'left' }}>Question</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Selected</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Correct</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const answers = viewClassLog.answers || {};
                      const choices =
                        answers.choices ||
                        answers.custom ||
                        (viewClassLog.unit ? answers[viewClassLog.unit] : null) ||
                        answers[Object.keys(answers)[0] || ''] ||
                        {};
                      const times = answers.times || {};
                      const correct = answers.correct || {};
                      const keys = Object.keys(choices || {});
                      keys.sort((a, b) => {
                        const na = parseInt(String(a).replace(/\D+/g, ''), 10);
                        const nb = parseInt(String(b).replace(/\D+/g, ''), 10);
                        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
                        return String(a).localeCompare(String(b));
                      });
                      if (!keys.length) {
                        return (
                          <tr>
                            <td style={{ padding: 8, color: '#6b7280' }} colSpan={4}>No per-question data available.</td>
                          </tr>
                        );
                      }
                      return keys.map((key) => {
                        const chosen = choices[key];
                        const answer = correct[key];
                        const isCorrect =
                          chosen != null &&
                          answer != null &&
                          String(chosen).trim().toLowerCase() === String(answer).trim().toLowerCase();
                        return (
                          <tr key={key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: 8 }}>{key}</td>
                            <td style={{ padding: 8 }}>{chosen ?? '—'}</td>
                            <td style={{ padding: 8, color: chosen == null || answer == null ? '#6b7280' : isCorrect ? '#16a34a' : '#ef4444' }}>
                              {chosen == null || answer == null ? '—' : isCorrect ? 'Correct' : `Wrong (Ans: ${answer})`}
                            </td>
                            <td style={{ padding: 8 }}>{fmtDuration(Number(times[key] || 0))}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

  </PageWrap>
);
}

// Lightweight components for class stream (admin)
function ClassStreamList({ className }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { (async () => {
    try {
      const table = import.meta.env.VITE_CLASS_STREAM_TABLE || 'cg_class_stream';
      const { data, error } = await supabase.from(table).select('*').eq('class_name', className).order('ts', { ascending: false }).limit(200);
      if (error) throw error;
      setItems(data || []);
    } catch (e) { console.warn(e); setItems([]); }
    finally { setLoading(false); }
  })(); }, [className]);
  if (loading) return <div style={{ color: '#6b7280' }}>Loading stream…</div>;
  if (!items.length) return <div style={{ color: '#6b7280' }}>No posts yet.</div>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map(p => (
        <div key={p.id || p.ts} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontWeight: 700 }}>{p.author_email || 'Teacher'}</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>{p.ts ? new Date(p.ts).toLocaleString() : ''}</div>
          </div>
          <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{p.text}</div>
        </div>
      ))}
    </div>
  );
}

function StreamPostComposer({ className, userEmail, onPosted }) {
  const [text, setText] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const submit = async () => {
    const t = (text || '').trim();
    if (!t) return;
    setSaving(true);
    try {
      const table = import.meta.env.VITE_CLASS_STREAM_TABLE || 'cg_class_stream';
      const { error } = await supabase.from(table).insert({ class_name: className, text: t, author_email: userEmail });
      if (error) throw error;
      setText('');
      onPosted && onPosted({ text: t });
    } catch (e) { console.error(e); alert(e?.message || 'Failed to post'); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <textarea placeholder="Share an update with the class" value={text} onChange={(e)=>setText(e.target.value)}
        style={{ flex: 1, minHeight: 60, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8 }} />
      <Btn variant="primary" onClick={submit} disabled={saving}>Post</Btn>
    </div>
  );
}


