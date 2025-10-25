// src/pages/Test.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
// import { createPortal } from "react-dom";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import { PageWrap, HeaderBar, Card, Field, ProgressBar } from "../components/Layout.jsx";
import TimerHeader from "../components/TimerHeader.jsx";
import useCountdown from "../hooks/useCountdown.js";
import { LANGS } from "../i18n/strings.js";
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
  // Quick sanitize for common mojibake sequences
  return String(s)
    .replace(/â/g, "'")
    .replace(/â/g, "—")
    .replace(/â/g, "–")
    .replace(/A�A\?A"/g, " — ")
    .replace(/A�A\?ATs/g, "'s")
    .replace(/A�A\?ATre/g, "'re")
    .replace(/A�A\?ATt/g, "'t");
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

  // Require sign-in before taking the test (local-only auth)
  const [currentUser] = useState(() => {
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  if (!currentUser) {
    return (
      <PageWrap>
        <HeaderBar title="Sign In Required" right={null} />
        <Card>
          <p style={{ color: "#6b7280" }}>
            Please sign in to start the test.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  const [page, setPage] = useState(INTRO);
  const [profile, setProfile] = useState(() => {
    let user = null;
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      user = raw ? JSON.parse(raw) : null;
    } catch {}
    return {
      name: user?.name || user?.username || "",
      email: user?.email || "",
      school: "",
    };
  });
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
  const cd = useCountdown(timerMin * 60);
  const [startTs, setStartTs] = useState(null);

  const [shuffledRIASEC, setShuffledRIASEC] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      if (saved && (saved.name || saved.email || saved.school)) {
        setProfile((prev) => ({
          name: saved.name || prev.name,
          email: saved.email || prev.email,
          school: saved.school || prev.school,
        }));
      }
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }, [profile]);

  const isEmail = (s) => /^\S+@\S+\.\S+$/.test(String(s || "").trim());
  const isValidName = (s) => String(s || "").trim().length > 1;
  const isValidSchool = (s) => String(s || "").trim().length > 1;
  const isValidProfile = () => isValidName(profile.name) && isEmail(profile.email) && isValidSchool(profile.school);

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
    if (!isValidProfile()) return setShowProfileError(true);
    setShowProfileError(false);
    // Shuffle questions each time the test starts
    setShuffledRIASEC(shuffleArray(Q_RIASEC));
    cd.reset(); cd.start();
    setStartTs(Date.now());
    setPage(R_START);
  };

  const endTest = async () => {
    try {
      const topCodes = Array.isArray(top3) ? top3.map(t => t.code || t) : [];
      try {
        const finishedAt = Date.now(); const participant = { ...profile, started_at: (startTs ? new Date(startTs).toISOString() : null), finished_at: new Date(finishedAt).toISOString() }; await saveTestSubmission({ profile: participant,
          answers: ansTF,
          radarData,
          areaPercents: areaPerc,
          pillarAgg,
          pillarCounts,
          topCodes,
        });
      } catch (e) {
        console.warn("Save to Supabase failed, falling back to localStorage:", e);
        const rows = JSON.parse(localStorage.getItem("cg_submissions_v1") || "[]");
        rows.push({ id: Date.now(), ts: Date.now(), profile, answers: ansTF, radar_data: radarData, area_percents: areaPerc, pillar_agg: pillarAgg, pillar_counts: pillarCounts, top_codes: topCodes, riasec_code: topCodes[0] || null });
        localStorage.setItem("cg_submissions_v1", JSON.stringify(rows));
      }

      onNavigate("results", {
        radarData,
        areaPercents: areaPerc,
        interestPercents: interestsPerc,
        participant: { ...profile, ts: Date.now() },
        pillarAgg,
        pillarCounts,
      });
    } catch (e) {
      console.error(e);
      alert("Could not save your results. Please try again.");
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

  /* ---------- Pages ---------- */
  const Timer = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />
      <TimerHeader label={`Time ${cd.fmt(cd.remaining)}`} />
    </div>
  );

  // Intro
  if (page === INTRO) {
    const invalid = showProfileError && !isValidProfile();
    const isAdmin = localStorage.getItem("cg_admin_ok_v1") === "1";
    return (
      <PageWrap>
        <HeaderBar title="Career Guidance Test" />
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <Field
              label="Name"
              value={profile.name}
              onChange={(e)=>setProfile({...profile,name:e.target.value})}
              placeholder="e.g., Amina Khalil"
            />
            <Field
              label="Email"
              value={profile.email}
              onChange={(e)=>setProfile({...profile,email:e.target.value})}
              placeholder="e.g., name@example.com"
            />
            <Field
              label="School / Organization"
              value={profile.school}
              onChange={(e)=>setProfile({...profile,school:e.target.value})}
              placeholder="e.g., Horizon High School"
            />
          </div>
          {isAdmin && (
            <div style={{ marginTop: 16, padding: 12, border: "1px dashed #cbd5e1", borderRadius: 10, background: "#f8fafc", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 600 }}>Timer (minutes):</div>
              <input
                type="number"
                min={1}
                max={180}
                value={timerMin}
                onChange={(e)=>setTimerMin(Math.max(1,Math.min(180,Number(e.target.value)||1)))}
                style={{ width: 80, padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db", fontWeight: 600 }}
              />
              <div style={{ marginLeft: "auto", color: "#475569" }}>Current: <b>{timerMin} min</b></div>
            </div>
          )}
          <p style={{ color:"#475569", marginTop: 10 }}>
            Your results will be saved securely and available to admins.
          </p>
          {invalid && <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 14 }}>Please complete all fields correctly.</div>}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
            <Btn variant="back" onClick={()=>onNavigate("home")}>Back Home</Btn>
            <Btn variant="primary" onClick={startTest} disabled={!isValidProfile()}>Start Test</Btn>
          </div>
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
        <HeaderBar title="Career Guidance Test" right={Timer} />
        <Card>
          <ProgressBar value={Math.round((indexFromPage(page)/totalQuestions)*100)} />
          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: 0, color: "#111827" }}>{cleanText(q.text)}</h3>
            {q.area && (
              <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                <b>Area:</b> {cleanText(q.area)}
              </div>
            )}
            <p style={{ color: "#6b7280", marginTop: 8 }}>Rate (1 = Not at all, 5 = Very much)</p>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>Tip: you can press keys 1-5 to answer</div>
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






