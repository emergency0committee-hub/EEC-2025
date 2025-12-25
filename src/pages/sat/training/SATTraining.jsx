// src/pages/sat/training/SATTraining.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../../../components/Btn.jsx";
import { PageWrap, HeaderBar, Card } from "../../../components/Layout.jsx";
import { supabase } from "../../../lib/supabase.js";
import { routeHref } from "../../../lib/routes.js";
import { fetchQuestionBankSample, fetchQuestionBankByIds } from "../../../lib/assignmentQuestions.js";
import {
  BANKS,
  mapBankQuestionToResource,
  SUBJECT_OPTIONS,
  MATH_UNIT_OPTIONS,
  MATH_LESSON_OPTIONS,
  HARDNESS_OPTIONS,
} from "../../../lib/questionBanks.js";
import PeopleCard from "./components/PeopleCard.jsx";
import CheckingAccessCard from "./components/CheckingAccessCard.jsx";
import AssignmentGateCard from "./components/AssignmentGateCard.jsx";
import ClassSubmissionModal from "./components/ClassSubmissionModal.jsx";
import StudentResourceCard from "./components/StudentResourceCard.jsx";
import LiveSessionCard from "./components/LiveSessionCard.jsx";
import AdminTabsPanel from "./components/AdminTabsPanel.jsx";
import StudentTabsPanel from "./components/StudentTabsPanel.jsx";

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

const SAT_INTERACTIVE_LESSONS = [
  { id: "func_decimals", title: "Fundamentals", route: "sat-lesson-functions-decimals" },
  { id: "polynomials", title: "Polynomials", route: "sat-lesson-polynomials" },
  { id: "solving_equations", title: "Solving Equations", route: "sat-lesson-solving-equations" },
  { id: "quadratics", title: "Quadratic Equations", route: "sat-lesson-quadratic-equations" },
  { id: "word_problems", title: "Word Problems", route: "sat-lesson-word-problems" },
];
const getTestSectionQuestionCount = (subject) =>
  String(subject || "")
    .trim()
    .toLowerCase() === "english"
    ? "27"
    : "22";

const defaultDurationForKind = (kind) => {
  const value = String(kind || "quiz").toLowerCase();
  if (value === "homework") return "";
  if (value === "quiz") return "15";
  if (value === "test") return "35";
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
  return match?.label?.EN || (value ? String(value) : "G");
};

const findMathUnitLabel = (value) => {
  if (!value) return "G";
  const match = MATH_UNIT_OPTIONS.find((opt) => opt.value === value);
  return match?.label?.EN || value;
};

const findMathLessonLabel = (unit, lesson) => {
  if (!lesson) return "G";
  const list = MATH_LESSON_OPTIONS[unit] || [];
  const match = list.find((opt) => opt.value === lesson);
  return match?.label?.EN || lesson;
};

const formatUnitLabel = (subject, unit) => {
  if (!unit) return "G";
  return normalizeKeyValue(subject) === "math" ? findMathUnitLabel(unit) : unit;
};

const formatLessonLabel = (subject, unit, lesson) => {
  if (!lesson) return "-";
  return normalizeKeyValue(subject) === "math" ? findMathLessonLabel(unit, lesson) : lesson;
};

const DEFAULT_DIFFICULTY =
  (HARDNESS_OPTIONS.find((opt) => opt.value === "medium") || HARDNESS_OPTIONS[0] || {}).value || "";

const RESOURCE_BUCKET =
  import.meta.env.VITE_CLASS_RESOURCE_BUCKET ||
  import.meta.env.VITE_ASSIGNMENT_MEDIA_BUCKET ||
  "assignment-media";
const RESOURCE_LIBRARY_TABLE = import.meta.env.VITE_RESOURCE_LIBRARY_TABLE || "cg_resource_library";
const LIVE_SESSION_TABLE = import.meta.env.VITE_LIVE_SESSION_TABLE || "cg_class_live_sessions";

const createDefaultAutoAssign = (bankId = "math") => {
  const bank = resolveBankConfig(bankId);
  const subject = bank.subjectLocked
    ? bank.defaultSubject
    : bank.defaultSubject || SUBJECT_OPTIONS[0]?.value || "math";
  const supportsMathUnits = bank.supportsUnitLesson && subject === "math";
  const unit = supportsMathUnits ? FIRST_MATH_UNIT : "";
  const lesson = supportsMathUnits ? firstLessonForUnit(unit) : "";
  const isTests = bank.id === "tests";
  const defaultCount = isTests ? getTestSectionQuestionCount(subject) : "10";
  return {
    bank: bank.id,
    subject,
    kind: isTests ? "test" : "quiz",
    questionCount: defaultCount,
    durationMin: defaultDurationForKind(isTests ? "test" : "quiz"),
    title: "",
    unit,
    lesson,
    difficulty: isTests ? DEFAULT_DIFFICULTY : "",
  };
};

const CLASS_ASSIGN_ON_CONFLICT = "student_email,class_name";
const needsLegacyConflictFallback = (error) => {
  if (!error) return false;
  const message = String(error.message || "");
  return /no unique|matching.*on conflict/i.test(message);
};

const missingDataWarnings = new Set();
const isMissingResourceError = (error) => {
  if (!error) return false;
  const code = String(error.code || "").toUpperCase();
  const message = String(error.message || "");
  if (code === "PGRST205" || code === "PGRST202" || code === "42P01") return true;
  return /does not exist/i.test(message) || /schema cache/i.test(message) || /not found/i.test(message);
};
const warnMissingSource = (key, error) => {
  if (missingDataWarnings.has(key)) return;
  missingDataWarnings.add(key);
  console.warn(`SAT Training: "${key}" data unavailable`, error?.message || error);
};

const parseMaybeJSON = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
};

