// src/pages/Test.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
// import { createPortal } from "react-dom";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import { PageWrap, HeaderBar, Card, Field, ProgressBar } from "../components/Layout.jsx";
import TimerHeader from "../components/TimerHeader.jsx";
import useCountdown from "../hooks/useCountdown.js";
import { LANGS, STR } from "../i18n/strings.js";
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

import {
  RIASEC_SCALE_MAX,
  Q_UNIFIED_CLEAN as RAW_RIASEC,
} from "../questionBank.js";

/* ====================== Validation / Questions ====================== */
const RAW_APT = [];
const RAW_WORK = [];
const RAW_INT = [];

const { Q_RIASEC, Q_APT, Q_WORK, Q_INT } = validateAll({
  Q_RIASEC: RAW_RIASEC,
  Q_APT: RAW_APT,
  Q_WORK: RAW_WORK,
  Q_INT: RAW_INT,
});

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
export default function Test({ onNavigate, lang = "EN", setLang }) {
  const lenR = Q_RIASEC.length;
  const INTRO = 0;
  const R_START = 1;
  const LAST = R_START + Math.max(0, lenR - 1);
  const totalQuestions = lenR;

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
  const [showProfileError, setShowProfileError] = useState(false);
  const [ansTF, setAnsTF] = useState({});
  const [showPalette, setShowPalette] = useState(false);
  const [savedScroll, setSavedScroll] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [hoverVal, setHoverVal] = useState(null);

  const [timerMin, setTimerMin] = useState(() => {
    const saved = Number(localStorage.getItem("cg_timer_min") || 30);
    return Number.isFinite(saved) && saved > 0 ? saved : 30;
  });
  useEffect(() => { localStorage.setItem("cg_timer_min", String(timerMin)); }, [timerMin]);
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === "cg_timer_min") {
        const next = Number(event.newValue);
        if (Number.isFinite(next) && next > 0) {
          setTimerMin(next);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
  const cd = useCountdown(timerMin * 60);
  const [startTs, setStartTs] = useState(null);

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
  const ui = UI[localeKey] || UI.EN;
  const LANG_LABELS = { EN: "English", AR: "العربية", FR: "Français" };
  const signInTitle = strings.signInTitle || loginLabel;
  const signInPrompt = strings.signInSubtitle || ui.accessDesc || "Please sign in to continue.";
  const backHomeLabel = ui.backHome || strings.backToHome || "Back Home";

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
  const isValidPhone = (s) => {
    const digits = String(s || "").replace(/[^\d]/g, "");
    return digits.length >= 6;
  };
  const isValidProfile = () =>
    isValidName(profile.name) &&
    isValidSchool(profile.school) &&
    isValidClass(profile.className) &&
    isValidPhone(profile.phone) &&
    isEmail(profile.email);

  // Derived results
  const riasecSums = useMemo(() => riasecFromAnswers(Q_RIASEC || [], ansTF), [ansTF]);
  const answeredCounts = useMemo(() => answeredCountByLetter(Q_RIASEC || [], ansTF), [ansTF]);
  const top3 = useMemo(() => topRIASECFiltered(riasecSums, answeredCounts), [riasecSums, answeredCounts]);
  const radarData = useMemo(() => riasecRadarDataFiltered(riasecSums, answeredCounts, RIASEC_SCALE_MAX), [riasecSums, answeredCounts]);
  const areaPerc = useMemo(() => riasecAreaPercents(Q_RIASEC || [], ansTF, RIASEC_SCALE_MAX), [ansTF]);
  const interestsPerc = useMemo(() => interestPercents(Q_INT || [], ansTF), [ansTF]);

  const { pillarAgg, pillarCounts } = useMemo(
    () => pillarAggAndCountsFromAnswers(Q_RIASEC || [], ansTF),
    [ansTF]
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
    setShowProfileError(false);
    // Require language selection and lock it for the session
    const chosen = String(examLang || "").trim();
    if (!chosen) {
      alert("Please select the test language before starting.");
      return;
    }
    try { localStorage.setItem("cg_exam_lang", chosen); } catch {}
    if (typeof setLang === "function") setLang(chosen);
    setExamLocked(true);
    // Shuffle questions each time the test starts
    setShuffledRIASEC(shuffleArray(Q_RIASEC));
    cd.reset(); cd.start();
    setStartTs(Date.now());
    setPage(R_START);
  };

  const endTest = async () => {
    try {
      const topCodes = Array.isArray(top3) ? top3.map(t => t.code || t) : [];
      const finishedAt = Date.now();
      const participant = {
        ...profile,
        started_at: startTs ? new Date(startTs).toISOString() : null,
        finished_at: new Date(finishedAt).toISOString(),
      };
      await saveTestSubmission({
        profile: participant,
        answers: ansTF,
        radarData,
        areaPercents: areaPerc,
        pillarAgg,
        pillarCounts,
        topCodes,
      });

      onNavigate("results", {
        radarData,
        areaPercents: areaPerc,
        interestPercents: interestsPerc,
        participant: { ...profile, ts: Date.now() },
        pillarAgg,
        pillarCounts,
      });
    } catch (e) {
      console.error("Save failed:", e);
      const msg = e?.message || String(e);
      alert(`Could not save your results. ${msg}`);
    }
  };

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

  if (authLoading) {
    return (
      <PageWrap>
        <HeaderBar title={ui.loadingTitle || "Loading"} right={null} lang={lang} />
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
      <PageWrap>
        <HeaderBar title={signInTitle} right={null} lang={lang} />
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

  /* ---------- Pages ---------- */
  const Timer = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {!examLocked && (
        <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />
      )}
      <TimerHeader label={`Time ${cd.fmt(cd.remaining)}`} />
    </div>
  );

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
      <PageWrap>
        <HeaderBar title="Career Guidance Test" lang={lang} />
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
                <Btn variant="primary" onClick={() => {
                  const expected = (import.meta.env.VITE_CG_ACCESS_CODE || "").trim();
                  if (expected && cgCode.trim() !== expected) { setCgErr(ui.invalidCode); return; }
                  setCgUnlocked(true);
                }}>Unlock</Btn>
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
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setExamLang(l.code)}
                      aria-pressed={examLang === l.code}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: examLang === l.code ? "2px solid #2563eb" : "1px solid #d1d5db",
                        background: examLang === l.code ? "#eff6ff" : "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                        minWidth: 80,
                      }}
                    >
                      {LANG_LABELS[l.code] || l.code} ({l.code})
                    </button>
                  ))}
                </div>
              </div>
              <p style={{ color:"#475569" }}>{ui.signedInAs} <b>{authUser?.email || profile.email || "user"}</b>. Your account details will be used for the report.</p>
              <div style={{ marginTop: 16, padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: "#0f172a" }}>{ui.participantTitle}</div>
                <p style={{ margin: 0, marginBottom: 12, color: "#475569", fontSize: 14 }}>
                  {ui.participantDesc}
                </p>
                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    {
                      key: "name",
                      label: ui.participantName,
                      placeholder: ui.participantNamePlaceholder,
                    },
                    {
                      key: "school",
                      label: ui.participantSchool,
                      placeholder: ui.participantSchoolPlaceholder,
                    },
                    {
                      key: "className",
                      label: ui.participantClass,
                      placeholder: ui.participantClassPlaceholder,
                    },
                    {
                      key: "phone",
                      type: "tel",
                      label: ui.participantPhone,
                      placeholder: ui.participantPhonePlaceholder,
                    },
                    {
                      key: "email",
                      type: "email",
                      label: ui.participantEmail,
                      placeholder: ui.participantEmailPlaceholder,
                    },
                  ].map(({ key, label, placeholder, type = "text" }) => {
                    const fieldValue = profile[key] || "";
                    let isFieldValid = true;
                    switch (key) {
                      case "email":
                        isFieldValid = isEmail(fieldValue);
                        break;
                      case "school":
                        isFieldValid = isValidSchool(fieldValue);
                        break;
                      case "className":
                        isFieldValid = isValidClass(fieldValue);
                        break;
                      case "phone":
                        isFieldValid = isValidPhone(fieldValue);
                        break;
                      default:
                        isFieldValid = isValidName(fieldValue);
                    }
                    const autoCompleteAttr =
                      key === "email"
                        ? "email"
                        : key === "name"
                          ? "name"
                          : key === "school"
                            ? "organization"
                            : key === "className"
                              ? "section"
                              : key === "phone"
                                ? "tel"
                                : "off";
                    return (
                      <label key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>{label}</span>
                        <input
                          type={type}
                          value={fieldValue}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            setProfile((prev) => ({ ...prev, [key]: nextValue }));
                            if (showProfileError) setShowProfileError(false);
                          }}
                          placeholder={placeholder}
                          autoComplete={autoCompleteAttr}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: showProfileError && !isFieldValid ? "1px solid #dc2626" : "1px solid #d1d5db",
                            fontSize: 14,
                            background: "#ffffff",
                          }}
                        />
                      </label>
                    );
                  })}
                  {showProfileError && (
                    <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>
                      {ui.participantError}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
                <Btn variant="back" onClick={()=>onNavigate("home")}>{ui.backHome}</Btn>
                <Btn variant="primary" onClick={startTest}>{ui.startTest}</Btn>
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
      <PageWrap>
        <HeaderBar title="Career Guidance Test" right={Timer} lang={lang} />
        <Card>
          <ProgressBar value={Math.round((indexFromPage(page)/totalQuestions)*100)} />
          <div style={{ marginTop: 18 }}>
            {(() => {
              const activeLang = examLocked ? (examLang || lang) : lang;
              const qText = cleanText(pickLocalized(q, "text", activeLang));
              const qArea = pickLocalized(q, "area", activeLang);
              return (
                <>
                  <h3 style={{ margin: 0, color: "#111827" }}>{qText}</h3>
                  {qArea && (
                    <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                      <b>{ui.area}</b> {cleanText(qArea)}
                    </div>
                  )}
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
