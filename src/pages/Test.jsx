// src/pages/Test.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
// import { createPortal } from "react-dom";
import Btn from "../components/Btn.jsx";
import { PageWrap, HeaderBar, Card, Field, ProgressBar } from "../components/Layout.jsx";
import useCountdown from "../hooks/useCountdown.js";
import { STR } from "../i18n/strings.js";
import PaletteOverlay from "./test/PaletteOverlay.jsx";

import {
  riasecFromAnswers,
  answeredCountByLetter,
  topRIASECFiltered,
  riasecRadarDataFiltered,
  riasecAreaPercents,
  interestPercents,
} from "../lib/scoring.js";
import { validateAll } from "../lib/validate.js";
import { saveTestSubmission } from "../lib/supabaseStorage.js";
import { supabase } from "../lib/supabase.js";
import { toEditorHtml } from "../lib/richText.js";

const toPlainString = (value) => {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
};
const pickFirstFilled = (...values) => {
  for (const value of values) {
    const str = toPlainString(value).trim();
    if (str) return str;
  }
  return "";
};
const phoneDigitsLength = (value) => toPlainString(value).replace(/[^\d]/g, "").length;
const isPhoneValid = (value) => phoneDigitsLength(value) >= 6;

const SCHOOL_OPTIONS = [
  { value: "Al - Jinan International School", label: "Al - Jinan International School" },
  { value: "Azm school", label: "Azm school" },
  { value: "Canada Educational Center", label: "Canada Educational Center" },
  { value: "Dar En Nour - Btouratige", label: "Dar En Nour - Btouratige" },
  { value: "EEC", label: "EEC" },
  { value: "Ecole Saint Joseph - Miniara", label: "Ecole Saint Joseph - Miniara" },
  { value: "Saints Coeurs - Andket", label: "Saints Coeurs - Andket" },
  { value: "Sir El Dinniyeh Secondary Public School", label: "Sir El Dinniyeh Secondary Public School" },
];

const GRADE_OPTIONS = [
  { value: "Grade 10", label: "Grade 10" },
  { value: "Grade 11", label: "Grade 11" },
  { value: "Grade 12", label: "Grade 12" },
];

const ENV_CG_ACCESS_CODE = (import.meta.env.VITE_CG_ACCESS_CODE || "").trim();
const ENV_CG_QUESTIONS_TABLE = (import.meta.env.VITE_CG_QUESTIONS_TABLE || "cg_career_questions").trim();
const RIASEC_SCALE_MAX = 5;

/* ====================== Validation / Questions ====================== */
const RIASEC_QUESTIONS_PER_AREA = 5;
const takeFirstNPerArea = (questions, nPerArea) => {
  const n = Math.max(0, Number(nPerArea) || 0);
  const counts = new Map();
  const out = [];
  for (const q of questions || []) {
    const area = q?.area || "";
    const key = area ? area : "__NO_AREA__";
    const cur = counts.get(key) || 0;
    if (cur >= n) continue;
    counts.set(key, cur + 1);
    out.push(q);
  }
  return out;
};

const CAREER_QUESTIONS_SELECT =
  "id, code, area, area_en, area_fr, area_ar, text_en, text_fr, text_ar, disc, bloom, un_goal, sort_index, area_sort";

const normalizeString = (value) => (value == null ? "" : String(value));
const normalizeTrimmed = (value) => normalizeString(value).trim();
const toFiniteNumberOr = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const mapCareerRowToQuestion = (row) => {
  const id = normalizeTrimmed(row?.id);
  const code = normalizeTrimmed(row?.code);
  const areaEN = normalizeTrimmed(row?.area_en);
  const areaFR = normalizeTrimmed(row?.area_fr);
  const areaAR = normalizeTrimmed(row?.area_ar);
  const area = areaEN || normalizeTrimmed(row?.area);
  const textEN = normalizeString(row?.text_en);
  const textFR = normalizeString(row?.text_fr);
  const textAR = normalizeString(row?.text_ar);
  const fallbackText = textEN || textFR || textAR || "";
  return {
    id,
    code,
    area,
    areaEN: areaEN || area,
    areaFR,
    areaAR,
    text: fallbackText,
    textEN: textEN || fallbackText,
    textFR,
    textAR,
    DISC: normalizeTrimmed(row?.disc),
    BLOOM: normalizeTrimmed(row?.bloom),
    UN_Goal: normalizeTrimmed(row?.un_goal),
    sortIndex: row?.sort_index,
    areaSort: row?.area_sort,
  };
};

const sortCareerQuestions = (a, b) => {
  const areaA = toFiniteNumberOr(a?.areaSort, Number.POSITIVE_INFINITY);
  const areaB = toFiniteNumberOr(b?.areaSort, Number.POSITIVE_INFINITY);
  if (areaA !== areaB) return areaA - areaB;
  const idxA = toFiniteNumberOr(a?.sortIndex, Number.POSITIVE_INFINITY);
  const idxB = toFiniteNumberOr(b?.sortIndex, Number.POSITIVE_INFINITY);
  if (idxA !== idxB) return idxA - idxB;
  return normalizeString(a?.id).localeCompare(normalizeString(b?.id));
};

/* ====================== Local profile keys ====================== */
const PROFILE_KEY = "cg_profile_v1";