export default function SATTraining({ onNavigate }) {
  SATTraining.propTypes = { onNavigate: PropTypes.func.isRequired };
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  // Admin session flag early so we can use it for initial UI
  const isAdmin = (() => { try { return localStorage.getItem("cg_admin_ok_v1") === "1"; } catch { return false; } })();

  // Declare all hooks unconditionally to keep hook order stable across renders
  const [tab, setTab] = useState("classwork"); // stream | classwork | people | admin

  // Classroom-like seed data
  const streamPosts = useMemo(() => ([
    { id: "p1", title: "Welcome to SAT Training", body: "Use Classwork to pick a topic. Practice sets are untimed.", ts: new Date().toLocaleString() },
    { id: "p2", title: "Tip", body: "Focus on 2-3 skills per session for best results.", ts: new Date().toLocaleString() },
  ]), []);

  const classwork = useMemo(() => ([
    {
      topic: "Math",
      items: [
        { id: "m_func_decimals_lesson", title: "Fundamentals (Interactive Lesson)", desc: "Order of ops, FOIL, LCM/GCF, and solving fractions.", action: () => onNavigate("sat-lesson-functions-decimals") },
        { id: "m_polynomials_lesson", title: "Polynomials (Interactive Lesson)", desc: "Interactive rules + moving demos + practice.", action: () => onNavigate("sat-lesson-polynomials") },
        { id: "m_solving_equations_lesson", title: "Solving Equations (Interactive Lesson)", desc: "Balance idea + inverse ops + practice.", action: () => onNavigate("sat-lesson-solving-equations") },
        { id: "m_quadratic_eq_lesson", title: "Quadratic Equations (Interactive Lesson)", desc: "Interactive rules + moving demos + practice.", action: () => onNavigate("sat-lesson-quadratic-equations") },
        { id: "m_word_problems_lesson", title: "Word Problems (Interactive Lesson)", desc: "Interactive rules + moving demos + practice.", action: () => onNavigate("sat-lesson-word-problems") },
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
  const [classDeleteBusy, setClassDeleteBusy] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [classEmails, setClassEmails] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [classLogs, setClassLogs] = useState([]);
  const [viewClassLog, setViewClassLog] = useState(null);
  const handleBackToClasses = () => {
    setSelectedClass("");
    setClassLogs([]);
    setClassEmails([]);
  };
  // Class sub-tabs (admin view)
  const [classTab, setClassTab] = useState("classwork"); // classwork | analytics | testing
  const [adminViewTab, setAdminViewTab] = useState("classwork"); // stream | classwork | people
  const [assignForm, setAssignForm] = useState({ email: "", className: "" });
  const [savingAssign, setSavingAssign] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkClassName, setBulkClassName] = useState("");
  const [bulkEmailsText, setBulkEmailsText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSelectedEmails, setBulkSelectedEmails] = useState([]);
  const [bulkSearch, setBulkSearch] = useState("");
  const [knownEmails, setKnownEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [peopleAddBusy, setPeopleAddBusy] = useState(false);

  const fmtDate = (iso, time = false) => {
    if (!iso) return "G";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "G";
      if (time) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString();
    } catch {
      return "G";
    }
  };

  const fmtDuration = (sec) => {
    const n = Number(sec);
    if (!Number.isFinite(n) || n < 0) return "G";
    const mm = Math.floor(n / 60).toString().padStart(2, "0");
    const ss = Math.floor(n % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Classwork resources
  const [resLoading, setResLoading] = useState(false);
  const [resourceLibrary, setResourceLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  // Student class & resources
  const [studentClass, setStudentClass] = useState("");
  const [studentResLoading, setStudentResLoading] = useState(false);
  const [studentResources, setStudentResources] = useState([]);
  const [studentAttempts, setStudentAttempts] = useState({});
  const [studentChatRefresh, setStudentChatRefresh] = useState(0);
  const [adminChatRefresh, setAdminChatRefresh] = useState(0);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSession, setLiveSession] = useState(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveTableMissing, setLiveTableMissing] = useState(false);
  const resourceKind = (res) => String(res?.payload?.kindOverride || res?.kind || "classwork").toLowerCase();

  const loadLiveSession = useCallback(async (className, { silent = false } = {}) => {
    const cls = String(className || "").trim();
    if (!cls) {
      setLiveSession(null);
      setLiveTableMissing(false);
      return;
    }
    if (!silent) {
      setLiveSession(null);
      setLiveLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from(LIVE_SESSION_TABLE)
        .select("*")
        .eq("class_name", cls)
        .maybeSingle();
      if (error) {
        if (isMissingResourceError(error)) {
          warnMissingSource(LIVE_SESSION_TABLE, error);
          setLiveSession(null);
          setLiveTableMissing(true);
          return;
        }
        throw error;
      }
      setLiveSession(data || null);
      setLiveTableMissing(false);
    } catch (e) {
      console.warn("load live session", e);
      setLiveSession(null);
    } finally {
      if (!silent) setLiveLoading(false);
    }
  }, []);

  const groupedStudentResources = useMemo(() => {
    const groups = {
      exam: [],
      quiz: [],
      classwork: [],
      homework: [],
      lesson: [],
      other: [],
    };
    (studentResources || []).forEach((resource) => {
      const kind = resourceKind(resource);
      if (["exam", "sat", "test", "practice"].includes(kind)) {
        groups.exam.push(resource);
      } else if (kind === "quiz") {
        groups.quiz.push(resource);
      } else if (kind === "homework") {
        groups.homework.push(resource);
      } else if (kind === "lesson") {
        groups.lesson.push(resource);
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
      ["exam", "quiz", "classwork", "homework", "lesson", "other"].some((key) => (groupedStudentResources[key] || []).length > 0),
    [groupedStudentResources],
  );
  const [autoAssign, setAutoAssign] = useState(() => createDefaultAutoAssign("math"));
  const [autoGenerating, setAutoGenerating] = useState(false);
  useEffect(() => {
    if (classTab === "testing") {
      setAutoAssign((prev) => {
        if (prev.bank === "tests") return prev;
        const next = { ...prev };
        next.bank = "tests";
        next.kind = "test";
        next.durationMin = defaultDurationForKind("test");
        next.difficulty = next.difficulty || DEFAULT_DIFFICULTY;
        if (!next.subject || !["math", "english"].includes(String(next.subject).toLowerCase())) {
          next.subject = "math";
        }
        next.questionCount = getTestSectionQuestionCount(next.subject);
        return next;
      });
    }
  }, [classTab]);

  const openClassLog = (row) => setViewClassLog(row);
  const closeClassLog = () => setViewClassLog(null);
  const handleDeleteClassLog = useCallback(
    async (logId) => {
      if (!isAdmin || !logId) return;
      const ok = window.confirm("Delete this submission record?");
      if (!ok) return;
      try {
        const table = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
        const { error } = await supabase.from(table).delete().eq("id", logId);
        if (error) throw error;
        setClassLogs((logs) => logs.filter((log) => log.id !== logId));
        if (viewClassLog?.id === logId) {
          setViewClassLog(null);
        }
        alert("Submission deleted.");
      } catch (err) {
        console.error(err);
        alert(err?.message || "Failed to delete submission.");
      }
    },
    [isAdmin, viewClassLog?.id],
  );

  const DEFAULT_META = {
    classwork: { durationSec: 20 * 60, allowRetake: true, resumeMode: "restart", attemptLimit: null },
    homework: { durationSec: null, allowRetake: true, resumeMode: "resume", attemptLimit: null },
    quiz: { durationSec: 15 * 60, allowRetake: false, resumeMode: "restart", attemptLimit: 1 },
    test: { durationSec: 35 * 60, allowRetake: false, resumeMode: "restart", attemptLimit: 1 },
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

  const handleDeleteClass = useCallback(
    async (className) => {
      if (!isAdmin || !className || className === "(Unassigned)") return;
      const ok = window.confirm(
        `Delete class "${className}"? This removes its roster assignments, resources, and class chat.`
      );
      if (!ok) return;
      setClassDeleteBusy(className);
      try {
        const assignTable = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        await supabase.from(assignTable).delete().eq("class_name", className);

        const resTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
        await supabase.from(resTable).delete().eq("class_name", className);

        const streamTable = import.meta.env.VITE_CLASS_STREAM_TABLE || "cg_class_stream";
        try {
          await supabase.from(streamTable).delete().eq("class_name", className);
        } catch (err) {
          console.warn("delete class stream", err);
        }

        setClasses((list) => list.filter((cls) => cls.name !== className));
        if (selectedClass === className) {
          setSelectedClass("");
          setClassLogs([]);
          setClassEmails([]);
        }
        alert(`Class "${className}" deleted.`);
      } catch (error) {
        console.error(error);
        alert(error?.message || "Failed to delete class.");
      } finally {
        setClassDeleteBusy("");
      }
    },
    [isAdmin, selectedClass]
  );

  const loadKnownEmails = useCallback(async () => {
    if (!isAdmin) {
      setKnownEmails([]);
      return;
    }
    setLoadingEmails(true);
    try {
      const emailMap = new Map();
      const addEmail = (value, extra = {}) => {
        if (!value) return;
        const email = String(value).trim();
        if (!email) return;
        const existing = emailMap.get(email) || {};
        emailMap.set(email, {
          email,
          name: extra.name || existing.name || "",
          school: extra.school || existing.school || "",
        });
      };

      const safeCollect = async (label, executor) => {
        try {
          await executor();
        } catch (err) {
          if (isMissingResourceError(err)) {
            warnMissingSource(label, err);
          } else {
            console.warn(`load known emails (${label})`, err);
          }
        }
      };

      await safeCollect("list_user_emails RPC", async () => {
        const rpc = await supabase.rpc("list_user_emails");
        if (rpc.error) {
          if (isMissingResourceError(rpc.error)) {
            warnMissingSource("list_user_emails RPC", rpc.error);
            return;
          }
          console.warn("list_user_emails RPC", rpc.error);
          return;
        }
        (rpc.data || []).forEach((entry) => {
          if (entry?.role && String(entry.role).toLowerCase().includes("educator")) return;
          addEmail(entry?.email, { name: entry?.name, school: entry?.school });
        });
      });

      await safeCollect("profiles", async () => {
        const pr = await supabase
          .from("profiles")
          .select(
            "email, school, school_name, schoolname, organization, org, company, class_name, name, full_name, username"
          )
          .limit(5000);
        if (pr.error) {
          console.warn("profiles email fetch", pr.error);
          return;
        }
        (pr.data || []).forEach((entry) => {
          const role = String(entry?.role || entry?.accountType || "").toLowerCase();
          if (role.includes("educator")) return;
          addEmail(entry?.email, {
            school:
              entry?.school ||
              entry?.school_name ||
              entry?.schoolname ||
              entry?.organization ||
              entry?.org ||
              entry?.company ||
              entry?.class_name ||
              "",
            name: entry?.name || entry?.full_name || entry?.username,
          });
        });
      });

      await safeCollect("class assignments", async () => {
        const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        const ar = await supabase.from(table).select("student_email").limit(5000);
        if (ar.error) {
          if (isMissingResourceError(ar.error)) {
            warnMissingSource(table, ar.error);
            return;
          }
          console.warn("assignments email fetch", ar.error);
          return;
        }
        (ar.data || []).forEach((entry) => addEmail(entry?.student_email));
      });

      await safeCollect("cg_sat_training", async () => {
        const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
        const tr = await supabase.from(tTable).select("user_email").limit(5000);
        if (tr.error) {
          if (isMissingResourceError(tr.error)) {
            warnMissingSource(tTable, tr.error);
            return;
          }
          console.warn("training email fetch", tr.error);
          return;
        }
        (tr.data || []).forEach((entry) => addEmail(entry?.user_email));
      });

      await safeCollect("cg_submissions", async () => {
        const sTable = import.meta.env.VITE_SUBMISSIONS_TABLE || "cg_submissions";
        const sr = await supabase.from(sTable).select("user_email").limit(5000);
        if (sr.error) {
          if (isMissingResourceError(sr.error)) {
            warnMissingSource(sTable, sr.error);
            return;
          }
          console.warn("submissions email fetch", sr.error);
          return;
        }
        (sr.data || []).forEach((entry) => addEmail(entry?.user_email));
      });

      const list = Array.from(emailMap.values()).filter((e) => e.email);
      list.sort((a, b) => a.email.localeCompare(b.email));
      setKnownEmails(list);
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

  const parseEmails = (text) =>
    Array.from(
      new Set(
        (text || "")
          .split(/[\n,;\s]+/)
          .map((e) => e.trim())
          .filter((e) => e && /\S+@\S+\.\S+/.test(e))
      )
    );

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

  const saveBulkAssignments = async () => {
    if (!isAdmin) return;
    const className = (bulkClassName || "").trim();
    const emails = bulkSelectedEmails.length
      ? Array.from(new Set(bulkSelectedEmails.map((e) => e.email)))
      : parseEmails(bulkEmailsText);
    if (!className) {
      alert("Enter a class name.");
      return;
    }
    if (!emails.length) {
      alert("Add at least one valid student email (one per line or separated by commas).");
      return;
    }
    setBulkSaving(true);
    try {
      const { data: me } = await supabase.auth.getUser();
      const adminEmail = me?.user?.email || null;
      const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
      const payloads = emails.map((email) => ({
        student_email: email,
        class_name: className,
        assigned_by: adminEmail,
      }));
      let { error } = await supabase
        .from(table)
        .upsert(payloads, { onConflict: CLASS_ASSIGN_ON_CONFLICT });
      if (needsLegacyConflictFallback(error)) {
        // Fallback: delete + insert one by one
        for (const payload of payloads) {
          try { await supabase.from(table).delete().eq("student_email", payload.student_email).eq("class_name", payload.class_name); } catch {}
          const res = await supabase.from(table).insert(payload);
          if (res.error) throw res.error;
        }
        error = null;
      }
      if (error) throw error;
      setBulkEmailsText("");
      setBulkSelectedEmails([]);
      setBulkClassName("");
      setBulkModalOpen(false);
      await loadClasses();
      if (selectedClass && className === selectedClass) {
        await refreshClassData();
      }
      alert(`Added ${emails.length} student${emails.length === 1 ? "" : "s"} to ${className}.`);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to save bulk assignments.");
    } finally {
      setBulkSaving(false);
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

  const resolveResourceMetaSource = (resource) => {
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
  };

  const extractResourceMeta = (resource) => {
    const meta = baseMeta(resource?.kind);
    const src = resolveResourceMetaSource(resource);
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

  const listLooksLikeRefs = (items) => Array.isArray(items) && items.length > 0 && items.every((item) => item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, "questionId"));

  const cloneItems = (items) => (Array.isArray(items) ? items.map((item) => ({ ...item })) : []);

  const getResourceQuestions = (resource) => {
    try {
      if (Array.isArray(resource?.payload?.items)) {
        const raw = resource.payload.items;
        if (listLooksLikeRefs(raw)) return cloneItems(raw);
        return normalizeResourceItems(raw);
      }
      if (resource?.url && String(resource.url).startsWith("data:application/json")) {
        const base64 = String(resource.url).split(",")[1] || "";
        const json = decodeURIComponent(escape(window.atob(base64)));
        const obj = JSON.parse(json);
        if (Array.isArray(obj.items)) {
          if (listLooksLikeRefs(obj.items)) return cloneItems(obj.items);
          return normalizeResourceItems(obj.items);
        }
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
  const liveLessonOptions = useMemo(() => {
    const items = [];
    (resources || []).forEach((resource) => {
      if (!resource) return;
      if (resourceKind(resource) !== "lesson") return;
      const id = resource.id == null ? "" : String(resource.id);
      if (!id) return;
      const url = String(resource.url || resource?.payload?.url || "").trim();
      const title = String(resource.title || resource?.payload?.title || "").trim();
      items.push({ id, title, url });
    });
    items.sort((a, b) => (a.title || a.url || a.id).localeCompare(b.title || b.url || b.id));
    return items;
  }, [resources]);
  const bankCatalogRef = useRef({});
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [catalogLoadingBank, setCatalogLoadingBank] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const activeBank = useMemo(() => resolveBankConfig(autoAssign.bank), [autoAssign.bank]);
  const activeSubject = activeBank.subjectLocked
    ? activeBank.defaultSubject
    : autoAssign.subject || activeBank.defaultSubject || SUBJECT_OPTIONS[0]?.value || "math";
  const isTestBank = activeBank.id === "tests";
  const showMathSelectors = activeBank.supportsUnitLesson && activeSubject === "math" && !isTestBank;
  const showDifficultySelector = isTestBank && activeSubject === "math";
  const activeLessons = MATH_LESSON_OPTIONS[autoAssign.unit] || [];
  const subjectDisplayLabel =
    SUBJECT_OPTIONS.find((opt) => opt.value === activeSubject)?.label?.EN || activeSubject;
  const activeBankLabel = BANK_LABELS[activeBank.id] || "Question Bank";

  const usedQuestionIds = useMemo(() => {
    const ids = new Set();
    const targetBank = String(activeBank.id || "").toLowerCase();
    (resources || []).forEach((resource) => {
      const metaSrc = resolveResourceMetaSource(resource) || {};
      const resourceBank = String(
        metaSrc.questionBank || metaSrc.question_bank || resource?.bank || resource?.payload?.bank || ""
      )
        .trim()
        .toLowerCase();
      if (targetBank && resourceBank && resourceBank !== targetBank) return;
      const questions = getResourceQuestions(resource) || [];
      questions.forEach((question) => {
        let key = null;
        if (question?.id != null) key = String(question.id);
        else if (question?.questionId != null) key = String(question.questionId);
        if (key) ids.add(key);
      });
    });
    return ids;
  }, [resources, activeBank.id]);
  const [questionTextCache, setQuestionTextCache] = useState({});
  const [questionDataCache, setQuestionDataCache] = useState({});
  const resourceQuestionDataMap = useMemo(() => {
    const map = new Map();
    (resources || []).forEach((resource) => {
      const resourceId = resource?.id;
      if (resourceId == null) return;
      const questions = getResourceQuestions(resource) || [];
      if (!questions.length) return;
      const questionMetaSource =
        (resource?.payload &&
          typeof resource.payload === "object" &&
          ((resource.payload.meta && typeof resource.payload.meta === "object" && resource.payload.meta) ||
            (resource.payload.settings && typeof resource.payload.settings === "object" && resource.payload.settings))) ||
        (resource?.meta && typeof resource.meta === "object" && resource.meta) ||
        (resource?.settings && typeof resource.settings === "object" && resource.settings) ||
        null;
      const refsLikely = questions.every((item) => item && item.questionId);
      const referenceBank = questions.find((item) => item && item.bank)?.bank || null;
      const derivedBank =
        (questionMetaSource && (questionMetaSource.questionBank || questionMetaSource.bank)) || referenceBank || null;
      const entry = {
        texts: {},
        data: {},
        bankByQuestion: {},
        unresolved: new Set(),
        defaultBank: derivedBank,
      };
      questions.forEach((question, idx) => {
        if (!question) return;
        const qid =
          question.id ??
          question.questionId ??
          question.question_id ??
          `q_${idx + 1}`;
        if (qid == null) return;
        const rawText = question.text ?? question.question ?? question.prompt ?? question.title ?? "";
        const trimmed = typeof rawText === "string" ? rawText.trim() : "";
        if (trimmed) {
          entry.texts[qid] = trimmed;
          const choiceEntries = [
            { value: "A", label: question.answer_a || question.answerA || "" },
            { value: "B", label: question.answer_b || question.answerB || "" },
            { value: "C", label: question.answer_c || question.answerC || "" },
            { value: "D", label: question.answer_d || question.answerD || "" },
          ].filter((c) => String(c.label || "").trim().length > 0);
          if (choiceEntries.length) {
            entry.data[qid] = { text: trimmed, choices: choiceEntries };
          }
        } else if (question.questionId || refsLikely) {
          entry.unresolved.add(String(qid));
        }
        const qBank = question.bank || question.questionBank || derivedBank;
        if (qBank) entry.bankByQuestion[qid] = qBank;
      });
      map.set(String(resourceId), entry);
    });
    return map;
  }, [resources]);
  useEffect(() => {
    const pending = new Map();
    const addPending = (bankId, qid) => {
      if (!bankId) return;
      const key = String(qid || "");
      if (!key || questionTextCache[key] || questionDataCache[key]) return;
      if (!pending.has(bankId)) pending.set(bankId, new Set());
      pending.get(bankId).add(key);
    };
    resourceQuestionDataMap.forEach((entry) => {
      if (!entry) return;
      entry.unresolved.forEach((qid) => {
        const bank = entry.bankByQuestion[qid] || entry.defaultBank;
        addPending(bank, qid);
      });
    });
    const gatherFromLog = (log) => {
      if (!log) return;
      const answers = parseMaybeJSON(log.answers);
      const metrics = parseMaybeJSON(log.metrics);
      const meta = {
        ...(log.meta || {}),
        ...(answers?.meta || {}),
      };
      const questionRefs =
        meta.questionRefs ??
        meta.question_refs ??
        false;
      const baseBank =
        meta.questionBank ||
        meta.question_bank ||
        null;
      const perQuestionBank =
        meta.questionBanks ||
        meta.questionBankMap ||
        null;
      const keys = new Set([
        ...Object.keys(answers?.choices || {}),
        ...Object.keys(metrics?.choices || {}),
        ...Object.keys(answers?.correct || {}),
        ...Object.keys(metrics?.correct || {}),
      ]);
      const lookupEntry =
        log.resource_id != null ? resourceQuestionDataMap.get(String(log.resource_id)) : null;
      keys.forEach((qid) => {
        if (!qid) return;
        const bank =
          (perQuestionBank && perQuestionBank[qid]) ||
          baseBank ||
          lookupEntry?.bankByQuestion?.[qid] ||
          lookupEntry?.defaultBank ||
          null;
        const refsEnabled =
          questionRefs ||
          Boolean(perQuestionBank && perQuestionBank[qid]) ||
          Boolean(lookupEntry?.bankByQuestion?.[qid]) ||
          Boolean(lookupEntry?.defaultBank);
        if (!refsEnabled) return;
        addPending(bank, qid);
      });
    };
    classLogs.forEach(gatherFromLog);
    if (viewClassLog) gatherFromLog(viewClassLog);
    if (!pending.size) return;
    let cancelled = false;
    (async () => {
      const newTexts = {};
      const newData = {};
      for (const [bankId, idSet] of pending.entries()) {
        const config = resolveBankConfig(bankId);
        if (!config?.table) continue;
        try {
          const rows = await fetchQuestionBankByIds({ table: config.table, ids: Array.from(idSet) });
          const mapped = rows.map(mapBankQuestionToResource).filter(Boolean);
          mapped.forEach((item) => {
            const idKey = item?.id != null ? String(item.id) : null;
            if (!idKey) return;
            const text = (item.text || "").trim();
            if (text) newTexts[idKey] = text;
            newData[idKey] = { text: item.text || "", choices: item.choices || [] };
          });
        } catch (err) {
          if (!cancelled) console.warn("question text load", bankId, err);
        }
      }
      if (!cancelled && Object.keys(newTexts).length > 0) {
        setQuestionTextCache((prev) => ({ ...prev, ...newTexts }));
      }
      if (!cancelled && Object.keys(newData).length > 0) {
        setQuestionDataCache((prev) => ({ ...prev, ...newData }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resourceQuestionDataMap, classLogs, viewClassLog, questionTextCache, questionDataCache]);
  const resolveQuestionText = useCallback(
    (logRow, questionKey) => {
      if (!logRow || questionKey == null) return null;
      const key = String(questionKey);
      const answersSource = logRow.answers || {};
      const resourceId = logRow.resource_id || answersSource.resourceId;
      if (resourceId != null) {
        const entry = resourceQuestionDataMap.get(String(resourceId));
        if (entry) {
          if (entry.data?.[key]?.text) return entry.data[key].text;
          if (entry.texts[key]) return entry.texts[key];
        }
      }
      if (questionDataCache[key]?.text) return questionDataCache[key].text;
      if (questionTextCache[key]) return questionTextCache[key];
      const directMap = answersSource.questionTexts || answersSource.question_texts;
      if (directMap && directMap[key]) return directMap[key];
      const metricsSource = logRow.metrics || {};
      const metricMap = metricsSource.questionTexts || metricsSource.question_texts;
      if (metricMap && metricMap[key]) return metricMap[key];
      if (questionTextCache[key]) return questionTextCache[key];
      if (questionDataCache[key]?.text) return questionDataCache[key].text;
      if (resourceId != null) {
        const entry = resourceQuestionDataMap.get(String(resourceId));
        if (entry) {
          if (entry.texts[key]) return entry.texts[key];
        }
      }
      return null;
    },
    [resourceQuestionDataMap, questionTextCache, questionDataCache],
  );
  const resolveQuestionData = useCallback(
    (logRow, questionKey) => {
      if (!logRow || questionKey == null) return null;
      const key = String(questionKey);
      const resourceId = logRow.resource_id || (logRow.answers || {})?.resourceId;
      if (resourceId != null) {
        const entry = resourceQuestionDataMap.get(String(resourceId));
        if (entry?.data?.[key]) return entry.data[key];
      }
      if (questionDataCache[key]) return questionDataCache[key];
      const text = resolveQuestionText(logRow, questionKey);
      if (text) return { text, choices: [] };
      return null;
    },
    [resourceQuestionDataMap, questionDataCache, resolveQuestionText],
  );
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
        if (bank.id === "tests") {
          next.kind = "test";
          next.durationMin = defaultDurationForKind("test");
          next.difficulty = next.difficulty || DEFAULT_DIFFICULTY;
        } else {
          if (next.kind === "test") {
            next.kind = "quiz";
            next.durationMin = defaultDurationForKind("quiz");
          }
          next.difficulty = "";
        }
      } else if (field === "subject") {
        const normalizedSubject = String(value || "").trim().toLowerCase();
        next.subject = normalizedSubject || "";
        const bankConfig = resolveBankConfig(next.bank);
        if (bankConfig.id === "tests") {
          next.questionCount = getTestSectionQuestionCount(normalizedSubject || bankConfig.defaultSubject || "math");
        }
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
      } else if (field === "difficulty") {
        next.difficulty = String(value || "");
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

      const isTestBank = activeBank.id === "tests";
      const editingDuration = field === "durationMin";
      if (isTestBank) {
        next.kind = "test";
        if (!editingDuration && !next.durationMin) {
          next.durationMin = defaultDurationForKind("test");
        }
        next.questionCount = getTestSectionQuestionCount(subjectValue);
        if (subjectValue === "math" && !next.difficulty) {
          next.difficulty = DEFAULT_DIFFICULTY;
        } else if (subjectValue !== "math") {
          next.difficulty = "";
        }
      } else {
        if (next.kind === "test") {
          next.kind = "quiz";
          next.durationMin = defaultDurationForKind("quiz");
        }
        if (next.difficulty && subjectValue !== "math") {
          next.difficulty = "";
        }
      }

      if (field === "bank") {
        if (isTestBank) {
          next.difficulty = next.difficulty || DEFAULT_DIFFICULTY;
          next.questionCount = getTestSectionQuestionCount(subjectValue);
        } else {
          next.difficulty = "";
        }
      }

      const supportsMathUnits = activeBank.supportsUnitLesson && subjectValue === "math" && !isTestBank;
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
    let subject = bank.subjectLocked
      ? bank.defaultSubject
      : autoAssign.subject || bank.defaultSubject || SUBJECT_OPTIONS[0]?.value || "math";
    if (bank.id === "tests") {
      const normalized = String(subject || "").trim().toLowerCase();
      if (normalized !== "math" && normalized !== "english") {
        alert("Select math or english before generating a test.");
        return;
      }
      subject = normalized;
    }
    const isTestBank = bank.id === "tests";
    const supportsMathUnits = bank.supportsUnitLesson && subject === "math" && !isTestBank;
    const showDifficultySelector = isTestBank && subject === "math";
    const unitValue = supportsMathUnits ? autoAssign.unit : "";
    const lessonValue = supportsMathUnits ? autoAssign.lesson : "";
    let requestedCount = Number.parseInt(autoAssign.questionCount, 10);
    if (isTestBank) {
      const targetCount = Number(getTestSectionQuestionCount(subject));
      requestedCount = targetCount;
      setAutoAssign((prev) =>
        prev.questionCount === String(targetCount) ? prev : { ...prev, questionCount: String(targetCount) }
      );
    }
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
    const difficultyValue = showDifficultySelector
      ? autoAssign.difficulty || DEFAULT_DIFFICULTY
      : "";
    if (showDifficultySelector && !difficultyValue) {
      alert("Pick a difficulty level.");
      return;
    }

    const questionLimit = Math.min(Math.max(requestedCount, 1), 200);
    setAutoGenerating(true);
    try {
      const enforceStrict = Boolean(supportsMathUnits && unitValue && lessonValue);
      const rows = await fetchQuestionBankSample({
        table: bank.table,
        subject,
        unit: supportsMathUnits ? unitValue : undefined,
        lesson: supportsMathUnits ? lessonValue : undefined,
        hardness: difficultyValue || undefined,
        limit: questionLimit,
        strictFilters: enforceStrict,
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

      const availableCount = freshItems.length;
      let finalCount = Math.min(Math.max(requestedCount, 1), availableCount);
      if (availableCount === 0 || finalCount === 0) {
        alert("No unused questions remain for the selected filters.");
        return;
      }
      if (requestedCount > availableCount) {
        alert(`Only ${availableCount} unused question${availableCount === 1 ? "" : "s"} are available. We'll use ${availableCount}.`);
      }
      let items;
      if (isTestBank) {
        const bucketMap = new Map();
        freshItems.forEach((item) => {
          const key = String(item.skill || item.lesson || item.subject || "general").trim().toLowerCase() || "general";
          if (!bucketMap.has(key)) bucketMap.set(key, []);
          bucketMap.get(key).push(item);
        });
        const bucketKeys = Array.from(bucketMap.keys()).sort();
        const roundRobin = [];
        let cursor = 0;
        while (roundRobin.length < finalCount && bucketKeys.length > 0) {
          const key = bucketKeys[cursor % bucketKeys.length];
          const bucket = bucketMap.get(key);
          if (!bucket || bucket.length === 0) {
            bucketKeys.splice(cursor % bucketKeys.length, 1);
            continue;
          }
          roundRobin.push(bucket.shift());
          cursor += 1;
        }
        if (roundRobin.length < finalCount) {
          const seen = new Set(roundRobin.map((item) => item?.id && String(item.id)));
          for (const item of freshItems) {
            const key = item?.id && String(item.id);
            if (seen.has(key)) continue;
            roundRobin.push(item);
            if (roundRobin.length >= finalCount) break;
          }
        }
        items = roundRobin;
      } else {
        items = freshItems.slice(0, finalCount);
      }
      const referenceItems = items.map((item) => ({
        id: item.id,
        questionId: item.id,
        bank: bank.id,
        subject,
        difficulty: showDifficultySelector ? difficultyValue : null,
      }));

      const kindLabel = String(autoAssign.kind || "quiz").toLowerCase();
      const titleBase = (autoAssign.title || "").trim();
      const normalizedSubject = (subject || "").trim().toLowerCase();
      const subjectPrefix = normalizedSubject === "english" ? "English" : "Math";
      const unitToken = supportsMathUnits && unitValue ? unitValue : "general";
      const lessonToken = supportsMathUnits && lessonValue ? lessonValue : "lesson";
      const autogeneratedTitle = `${subjectPrefix}_${unitToken}_${lessonToken}_${kindLabel}`;
      const title = titleBase || autogeneratedTitle;
      const durationInput = kindLabel === "homework" ? "" : autoAssign.durationMin;

      const metaExtras = {
        questionBank: bank.id,
        subject,
        unit: supportsMathUnits ? unitValue : null,
        lesson: supportsMathUnits ? lessonValue : null,
        source: "question-bank",
        difficulty: showDifficultySelector ? difficultyValue : null,
      };

      const inserted = await saveResource({
        items: referenceItems,
        kind: kindLabel,
        title,
        unit: supportsMathUnits ? unitValue : null,
        lesson: supportsMathUnits ? lessonValue : null,
        durationInput,
        metaExtras: { ...metaExtras, questionRefs: true },
      });
      setResources((list) => [inserted, ...list]);
      setAutoAssign((prev) => ({
        ...prev,
        title: "",
        questionCount: String(items.length),
      }));
      alert(`Assignment created with ${items.length} question${items.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      alert(error?.message || "Failed to build assignment from the question bank.");
    } finally {
      setAutoGenerating(false);
    }
  }

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
  const classInsights = useMemo(() => {
    if (!Array.isArray(classLogs) || !classLogs.length) return [];
    const buckets = new Map();
    const recentWindow = 5;

    classLogs.forEach((log, idx) => {
      const ts = log.ts ? new Date(log.ts).getTime() : Date.now() - idx;
      const answersMeta = (log.answers && log.answers.meta) || {};
      const baseUnit = log.unit || answersMeta.unit || "";
      const baseLesson = log.lesson || answersMeta.lesson || "";

      const pushEntry = (subjectKey, correct, total, unit = "", lesson = "") => {
        if (!total || total <= 0) return;
        const meta = { subject: subjectKey || "", unit: unit || "", lesson: lesson || "" };
        const bucketKey = buildStatKey(meta);
        let bucket = buckets.get(bucketKey);
        if (!bucket) {
          bucket = {
            key: bucketKey,
            meta,
            correct: 0,
            total: 0,
            count: 0,
            attempts: [],
            lastTs: ts,
          };
          buckets.set(bucketKey, bucket);
        }
        bucket.correct += correct;
        bucket.total += total;
        bucket.count += 1;
        bucket.attempts.push({ accuracy: total > 0 ? correct / total : 0, ts });
        bucket.lastTs = Math.max(bucket.lastTs, ts);
      };

      const summary = log.summary || {};
      if (summary.math) {
        const { correct = 0, total = 0 } = summary.math;
        pushEntry("math", correct, total, baseUnit, baseLesson);
      }
      if (summary.rw) {
        const { correct = 0, total = 0 } = summary.rw;
        pushEntry("rw", correct, total, "", "");
      }
    });

    const insights = Array.from(buckets.values())
      .filter((bucket) => bucket.total >= 8)
      .map((bucket) => {
        const sortedAttempts = bucket.attempts.sort((a, b) => b.ts - a.ts);
        const recent = sortedAttempts.slice(0, recentWindow);
        const earlier = sortedAttempts.slice(recentWindow, recentWindow * 2);
        const average = (list) => {
          if (!list.length) return null;
          const sum = list.reduce((acc, item) => acc + (item.accuracy || 0), 0);
          return sum / list.length;
        };
        const recentAvg = average(recent);
        const priorAvg = average(earlier);
        const trend = priorAvg != null && recentAvg != null ? recentAvg - priorAvg : null;
        return {
          key: bucket.key,
          subject: bucket.meta.subject,
          unit: bucket.meta.unit,
          lesson: bucket.meta.lesson,
          accuracy: bucket.total > 0 ? bucket.correct / bucket.total : 0,
          totalQuestions: bucket.total,
          attemptCount: bucket.count,
          recentAccuracies: recent.map((item) => item.accuracy),
          trend,
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy);

    return insights;
  }, [classLogs]);
  const refreshClassData = useCallback(async () => {
    if (!isAdmin || !selectedClass) return;
    try {
      // Load student emails
      const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
      const { data, error } = await supabase.from(table).select("student_email").eq("class_name", selectedClass).limit(5000);
      if (error) throw error;
      const emails = Array.from(new Set((data || []).map((r) => r.student_email).filter(Boolean)));
      setClassEmails(emails);
      // Load logs
      setLogsLoading(true);
      try {
        if (emails.length > 0) {
          const tTable = import.meta.env.VITE_SAT_TRAINING_TABLE || "cg_sat_training";
          const { data: logs, error: lerr } = await supabase
            .from(tTable)
            .select("*")
            .in("user_email", emails)
            .order("ts", { ascending: false })
            .limit(500);
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
  }, [isAdmin, selectedClass]);

  useEffect(() => {
    refreshClassData();
  }, [refreshClassData]);

  useEffect(() => {
    if (!isAdmin) return;
    const cls = String(selectedClass || "").trim();
    if (!cls) {
      setLiveSession(null);
      setLiveTableMissing(false);
      return;
    }
    loadLiveSession(cls);
  }, [isAdmin, selectedClass, loadLiveSession]);

  const deleteResource = async (row) => {
    if (!row) return;
    const ok = window.confirm(`Delete resource "${row.title || ''}"?`);
    if (!ok) return;
    try {
      const rTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
      const { error } = await supabase.from(rTable).delete().eq("id", row.id);
      if (error) throw error;
      // best-effort delete from storage if we own the object (public URL under our bucket)
      try {
        const url = row.url || (row && row.payload && row.payload.url);
        const bucket = RESOURCE_BUCKET;
        if (url && bucket) {
          const { data } = supabase.storage.from(bucket).getPublicUrl("");
          const base = (data && data.publicUrl) || "";
          if (base && url.startsWith(base)) {
            const path = url.replace(base, "").replace(/^\//, "");
            if (path) {
              await supabase.storage.from(bucket).remove([path]);
            }
          }
        }
      } catch (storageErr) {
        console.warn("storage cleanup failed", storageErr);
      }
      setResources((list) => list.filter((x) => x.id !== row.id));
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to delete resource");
    }
  };

  const loadResourceLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from(RESOURCE_LIBRARY_TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        if (isMissingResourceError(error)) {
          warnMissingSource(RESOURCE_LIBRARY_TABLE, error);
          setResourceLibrary([]);
          return;
        }
        throw error;
      }
      setResourceLibrary(data || []);
    } catch (e) {
      console.warn(e);
      setResourceLibrary([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  const uploadResourceFile = async (file) => {
    if (!file) throw new Error("No file provided");
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/\s+/g, "_")}`;
    const path = `class-resources/${selectedClass || "general"}/${safeName}`;
    const { error } = await supabase.storage.from(RESOURCE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/pdf",
    });
    if (error) throw error;
    const { data: publicData } = supabase.storage.from(RESOURCE_BUCKET).getPublicUrl(path);
    return (publicData && publicData.publicUrl) || null;
  };

  const addLibraryResourceToClass = async (item) => {
    if (!selectedClass) throw new Error("Select a class first");
    if (!item || !item.url) throw new Error("Missing resource");
    const rTable = import.meta.env.VITE_CLASS_RES_TABLE || "cg_class_resources";
    const payload = {
      class_name: selectedClass,
      title: item.title || "Resource",
      url: item.url,
      kind: "classwork",
      payload: { url: item.url, kindOverride: "lesson", libraryId: item.id },
    };
    const { data, error } = await supabase.from(rTable).insert(payload).select().single();
    if (error) throw error;
    setResources((list) => [data, ...list]);
    return data;
  };

  const resolveDisplayName = useCallback((email) => {
    const entry = knownEmails.find((e) => (e.email || e) === email);
    if (entry && entry.name) return entry.name;
    if (email && email.includes("@")) return email.split("@")[0];
    return email || "";
  }, [knownEmails]);

  const people = useMemo(() => {
    const teacherName = resolveDisplayName(userEmail) || "Teacher";
    const students = classEmails.map((email) => ({
      role: "Student",
      name: resolveDisplayName(email),
      email,
    }));
    const list = [{ role: "Teacher", name: teacherName, email: userEmail }, ...students];
    return list.length ? list : [
      { role: "Teacher", name: "Practice Bot" },
      { role: "Student", name: "You" },
    ];
  }, [classEmails, userEmail, resolveDisplayName]);

  const openBulkAddForSelectedClass = useCallback(() => {
    if (!selectedClass) {
      alert("Select a class first.");
      return;
    }
    setBulkClassName(selectedClass);
    setBulkEmailsText("");
    setBulkSelectedEmails([]);
    setBulkSearch("");
    setBulkModalOpen(true);
  }, [selectedClass]);

  const addStudentToSelectedClass = useCallback(
    async (email) => {
      if (!isAdmin) return;
      const className = String(selectedClass || "").trim();
      const studentEmail = String(email || "").trim();
      if (!className) throw new Error("Select a class first.");
      if (!studentEmail || !/\S+@\S+\.\S+/.test(studentEmail)) {
        throw new Error("Enter a valid student email.");
      }
      setPeopleAddBusy(true);
      try {
        const { data: me } = await supabase.auth.getUser();
        const adminEmail = me?.user?.email || null;
        const table = import.meta.env.VITE_CLASS_ASSIGN_TABLE || "cg_class_assignments";
        const payload = { student_email: studentEmail, class_name: className, assigned_by: adminEmail };
        let { error } = await supabase.from(table).upsert(payload, { onConflict: CLASS_ASSIGN_ON_CONFLICT });
        if (needsLegacyConflictFallback(error)) {
          try {
            await supabase.from(table).delete().eq("student_email", studentEmail).eq("class_name", className);
          } catch {}
          ({ error } = await supabase.from(table).insert(payload));
        }
        if (error) throw error;
        await loadClasses();
        await refreshClassData();
      } finally {
        setPeopleAddBusy(false);
      }
    },
    [isAdmin, selectedClass, loadClasses, refreshClassData]
  );

  function decodeResourceQuestions(r) {
    return getResourceQuestions(r);
  }

  const renderStudentResourceCard = (resource) => (
    <StudentResourceCard
      key={`resource_card_${resource?.id || resource?.title || resource?.url || "fallback"}`}
      resource={resource}
      studentClass={studentClass}
      studentAttempts={studentAttempts}
      onNavigate={onNavigate}
      formatDuration={formatDuration}
      decodeQuestions={decodeResourceQuestions}
      extractMeta={extractResourceMeta}
    />
  );

  const renderPeopleTab = () => (
    <PeopleCard
      people={people}
      onNavigateHome={() => onNavigate("home")}
      className={selectedClass}
      canManage={Boolean(selectedClass)}
      knownEmails={knownEmails}
      onOpenBulkAdd={openBulkAddForSelectedClass}
      onAddStudent={addStudentToSelectedClass}
      addBusy={peopleAddBusy}
    />
  );

  const startLiveSession = useCallback(
    async ({ title, url, resourceId } = {}) => {
      if (!isAdmin) return;
      const className = String(selectedClass || "").trim();
      if (!className) {
        alert("Select a class first.");
        return;
      }
      setLiveBusy(true);
      try {
        setLiveTableMissing(false);
        const { data: me } = await supabase.auth.getUser();
        const teacherEmail = me?.user?.email || userEmail || null;
        const payload = {
          class_name: className,
          is_active: true,
          teacher_email: teacherEmail,
          title: String(title || "").trim() || null,
          url: String(url || "").trim() || null,
          state: resourceId ? { resourceId: String(resourceId) } : null,
          started_at: new Date().toISOString(),
          ended_at: null,
        };
        const { error } = await supabase.from(LIVE_SESSION_TABLE).upsert(payload, { onConflict: "class_name" });
        if (error) throw error;
        await loadLiveSession(className, { silent: true });
      } catch (error) {
        console.error(error);
        if (isMissingResourceError(error)) {
          warnMissingSource(LIVE_SESSION_TABLE, error);
          setLiveTableMissing(true);
          alert(`Live sessions are not configured yet.\nMissing table: ${LIVE_SESSION_TABLE}\n\nRun the SQL in supabase/schema.sql to create it.`);
          return;
        }
        alert(error?.message || "Failed to start live session.");
      } finally {
        setLiveBusy(false);
      }
    },
    [isAdmin, selectedClass, userEmail, loadLiveSession]
  );

  const updateLiveSession = useCallback(
    async ({ title, url, resourceId } = {}) => {
      if (!isAdmin) return;
      const className = String(selectedClass || "").trim();
      if (!className) {
        alert("Select a class first.");
        return;
      }
      setLiveBusy(true);
      try {
        setLiveTableMissing(false);
        const { data: me } = await supabase.auth.getUser();
        const teacherEmail = me?.user?.email || userEmail || null;
        const existingState = liveSession?.state && typeof liveSession.state === "object" ? liveSession.state : null;
        const payload = {
          class_name: className,
          is_active: true,
          teacher_email: teacherEmail,
          title: String(title || "").trim() || null,
          url: String(url || "").trim() || null,
          state: resourceId ? { resourceId: String(resourceId) } : existingState,
          ended_at: null,
        };
        const { error } = await supabase.from(LIVE_SESSION_TABLE).upsert(payload, { onConflict: "class_name" });
        if (error) throw error;
        await loadLiveSession(className, { silent: true });
      } catch (error) {
        console.error(error);
        if (isMissingResourceError(error)) {
          warnMissingSource(LIVE_SESSION_TABLE, error);
          setLiveTableMissing(true);
          alert(`Live sessions are not configured yet.\nMissing table: ${LIVE_SESSION_TABLE}\n\nRun the SQL in supabase/schema.sql to create it.`);
          return;
        }
        alert(error?.message || "Failed to update live session.");
      } finally {
        setLiveBusy(false);
      }
    },
    [isAdmin, selectedClass, userEmail, liveSession, loadLiveSession]
  );

  const endLiveSession = useCallback(async () => {
    if (!isAdmin) return;
    const className = String(selectedClass || "").trim();
    if (!className) return;
    setLiveBusy(true);
    try {
      setLiveTableMissing(false);
      const payload = {
        class_name: className,
        is_active: false,
        ended_at: new Date().toISOString(),
      };
      const { error } = await supabase.from(LIVE_SESSION_TABLE).upsert(payload, { onConflict: "class_name" });
      if (error) throw error;
      await loadLiveSession(className, { silent: true });
    } catch (error) {
      console.error(error);
      if (isMissingResourceError(error)) {
        warnMissingSource(LIVE_SESSION_TABLE, error);
        setLiveTableMissing(true);
        alert(`Live sessions are not configured yet.\nMissing table: ${LIVE_SESSION_TABLE}\n\nRun the SQL in supabase/schema.sql to create it.`);
        return;
      }
      alert(error?.message || "Failed to end live session.");
    } finally {
      setLiveBusy(false);
    }
  }, [isAdmin, selectedClass, loadLiveSession]);

  const renderAdminLiveTab = () => {
    if (liveTableMissing) {
      return (
        <Card>
          <h3 style={{ marginTop: 0 }}>Live Session</h3>
          <div style={{ color: "#b91c1c", fontWeight: 700 }}>Live sessions are not configured yet.</div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
            Missing table: <b>{LIVE_SESSION_TABLE}</b>. Run the SQL in <b>supabase/schema.sql</b> and refresh.
          </div>
          <div style={{ marginTop: 14 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      );
    }
    return (
      <LiveSessionCard
        className={selectedClass}
        session={liveSession}
        loading={liveLoading}
        canManage={Boolean(selectedClass)}
        lessonOptions={liveLessonOptions}
        busy={liveBusy}
        onStart={startLiveSession}
        onUpdate={updateLiveSession}
        onEnd={endLiveSession}
        onNavigateHome={() => onNavigate("home")}
      />
    );
  };

  const renderStudentLiveTab = () => {
    if (liveTableMissing) {
      return (
        <Card>
          <h3 style={{ marginTop: 0 }}>Live Session</h3>
          <div style={{ color: "#6b7280" }}>Live sessions are unavailable right now.</div>
          <div style={{ marginTop: 14 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      );
    }
    return (
      <LiveSessionCard
        className={studentClass}
        session={liveSession}
        loading={liveLoading}
        onNavigateHome={() => onNavigate("home")}
      />
    );
  };

  const liveActive = Boolean(liveSession?.is_active);

  const adminClassListProps = {
    classes,
    classesLoading,
    assignForm,
    knownEmails,
    loadingEmails,
    savingAssign,
    classDeleteBusy,
    onAssignChange: handleAssignInput,
    onSaveAssignment: saveAssignment,
    onOpenBulkAssign: () => setBulkModalOpen(true),
    onRefreshClasses: loadClasses,
    onSelectClass: (name) => setSelectedClass(name),
    onDeleteClass: handleDeleteClass,
    onNavigateHome: () => onNavigate("home"),
  };

  const adminClassDetailProps = {
    selectedClass,
    onBackToClasses: handleBackToClasses,
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
    resourceLibrary,
    libraryLoading,
    loadResourceLibrary,
    addLibraryResourceToClass,
    renderResourcesTab: null,
    onNavigate,
    classLogs,
    logsLoading,
    fmtDate,
    openClassLog,
    adaptiveInsights: classInsights,
    onDeleteLog: handleDeleteClassLog,
    refreshClassData,
  };


  const resourceGroupOrder = [
    { key: "exam", title: "Exams", subtitle: "Full SAT-style tests assigned by your teacher." },
    { key: "quiz", title: "Quizzes", subtitle: "Quick checks assigned by your teacher." },
    { key: "classwork", title: "Classwork", subtitle: "Practice sets to work on during class time." },
    { key: "homework", title: "Homework", subtitle: "Assignments you can resume from home." },
    { key: "lesson", title: "Resources", subtitle: "PDF lessons or readings shared by your teacher." },
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

  useEffect(() => {
    if (isAdmin) return;
    const cls = String(studentClass || "").trim();
    if (!cls) {
      setLiveSession(null);
      setLiveTableMissing(false);
      return;
    }
    loadLiveSession(cls);
    const interval = window.setInterval(() => {
      loadLiveSession(cls, { silent: true });
    }, 4000);
    return () => window.clearInterval(interval);
  }, [isAdmin, studentClass, loadLiveSession]);

  const filteredKnown = useMemo(() => {
    const term = String(bulkSearch || "").trim().toLowerCase();
    if (!term) return knownEmails;
    return knownEmails.filter((entry) => {
      const email = String(entry.email || entry || "").toLowerCase();
      const name = String(entry.name || "").toLowerCase();
      return email.includes(term) || name.includes(term);
    });
  }, [knownEmails, bulkSearch]);

  const copyText = async (text, fallbackLabel = "Copy this text:") => {
    const value = String(text || "").trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      alert("Copied.");
    } catch {
      window.prompt(fallbackLabel, value);
    }
  };

  const buildLessonUrl = (lessonRoute) => {
    const href = routeHref(lessonRoute);
    try {
      return new URL(href, window.location.origin).toString();
    } catch {
      return href;
    }
  };

  if (checking) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Training" right={null} />
        <CheckingAccessCard message="Checking access..." />
      </PageWrap>
    );
  }

  if (!allowed && !isAdmin) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Training" right={null} />
        <AssignmentGateCard
          userEmail={userEmail}
          onNavigateHome={() => onNavigate("home")}
          onNavigateLogin={() => onNavigate("login")}
        />
      </PageWrap>
    );
  }

  if (isAdmin) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Training" right={null} />
        {!selectedClass && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
              <div>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Interactive Lessons (Admin)</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>
                  Use these routes/links to share lessons with students (or paste into a live session).
                </div>
              </div>
              <Btn variant="secondary" onClick={() => copyText(SAT_INTERACTIVE_LESSONS.map((l) => buildLessonUrl(l.route)).join("\n"), "Copy lesson links:")}>
                Copy all links
              </Btn>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {SAT_INTERACTIVE_LESSONS.map((lesson) => {
                const href = routeHref(lesson.route);
                return (
                  <div
                    key={lesson.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                      background: "#f8fafc",
                    }}
                  >
                    <div style={{ minWidth: 240 }}>
                      <div style={{ fontWeight: 900, color: "#0f172a" }}>{lesson.title}</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#334155", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                        {lesson.route}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 12, color: "#64748b", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                        {href}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Btn variant="secondary" onClick={() => onNavigate(lesson.route)}>Open</Btn>
                      <Btn variant="secondary" onClick={() => copyText(lesson.route, "Copy route:")}>Copy route</Btn>
                      <Btn variant="secondary" onClick={() => copyText(buildLessonUrl(lesson.route), "Copy lesson link:")}>Copy link</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <AdminTabsPanel
            selectedClass={selectedClass}
            adminViewTab={adminViewTab}
            onChangeTab={setAdminViewTab}
            adminChatRefresh={adminChatRefresh}
            onRefreshStream={() => setAdminChatRefresh((key) => key + 1)}
            userEmail={userEmail}
            renderLiveTab={renderAdminLiveTab}
            renderPeopleTab={renderPeopleTab}
            classworkPanelProps={{
              classListProps: adminClassListProps,
              classDetailProps: adminClassDetailProps,
            }}
          />
        {viewClassLog && (
          <ClassSubmissionModal
            log={viewClassLog}
            onClose={closeClassLog}
            fmtDate={fmtDate}
            fmtDuration={fmtDuration}
            resolveQuestionText={resolveQuestionText}
            resolveQuestionData={resolveQuestionData}
          />
        )}
        {bulkModalOpen && (
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
              zIndex: 1400,
              padding: 12,
            }}
            onClick={() => setBulkModalOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                width: "min(640px, 95vw)",
                boxShadow: "0 15px 40px rgba(0,0,0,0.12)",
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Bulk add students</h3>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>
                    Paste one email per line (or separated by commas) and choose a class name.
                  </div>
                </div>
                <Btn variant="back" onClick={() => setBulkModalOpen(false)}>Close</Btn>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontWeight: 600, fontSize: 13 }}>Class Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Cohort A"
                    value={bulkClassName}
                    onChange={(e) => setBulkClassName(e.target.value)}
                    style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontWeight: 600, fontSize: 13 }}>Student emails</label>
                  {filteredKnown.length ? (
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderBottom: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        gap: 8,
                        }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>Student list</div>
                        <input
                          type="search"
                          placeholder="Search name or email"
                          value={bulkSearch}
                          onChange={(e) => setBulkSearch(e.target.value)}
                          style={{
                            padding: "8px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            fontSize: 13,
                            minWidth: 200,
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Btn
                          variant="secondary"
                          onClick={() =>
                            setBulkSelectedEmails(
                              filteredKnown.map((e) => ({
                                email: e.email || e,
                                school: e.school || "",
                                name: e.name || "",
                              }))
                            )
                          }
                          style={{ padding: "6px 10px", minWidth: 80 }}
                        >
                          Select all
                        </Btn>
                        <Btn
                          variant="back"
                          onClick={() => setBulkSelectedEmails([])}
                          style={{ padding: "6px 10px", minWidth: 80 }}
                        >
                          Clear
                        </Btn>
                      </div>
                    </div>
                    <div style={{ maxHeight: 240, overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                            <th style={{ width: 40, padding: "8px 10px", textAlign: "left" }} />
                            <th style={{ padding: "8px 10px", textAlign: "left", color: "#0f172a" }}>Name / Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredKnown.map((entry) => {
                            const email = entry.email || entry;
                            const name = entry.name || email.split("@")[0];
                            const checked = bulkSelectedEmails.some((e) => e.email === email);
                            return (
                              <tr key={email} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "8px 10px" }}>
                              <input
                                type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setBulkSelectedEmails((prev) =>
                                        prev.some((e) => e.email === email)
                                          ? prev.filter((e) => e.email !== email)
                                          : [...prev, { email, name }]
                                      )
                                    }
                                    style={{ width: 16, height: 16, cursor: "pointer" }}
                                  />
                            </td>
                            <td style={{ padding: "8px 10px", wordBreak: "break-all", color: "#111827" }}>
                              <div style={{ fontWeight: 700 }}>{name}</div>
                              <div style={{ color: "#6b7280", fontSize: 12 }}>{email}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      background: "#f9fafb",
                      color: "#6b7280",
                      fontSize: 13,
                    }}
                  >
                    No saved student emails yet. Add students elsewhere to see them here.
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Check one or more students to add them to this class.
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Btn variant="secondary" onClick={() => setBulkModalOpen(false)}>Cancel</Btn>
                <Btn variant="primary" onClick={saveBulkAssignments} disabled={bulkSaving}>
                  {bulkSaving ? "Saving…" : "Save all"}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <StudentTabsPanel
        tab={tab}
        setTab={setTab}
        streamPosts={streamPosts}
        studentClass={studentClass}
        studentChatRefresh={studentChatRefresh}
        onRefreshChat={() => setStudentChatRefresh((key) => key + 1)}
        userEmail={userEmail}
        onNavigateHome={() => onNavigate("home")}
        liveActive={liveActive}
        renderLiveTab={renderStudentLiveTab}
        studentResLoading={studentResLoading}
        resourceGroupOrder={resourceGroupOrder}
        groupedStudentResources={groupedStudentResources}
        hasAnyStudentResource={hasAnyStudentResource}
        renderResourceCard={renderStudentResourceCard}
        people={people}
      />

      {viewClassLog && (
        <ClassSubmissionModal
          log={viewClassLog}
          onClose={closeClassLog}
          fmtDate={fmtDate}
          fmtDuration={fmtDuration}
          resolveQuestionText={resolveQuestionText}
          resolveQuestionData={resolveQuestionData}
        />
      )}
    </PageWrap>
  );
}