/* ====================== Utils ====================== */
function cleanText(s) {
  if (!s) return "";
  let out = String(s);
  const replacements = [
    ["\ufeff", ""],
    ["\ufffd", ""],
    ["\u00c3\u00a2\u00c2\u20ac\u00c2\u2122", "'"],
    ["\u00c3\u00a2\u00c2\u20ac\u00c2\u0153", "\""],
    ["\u00c3\u00a2\u00c2\u20ac\u00c2\ufffd", "\""],
    ["\u00c3\u00a2\u00c2\u20ac\u00c2\u201d", "\u2014"],
    ["\u00c3\u00a2\u00c2\u20ac\u00c2\u201c", "\u2013"],
    ["\u00e2\u20ac\u2122", "'"],
    ["\u00e2\u20ac\u0153", "\""],
    ["\u00e2\u20ac\u009d", "\""],
    ["\u00e2\u20ac\u201c", "\u2013"],
    ["\u00e2\u20ac\u201d", "\u2014"],
  ];
  for (const [needle, value] of replacements) {
    if (out.includes(needle)) {
      out = out.split(needle).join(value);
    }
  }
  return out
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
}
function shuffleArray(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Pillar aggregation + counts (partial safe) ---------- */
function pillarAggAndCountsFromAnswers(questions, ansTF) {
  const disc = { D: 0, I: 0, S: 0, C: 0 };
  const discCount = { D: 0, I: 0, S: 0, C: 0 };

  const bloom = {};
  const bloomCount = {};
  const sdg = {};
  const sdgCount = {};

  for (const q of questions) {
    const v = ansTF[q.id];
    if (v == null) continue;

    if (q.DISC && disc[q.DISC] != null) {
      disc[q.DISC] += v;
      discCount[q.DISC] += 1;
    }
    if (q.BLOOM) {
      bloom[q.BLOOM] = (bloom[q.BLOOM] || 0) + v;
      bloomCount[q.BLOOM] = (bloomCount[q.BLOOM] || 0) + 1;
    }
    if (q.UN_Goal) {
      sdg[q.UN_Goal] = (sdg[q.UN_Goal] || 0) + v;
      sdgCount[q.UN_Goal] = (sdgCount[q.UN_Goal] || 0) + 1;
    }
  }

  return { pillarAgg: { disc, bloom, sdg }, pillarCounts: { discCount, bloomCount, sdgCount } };
}

/* ---------- Palette Overlay ---------- */
// Using PaletteOverlay component for question navigation

/* ====================== MAIN COMPONENT ====================== */
export default function Test({ onNavigate, lang = "EN", setLang, preview = false }) {
  const [riasecQuestions, setRiasecQuestions] = useState([]);
  const [riasecLoading, setRiasecLoading] = useState(false);
  const [riasecError, setRiasecError] = useState("");
  const lenR = riasecQuestions.length;
  const INTRO = 0;
  const R_START = 1;
  const LAST = R_START + Math.max(0, lenR - 1);
  const totalQuestions = lenR;
  const isPreview = Boolean(preview);
  const [tabExited, setTabExited] = useState(false);

  // Disable text selection/copy while in the test
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

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onVis = () => { if (document.hidden) setTabExited(true); };
    const onBlur = () => setTabExited(true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const indexFromPage = (p) => (p >= R_START && p <= LAST ? p - R_START + 1 : 0);
  const pageFromIndex = (idx) => R_START + (idx - 1);

  // Require sign-in before taking the test (Supabase Auth)
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        setAuthUser(user || null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthUser(session?.user || null);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  const loadRiasecQuestions = useCallback(async () => {
    if (!ENV_CG_QUESTIONS_TABLE) {
      setRiasecQuestions([]);
      setRiasecError("Questions table is not configured (missing VITE_CG_QUESTIONS_TABLE).");
      return;
    }
    setRiasecLoading(true);
    setRiasecError("");
    try {
      const pageSize = 1000;
      let from = 0;
      const allRows = [];
      while (true) {
        const { data, error } = await supabase
          .from(ENV_CG_QUESTIONS_TABLE)
          .select(CAREER_QUESTIONS_SELECT)
          .order("area_sort", { ascending: true })
          .order("sort_index", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        allRows.push(...rows);
        if (rows.length < pageSize) break;
        from += pageSize;
      }

      const mapped = allRows
        .map(mapCareerRowToQuestion)
        .filter((q) => Boolean(q?.id) && Boolean(q?.code) && Boolean(String(q?.text || "").trim()));
      mapped.sort(sortCareerQuestions);
      const perArea = takeFirstNPerArea(mapped, RIASEC_QUESTIONS_PER_AREA);
      const validated = validateAll({ Q_RIASEC: perArea, Q_APT: [], Q_WORK: [], Q_INT: [] });
      setRiasecQuestions(validated.Q_RIASEC || []);

      if (!(validated.Q_RIASEC || []).length) {
        throw new Error("No career questions were loaded. Check the cg_career_questions table and RLS permissions.");
      }
    } catch (err) {
      console.error("cg career questions load", err);
      setRiasecQuestions([]);
      setRiasecError(err?.message || "Unable to load career questions. Please try again.");
    } finally {
      setRiasecLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRiasecQuestions();
  }, [loadRiasecQuestions]);

  const [page, setPage] = useState(INTRO);
  const isAdmin = (() => {
    try {
      return localStorage.getItem("cg_admin_ok_v1") === "1";
    } catch {
      return false;
    }
  })();
  const [cgUnlocked, setCgUnlocked] = useState(isAdmin);
  const [cgCode, setCgCode] = useState("");
  const [cgErr, setCgErr] = useState("");
  const [serverCode, setServerCode] = useState(ENV_CG_ACCESS_CODE);
  const [codeLoading, setCodeLoading] = useState(false);
  // Exam language selection (locked once test starts)
  const [examLang, setExamLang] = useState(() => {
    try { return localStorage.getItem("cg_exam_lang") || ""; } catch { return ""; }
  });
  const [examLocked, setExamLocked] = useState(false);
  const [profile, setProfile] = useState(() => ({
    name: "",
    email: "",
    school: "",
    className: "",
    phone: "",
  }));
  const [accountProfile, setAccountProfile] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountForm, setAccountForm] = useState({ name: "", school: "", className: "", phone: "" });
  const [accountFormErrors, setAccountFormErrors] = useState({});
  const [savingAccount, setSavingAccount] = useState(false);
  const [profileReloadKey, setProfileReloadKey] = useState(0);
  const [showProfileError, setShowProfileError] = useState(false);
  const [ansTF, setAnsTF] = useState({});
  const [showPalette, setShowPalette] = useState(false);
  const [savedScroll, setSavedScroll] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [hoverVal, setHoverVal] = useState(null);

  const storedGateUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const fetchCareerCode = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("access_codes")
        .select("code")
        .eq("purpose", "career")
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      const value = (data?.code || "").trim();
      return value || ENV_CG_ACCESS_CODE;
    } catch (err) {
      console.error("career code fetch", err);
      return ENV_CG_ACCESS_CODE;
    }
  }, []);

  useEffect(() => {
    let active = true;
    setCodeLoading(true);
    fetchCareerCode()
      .then((value) => {
        if (!active) return;
        setServerCode(value);
      })
      .finally(() => {
        if (active) setCodeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchCareerCode]);

  const timerMin = 60; // Fixed 60 minutes for auto-submit
  useEffect(() => {
    if (!authUser) {
      setAccountProfile(null);
      setAccountForm({ name: "", school: "", className: "", phone: "" });
      setAccountError("");
      setAccountLoading(false);
      return;
    }
    let active = true;
    setAccountLoading(true);
    setAccountError("");
    (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).limit(1);
        if (!active) return;
        if (error) {
          console.error("test profile fetch", error);
          setAccountError(error.message || "Unable to load your account details.");
          setAccountProfile(null);
        } else {
          const row = Array.isArray(data) ? data[0] : null;
          setAccountProfile(row || null);
          const meta = authUser.user_metadata || {};
          const fallbackName = authUser.email ? authUser.email.split("@")[0] : "";
          setAccountForm({
            name: pickFirstFilled(row?.name, meta?.name, meta?.username, fallbackName),
            school: pickFirstFilled(row?.school, meta?.school, meta?.organization),
            className: pickFirstFilled(row?.class_name, meta?.className, meta?.class, meta?.grade),
            phone: pickFirstFilled(row?.phone, meta?.phone, meta?.phoneNumber, meta?.tel),
          });
        }
      } catch (err) {
        if (!active) return;
        console.error("test profile fetch", err);
        setAccountError(err.message || "Unable to load your account details.");
        setAccountProfile(null);
      } finally {
        if (active) setAccountLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authUser, profileReloadKey]);

  // Preview mode: skip access/profile and jump straight to questions without saving
  useEffect(() => {
    if (!isPreview || previewInitRef.current) return;
    if (riasecLoading || riasecError) return;
    if (!riasecQuestions.length) return;
    previewInitRef.current = true;
    setCgUnlocked(true);
    const chosen = (examLang || lang || "EN") || "EN";
    setExamLang(chosen);
    try { localStorage.setItem("cg_exam_lang", chosen); } catch {}
    setExamLocked(true);
    setShuffledRIASEC(shuffleArray(riasecQuestions));
    setStartTs(Date.now());
    setPage(R_START);
  }, [isPreview, lang, examLang, R_START, riasecLoading, riasecError, riasecQuestions]);

  const cd = useCountdown(timerMin * 60);
  const hasEndedRef = useRef(false);
  const [startTs, setStartTs] = useState(null);
  const previewInitRef = useRef(false);

  const [shuffledRIASEC, setShuffledRIASEC] = useState([]);

  // Local minimal i18n for the new language selector copy
  const localeKey = String(lang || "EN").toUpperCase();
  const strings = STR[localeKey] || STR.EN;
  const loginLabel = strings.signIn || "Sign In";
  const UI = {
    EN: {
      chooseLang: "Select the language for this test",
      lockedNote: "This choice will be locked during the exam.",
      accessTitle: "Access Code Required",
      accessDesc: "Enter the access code provided by your instructor to start the Career Guidance test.",
      loadingTitle: "Loading",
      checkingSession: "Please wait while we confirm your session.",
      placeholderCode: "Enter access code",
      invalidCode: "Invalid access code",
      backHome: "Back Home",
      signedInAs: "You are signed in as",
      startTest: "Start Test",
      area: "Area:",
      rateHint: "Rate (1 = Not at all, 5 = Strongly)",
      tipKeys: "Tip: use the number keys 1-5",
      participantTitle: "Participant information",
      participantDesc: "Please complete the following details before starting the test.",
      participantName: "Full Name",
      participantEmail: "Email",
      participantSchool: "School / Organization",
      participantClass: "Class / Grade",
      participantPhone: "Phone Number",
      participantNamePlaceholder: "Enter your full name",
      participantEmailPlaceholder: "Enter your email address",
      participantSchoolPlaceholder: "Enter your school or organization",
      participantClassPlaceholder: "Enter your class or grade",
      participantPhonePlaceholder: "Enter your phone number",
      participantError: "Please enter your name, school, class, phone number, and a valid email to continue.",
    },
    AR: {
      chooseLang: "اختر لغة هذا الاختبار",
      lockedNote: "سيتم تثبيت هذا الاختيار أثناء الامتحان.",
      accessTitle: "رمز الدخول مطلوب",
      accessDesc: "أدخل رمز الدخول الذي زوّدك به المعلّم لبدء اختبار التوجيه المهني.",
      loadingTitle: "جارٍ التحميل",
      checkingSession: "يرجى الانتظار بينما نتحقق من جلسة تسجيل الدخول.",
      placeholderCode: "أدخل رمز الدخول",
      invalidCode: "رمز الدخول غير صحيح",
      backHome: "العودة إلى الرئيسية",
      signedInAs: "تم تسجيل الدخول باسم",
      startTest: "بدء الاختبار",
      area: "المجال:",
      rateHint: "قيّم (1 = غير مناسب، 5 = مناسب جدًا)",
      tipKeys: "تلميح: يمكنك استخدام الأرقام من 1 إلى 5",
      participantTitle: "بيانات المشارك",
      participantDesc: "يرجى إكمال البيانات التالية قبل بدء الاختبار.",
      participantName: "الاسم الكامل",
      participantEmail: "البريد الإلكتروني",
      participantSchool: "المدرسة / المؤسسة",
      participantClass: "الصف / المرحلة",
      participantPhone: "رقم الهاتف",
      participantNamePlaceholder: "أدخل اسمك الكامل",
      participantEmailPlaceholder: "أدخل بريدك الإلكتروني",
      participantSchoolPlaceholder: "أدخل اسم المدرسة أو المؤسسة",
      participantClassPlaceholder: "أدخل الصف أو المرحلة",
      participantPhonePlaceholder: "أدخل رقم الهاتف",
      participantError: "يجب إدخال الاسم والمدرسة والصف ورقم الهاتف وبريد إلكتروني صالح للمتابعة.",
    },
    FR: {
      chooseLang: "Sélectionnez la langue de ce test",
      lockedNote: "Ce choix sera verrouillé pendant l'examen.",
      accessTitle: "Code d'accès requis",
      accessDesc: "Saisissez le code fourni par votre enseignant pour démarrer le test d'orientation.",
      loadingTitle: "Chargement",
      checkingSession: "Merci de patienter pendant la vérification de votre session.",
      placeholderCode: "Saisir le code d'accès",
      invalidCode: "Code d'accès invalide",
      backHome: "Retour à l'accueil",
      signedInAs: "Connecté en tant que",
      startTest: "Commencer le test",
      area: "Domaine :",
      rateHint: "Évaluez (1 = Pas du tout, 5 = Beaucoup)",
      tipKeys: "Astuce : utilisez les touches 1 à 5",
      participantTitle: "Informations du participant",
      participantDesc: "Veuillez compléter les informations suivantes avant de commencer le test.",
      participantName: "Nom complet",
      participantEmail: "Adresse e-mail",
      participantSchool: "École / Organisation",
      participantClass: "Classe / Niveau",
      participantPhone: "Numéro de téléphone",
      participantNamePlaceholder: "Saisissez votre nom complet",
      participantEmailPlaceholder: "Saisissez votre adresse e-mail",
      participantSchoolPlaceholder: "Saisissez votre école ou organisation",
      participantClassPlaceholder: "Saisissez votre classe ou votre niveau",
      participantPhonePlaceholder: "Saisissez votre numéro de téléphone",
      participantError: "Veuillez saisir votre nom, votre école, votre classe, votre numéro de téléphone et une adresse e-mail valide pour continuer.",
    },
  };
  const examLocaleKey = String((examLang || lang || "EN") || "EN").toUpperCase();
  const ui = UI[examLocaleKey] || UI.EN;
  const isRTL = examLocaleKey.startsWith("AR");
  const rtlPageStyle = isRTL ? { direction: "rtl", textAlign: "right" } : undefined;
  const LANG_LABELS = { EN: "English", FR: "Français", AR: "العربية" };
  const EXAM_LANG_CODES = ["EN", "FR", "AR"];
  const signInTitle = strings.signInTitle || loginLabel;
  const signInPrompt = strings.signInSubtitle || ui.accessDesc || "Please sign in to continue.";
  const backHomeLabel = ui.backHome || strings.backToHome || "Back Home";
  const handleUnlock = useCallback(async () => {
    if (codeLoading) return;
    setCgErr("");
    setCodeLoading(true);
    const expected = await fetchCareerCode();
    setServerCode(expected);
    setCodeLoading(false);
    if (expected && cgCode.trim() !== expected) {
      setCgErr(ui.invalidCode);
      return;
    }
    setCgUnlocked(true);
  }, [codeLoading, cgCode, fetchCareerCode, ui.invalidCode]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      const meta = authUser?.user_metadata || {};
      const initName =
        saved?.name ||
        meta?.name ||
        meta?.username ||
        (authUser?.email ? authUser.email.split("@")[0] : "");
      const initEmail = saved?.email || authUser?.email || meta?.email || "";
      const initSchool = saved?.school || meta?.school || meta?.organization || "";
      const initClass =
        saved?.className ||
        saved?.class ||
        saved?.grade ||
        meta?.className ||
        meta?.class ||
        meta?.grade ||
        "";
      const initPhone =
        saved?.phone ||
        saved?.tel ||
        saved?.phoneNumber ||
        meta?.phone ||
        meta?.phoneNumber ||
        meta?.tel ||
        "";
      setProfile((prev) => ({
        ...prev,
        name: initName || prev.name,
        email: initEmail || prev.email,
        school: initSchool || prev.school,
        className: initClass || prev.className,
        phone: initPhone || prev.phone,
      }));
    } catch {}
  }, [authUser]);
  useEffect(() => { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }, [profile]);

  const isEmail = (s) => /^\S+@\S+\.\S+$/.test(String(s || "").trim());
  const isValidName = (s) => String(s || "").trim().length > 1;
  const isValidSchool = (s) => String(s || "").trim().length > 1;
  const isValidClass = (s) => String(s || "").trim().length > 0;
  const isValidPhone = (s) => isPhoneValid(s);
  const isValidProfile = () =>
    isValidName(profile.name) &&
    isValidSchool(profile.school) &&
    isValidClass(profile.className) &&
    isValidPhone(profile.phone) &&
    isEmail(profile.email);
  const resolvedRole =
    String(accountProfile?.role || authUser?.user_metadata?.role || authUser?.user_metadata?.accountType || storedGateUser.role || "")
      .toLowerCase();
  const isStudentAccount = !resolvedRole || resolvedRole === "student" || resolvedRole === "user";
  const hasStoredSchool = Boolean(toPlainString(accountProfile?.school || "").trim());
  const hasStoredClass = Boolean(toPlainString(accountProfile?.class_name || "").trim());
  const hasStoredPhone = isValidPhone(accountProfile?.phone || "");
  const needsProfileUpdate =
    Boolean(authUser) &&
    !accountLoading &&
    (!hasStoredSchool || !hasStoredPhone || (isStudentAccount && !hasStoredClass));
  const handleAccountFieldChange = (field, value) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }));
    setAccountFormErrors((prev) => ({ ...prev, [field]: "" }));
  };
  const handleReloadProfile = () => setProfileReloadKey((n) => n + 1);
  const handleMissingInfoSubmit = async () => {
    if (!authUser) return;
    const trimmedName = toPlainString(accountForm.name).trim();
    const trimmedSchool = toPlainString(accountForm.school).trim();
    const trimmedClass = toPlainString(accountForm.className).trim();
    const trimmedPhone = toPlainString(accountForm.phone).trim();
    const nextErrors = {};
    if (!trimmedName) nextErrors.name = strings.nameRequired || "Name is required";
    if (!trimmedSchool) nextErrors.school = strings.schoolRequired || "School is required";
    if (isStudentAccount && !trimmedClass) nextErrors.className = strings.classRequired || "Class is required";
    if (!isValidPhone(trimmedPhone)) nextErrors.phone = strings.phoneInvalid || "Please enter a valid phone number";
    setAccountFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSavingAccount(true);
    const nextClassName = isStudentAccount
      ? trimmedClass
      : toPlainString(accountProfile?.class_name || accountForm.className).trim();
    const upsertRow = {
      id: authUser.id,
      name: trimmedName,
      school: trimmedSchool,
      class_name: nextClassName || null,
      phone: trimmedPhone,
    };
    const identityEmail = accountProfile?.email || authUser.email || null;
    if (identityEmail) upsertRow.email = identityEmail;
    const derivedUsername =
      accountProfile?.username ||
      authUser?.user_metadata?.username ||
      (authUser?.email ? authUser.email.split("@")[0] : null);
    if (derivedUsername) upsertRow.username = derivedUsername;
    const roleValue =
      accountProfile?.role ||
      authUser?.user_metadata?.role ||
      authUser?.user_metadata?.accountType ||
      (isStudentAccount ? "student" : "educator");
    if (roleValue) upsertRow.role = roleValue;
    try {
      const { error } = await supabase.from("profiles").upsert(upsertRow);
      if (error) throw error;
      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          ...(authUser.user_metadata || {}),
          name: trimmedName,
          school: trimmedSchool,
          class: isStudentAccount ? trimmedClass : "",
          className: isStudentAccount ? trimmedClass : "",
          phone: trimmedPhone,
        },
      });
      if (metaErr) throw metaErr;
      setAccountProfile((prev) => ({ ...(prev || {}), ...upsertRow }));
      setAccountForm({ name: trimmedName, school: trimmedSchool, className: trimmedClass, phone: trimmedPhone });
      setAccountFormErrors({});
      setAccountError("");
      setProfile((prev) => ({
        ...prev,
        name: trimmedName,
        email: authUser.email || prev.email,
        school: trimmedSchool,
        className: isStudentAccount ? trimmedClass : prev.className,
        phone: trimmedPhone,
      }));
      try {
        const raw = localStorage.getItem("cg_current_user_v1");
        const existing = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          "cg_current_user_v1",
          JSON.stringify({
            ...existing,
            id: authUser.id,
            email: authUser.email || existing.email,
            name: trimmedName,
            role: roleValue || existing.role,
            school: trimmedSchool,
            class_name: isStudentAccount ? trimmedClass : existing.class_name,
            phone: trimmedPhone,
          }),
        );
      } catch {}
      try {
        const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
        localStorage.setItem(
          PROFILE_KEY,
          JSON.stringify({
            ...saved,
            name: trimmedName,
            email: authUser.email || saved.email,
            school: trimmedSchool,
            className: isStudentAccount ? trimmedClass : saved.className,
            phone: trimmedPhone,
          }),
        );
      } catch {}
    } catch (err) {
      console.error("test profile update", err);
      setAccountError(err?.message || "Unable to save your information. Please try again.");
    } finally {
      setSavingAccount(false);
    }
  };

  // Derived results
  const riasecSums = useMemo(() => riasecFromAnswers(riasecQuestions || [], ansTF), [riasecQuestions, ansTF]);
  const answeredCounts = useMemo(() => answeredCountByLetter(riasecQuestions || [], ansTF), [riasecQuestions, ansTF]);
  const top3 = useMemo(
    () => topRIASECFiltered(riasecSums, answeredCounts, RIASEC_SCALE_MAX),
    [riasecSums, answeredCounts]
  );
  const radarData = useMemo(() => riasecRadarDataFiltered(riasecSums, answeredCounts, RIASEC_SCALE_MAX), [riasecSums, answeredCounts]);
  const areaPerc = useMemo(() => riasecAreaPercents(riasecQuestions || [], ansTF, RIASEC_SCALE_MAX), [riasecQuestions, ansTF]);
  const interestsPerc = useMemo(() => interestPercents([], ansTF), [ansTF]);

  const { pillarAgg, pillarCounts } = useMemo(
    () => pillarAggAndCountsFromAnswers(riasecQuestions || [], ansTF),
    [riasecQuestions, ansTF]
  );

  const answeredIndexes = useMemo(() => {
    const set = new Set();
    for (let i = 1; i <= totalQuestions; i++) {
      const q = shuffledRIASEC[i - 1];
      if (q && ansTF[q.id] != null) set.add(i);
    }
    return set;
  }, [ansTF, shuffledRIASEC, totalQuestions]);

  const next = useCallback(() => setPage((p) => Math.min(p + 1, LAST)), [LAST]);
  const prev = useCallback(() => setPage((p) => Math.max(p - 1, INTRO)), [INTRO]);

  const startTest = async () => {
    if (!isValidProfile()) {
      setShowProfileError(true);
      return;
    }
    if (riasecLoading) {
      alert("Questions are still loading. Please wait a moment and try again.");
      return;
    }
    if (riasecError) {
      alert(`Could not load questions. ${riasecError}`);
      return;
    }
    if (!riasecQuestions.length) {
      alert("No questions are available right now. Please try again later.");
      return;
    }
    setShowProfileError(false);
    // Require language selection and lock it for the session
    const chosen = String(examLang || "").trim().toUpperCase();
    if (!chosen) {
      alert("Please select the test language before starting.");
      return;
    }
    try { localStorage.setItem("cg_exam_lang", chosen); } catch {}
    if (typeof setLang === "function" && (chosen === "EN" || chosen === "FR")) setLang(chosen);
    setExamLocked(true);
    // Shuffle questions each time the test starts
    hasEndedRef.current = false;
    setShuffledRIASEC(shuffleArray(riasecQuestions));
    cd.reset(); cd.start();
    setStartTs(Date.now());
    setPage(R_START);
  };

  const endTest = async () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    try {
      const topCodes = Array.isArray(top3) ? top3.map(t => t.code || t) : [];
      const finishedAt = Date.now();
      const participant = {
        ...profile,
        started_at: startTs ? new Date(startTs).toISOString() : null,
        finished_at: new Date(finishedAt).toISOString(),
      };
      const submissionPayload = {
        profile: participant,
        answers: ansTF,
        radarData,
        areaPercents: areaPerc,
        pillarAgg,
        pillarCounts: { ...(pillarCounts || {}), totalQuestions },
        topCodes,
      };
      const goToResults = () =>
        onNavigate("results", {
          radarData,
          areaPercents: areaPerc,
          interestPercents: interestsPerc,
          participant: { ...profile, ts: Date.now() },
          pillarAgg,
          pillarCounts: { ...(pillarCounts || {}), totalQuestions },
        });

      if (isPreview) {
        goToResults();
        return;
      }

      await saveTestSubmission(submissionPayload);
      goToResults();
    } catch (e) {
      console.error("Save failed:", e);
      const msg = e?.message || String(e);
      alert(`Could not save your results. ${msg}`);
      hasEndedRef.current = false; // allow retry if save failed
    }
  };

  // Auto-submit when timer hits zero
  useEffect(() => {
    if (!examLocked || !startTs) return;
    if (cd.remaining <= 0) {
      endTest();
    }
  }, [cd.remaining, examLocked, startTs, endTest]);

  /* ---------- Keyboard Shortcuts ---------- */
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const onKeyDown = (e) => {
      if (isTyping()) return;
      const onRIASEC = page >= R_START && page <= LAST;
      if (!onRIASEC) return;
      const key = e.key;
      if (key >= "1" && key <= "5") {
        const idx = page - R_START;
        const q = shuffledRIASEC[idx];
        if (q) {
          e.preventDefault();
          setAnsTF((s) => ({ ...s, [q.id]: Number(key) }));
        }
      }
      if (key === "Enter" || key === "ArrowRight") {
        e.preventDefault();
        page === LAST ? endTest() : next();
      }
      if (key === "Backspace" || key === "ArrowLeft") {
        e.preventDefault();
        if (page > R_START) prev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [page, R_START, LAST, shuffledRIASEC, next, prev, endTest]);

  if (!isPreview && tabExited) {
    return (
      <PageWrap style={rtlPageStyle}>
        <Card>
          <p style={{ color: "#6b7280", margin: 0 }}>
            Session paused because the tab was switched. Click Continue to resume (or refresh to restart).
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-start" }}>
            <Btn variant="primary" onClick={() => setTabExited(false)}>
              Continue
            </Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  if (authLoading) {
  return (
    <PageWrap style={{ ...(rtlPageStyle || {}), userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none", msUserSelect: "none" }}>
        <HeaderBar title={ui.loadingTitle || "Loading"} right={null} lang={examLocaleKey} />
        <Card>
          <p style={{ color: "#6b7280" }}>
            {ui.checkingSession || "Please wait while we verify your session."}
          </p>
        </Card>
      </PageWrap>
    );
  }

  if (!authUser) {
    return (
      <PageWrap style={rtlPageStyle}>
        <HeaderBar title={signInTitle} right={null} lang={examLocaleKey} />
        <Card>
          <p style={{ color: "#6b7280" }}>{signInPrompt}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={() => onNavigate("login")}>{loginLabel}</Btn>
            <Btn variant="back" onClick={() => onNavigate("home")}>{backHomeLabel}</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  if (accountLoading) {
    return (
      <PageWrap style={rtlPageStyle}>
        <HeaderBar title={ui.loadingTitle || "Loading"} right={null} lang={examLocaleKey} />
        <Card>
          <p style={{ color: "#6b7280" }}>
            {ui.checkingSession || "Please wait while we verify your account details."}
          </p>
        </Card>
      </PageWrap>
    );
  }

  if (needsProfileUpdate) {
    const gateTitle = ui.participantTitle || "Participant Information";
    const gateDesc = ui.participantDesc || "Please complete the following before beginning.";
    const continueLabel = strings.agreeBegin || strings.takeTest || "Continue";
    const helperText = isStudentAccount
      ? "We need your school, class, and phone number on file before you can start the assessment."
      : "We need your school and phone number on file before you can start the assessment.";
    const errorStyle = { color: "#dc2626", fontSize: 13, margin: "4px 0 0" };
    const inputStyle = {
      padding: "11px 12px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      fontSize: 15,
      width: "100%",
    };

    return (
      <PageWrap style={rtlPageStyle}>
        <HeaderBar title={gateTitle} right={null} lang={examLocaleKey} />
        <Card>
          <h2 style={{ marginTop: 0 }}>{gateTitle}</h2>
          <p style={{ color: "#475569", marginBottom: 8 }}>{gateDesc}</p>
          <p style={{ color: "#b45309", fontSize: 14, marginTop: 0 }}>{helperText}</p>
          {accountError && (
            <p style={{ color: "#dc2626", fontSize: 14, marginTop: 0 }}>{accountError}</p>
          )}

          <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{ui.participantName || "Full Name"}</span>
              <input
                type="text"
                value={accountForm.name}
                onChange={(e) => handleAccountFieldChange("name", e.target.value)}
                autoComplete="name"
                style={inputStyle}
              />
              {accountFormErrors.name && <span style={errorStyle}>{accountFormErrors.name}</span>}
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{ui.participantSchool || "School / Organization"}</span>
              <select
                value={accountForm.school}
                onChange={(e) => handleAccountFieldChange("school", e.target.value)}
                style={{ ...inputStyle, paddingRight: 30 }}
              >
                <option value="">Select school</option>
                {SCHOOL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {accountFormErrors.school && <span style={errorStyle}>{accountFormErrors.school}</span>}
            </label>

            {isStudentAccount && (
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{ui.participantClass || "Class / Grade"}</span>
                <select
                  value={accountForm.className}
                  onChange={(e) => handleAccountFieldChange("className", e.target.value)}
                  style={{ ...inputStyle, paddingRight: 30 }}
                >
                  <option value="">Select grade</option>
                  {GRADE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {accountFormErrors.className && <span style={errorStyle}>{accountFormErrors.className}</span>}
              </label>
            )}

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{ui.participantPhone || "Phone"}</span>
              <input
                type="tel"
                value={accountForm.phone}
                onChange={(e) => handleAccountFieldChange("phone", e.target.value)}
                autoComplete="tel"
                style={inputStyle}
              />
              {accountFormErrors.phone && <span style={errorStyle}>{accountFormErrors.phone}</span>}
            </label>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="secondary" onClick={handleReloadProfile}>
                Reload Info
              </Btn>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="back" onClick={() => onNavigate("home")}>{backHomeLabel}</Btn>
              <Btn variant="primary" onClick={handleMissingInfoSubmit} disabled={savingAccount}>
                {savingAccount ? "Saving..." : continueLabel}
              </Btn>
            </div>
          </div>
        </Card>
      </PageWrap>
    );
  }

  /* ---------- Pages ---------- */
  // Localized getters for question content
  const pickLocalized = (obj, baseKey, activeLang) => {
    if (!obj) return "";
    const L = String(activeLang || "EN").toUpperCase();
    const candidates = [
      `${baseKey}${L}`, // e.g., textEN
      `${baseKey}_${L}`, // e.g., text_EN
      `${baseKey}${L.toLowerCase()}`, // e.g., texten
      `${baseKey}_${L.toLowerCase()}`, // e.g., text_en
      baseKey, // fallback
    ];
    for (const k of candidates) {
      if (obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
    }
    return "";
  };

  // Intro
  if (page === INTRO) {
    return (
      <PageWrap style={rtlPageStyle}>
        <HeaderBar title="Career Guidance Test" lang={examLang || lang} />
        <Card>
          {!cgUnlocked ? (
            <>
              <h3 style={{ marginTop: 0 }}>{ui.accessTitle}</h3>
              <p style={{ color: "#6b7280" }}>{ui.accessDesc}</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 420 }}>
                <input
                  type="text"
                  value={cgCode}
                  onChange={(e)=>{ setCgCode(e.target.value); setCgErr(""); }}
                  placeholder={ui.placeholderCode}
                  style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
                />
                <Btn
                  variant="primary"
                  onClick={handleUnlock}
                  disabled={codeLoading}
                  style={codeLoading ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                >
                  {codeLoading ? (ui.checkingCode || "Checking…") : "Unlock"}
                </Btn>
              </div>
              {cgErr && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{cgErr}</p>}
              <div style={{ marginTop: 12 }}>
                <Btn variant="back" onClick={()=>onNavigate("home")}>{ui.backHome}</Btn>
              </div>
            </>
          ) : (
            <>
              {/* Language selection (locked after start) */}
              <div style={{ marginBottom: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{ui.chooseLang}</div>
                <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 10 }}>{ui.lockedNote}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {EXAM_LANG_CODES.map((code) => (
                    <button
                      key={code}
                      onClick={() => setExamLang(code)}
                      aria-pressed={examLang === code}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: examLang === code ? "2px solid #2563eb" : "1px solid #d1d5db",
                        background: examLang === code ? "#eff6ff" : "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                        minWidth: 80,
                      }}
                    >
                      {LANG_LABELS[code] || code} ({code})
                    </button>
                  ))}
                </div>
              </div>
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#ffffff",
                }}
              >
                {riasecLoading ? (
                  <div style={{ color: "#475569", fontSize: 14 }}>Loading questions…</div>
                ) : riasecError ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ color: "#dc2626", fontSize: 14, flex: "1 1 260px" }}>
                      Could not load questions. {riasecError}
                    </div>
                    <Btn variant="secondary" onClick={loadRiasecQuestions}>
                      Retry
                    </Btn>
                  </div>
                ) : (
                  <div style={{ color: "#475569", fontSize: 14 }}>
                    Questions loaded: <b>{riasecQuestions.length}</b>
                  </div>
                )}
              </div>
              <p style={{ color:"#475569" }}>{ui.signedInAs} <b>{authUser?.email || profile.email || "user"}</b>. Your account details will be used for the report.</p>
              <div style={{ marginTop: 16, padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: "#0f172a" }}>{ui.participantTitle}</div>
                <p style={{ margin: 0, marginBottom: 12, color: "#475569", fontSize: 14 }}>
                  {ui.participantDesc}
                </p>
                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    { key: "name", label: ui.participantName },
                    { key: "school", label: ui.participantSchool },
                    { key: "className", label: ui.participantClass },
                    { key: "phone", label: ui.participantPhone },
                    { key: "email", label: ui.participantEmail },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "10px 12px",
                        background: "#fff",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{label}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{profile[key] || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
                <Btn variant="back" onClick={()=>onNavigate("home")}>{ui.backHome}</Btn>
                <Btn
                  variant="primary"
                  onClick={startTest}
                  disabled={riasecLoading || Boolean(riasecError) || riasecQuestions.length === 0}
                >
                  {riasecLoading ? "Loading…" : ui.startTest}
                </Btn>
              </div>
            </>
          )}
        </Card>
      </PageWrap>
    );
  }

  // RIASEC questions
  if (page >= R_START && page <= LAST) {
    const idx = page - R_START;
    const q = shuffledRIASEC[idx];
    if (!q) return null;
    const current = ansTF[q.id];
    const isLast = page === LAST;
    return (
      <PageWrap style={rtlPageStyle}>
        <HeaderBar title="Career Guidance Test" right={null} lang={examLang || lang} />
        <Card>
          <ProgressBar value={Math.round((indexFromPage(page)/totalQuestions)*100)} />
          <div style={{ marginTop: 18 }}>
            {(() => {
              const activeLang = examLocked ? (examLang || lang) : lang;
              const rawText = cleanText(pickLocalized(q, "text", activeLang));
              const qHtml = toEditorHtml(rawText);
              return (
                <>
                  <div
                    style={{ margin: 0, color: "#111827", fontSize: 18, fontWeight: 700, lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: qHtml }}
                  />
                </>
              );
            })()}
            <p style={{ color: "#6b7280", marginTop: 8 }}>{ui.rateHint}</p>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{ui.tipKeys}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {[1,2,3,4,5].map(v=>(
                <Btn key={v} variant="secondary" selected={current===v}  onClick={()=>setAnsTF(s=>({...s,[q.id]:v}))} style={{minWidth:48}} onMouseEnter={() => setHoverVal(v)} onMouseLeave={() => setHoverVal(null)} onFocus={() => setHoverVal(v)} onBlur={() => setHoverVal(null)}>{v}</Btn>
              ))}
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,gap:8 }}>
              <Btn variant="back" onClick={prev} disabled={page===R_START}>Back</Btn>
              <Btn variant="secondary" onClick={()=>setShowPalette(true)}>
                Question {indexFromPage(page)} / {totalQuestions}
              </Btn>
              {isLast ? <Btn variant="primary" onClick={endTest}>End Test</Btn> : <Btn variant="primary" onClick={next}>Next</Btn>}
            </div>
          </div>
        </Card>
        {showPalette && (
          <PaletteOverlay
            totalQuestions={totalQuestions}
            currentIndex={indexFromPage(page)}
            onJump={(idx1)=>setPage(pageFromIndex(idx1))}
            onClose={()=>setShowPalette(false)}
            savedScroll={savedScroll}
            setSavedScroll={setSavedScroll}
            answeredIndexes={answeredIndexes}
          />
        )}
      </PageWrap>
    );
  }

  return null;
}
