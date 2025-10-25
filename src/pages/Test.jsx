// src/pages/Test.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
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
  Q_UNIFIED as RAW_RIASEC,
} from "../questionBank.js";

import { supabase } from "../lib/supabase.js";

/* ====================== Supabase helpers ====================== */
async function ensureAuth(email) {
  // if already logged in, return user
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  // kick off magic-link sign-in
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;

  alert("A login link was sent to your email. Open it, then return to start the test.");
  return null;
}

async function sbStartAttempt(userId, profile) {
  // Add name/school here if you added these columns to `attempts`
  const { data, error } = await supabase
    .from("attempts")
    .insert({ user_id: userId, test_version: "v1" })
    .select()
    .single();
  if (error) throw error;
  return data; // { id, ... }
}

async function sbSaveAnswers(attemptId, answersMap) {
  const rows = Object.entries(answersMap)
    .filter(([, v]) => v != null)
    .map(([qid, value]) => ({ attempt_id: attemptId, qid, value }));
  if (!rows.length) return;
  const { error } = await supabase.from("answers").insert(rows);
  if (error) throw error;
}

async function sbFinishAttempt(attemptId, resultObj) {
  const { error: e1 } = await supabase
    .from("attempts")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", attemptId);
  if (e1) throw e1;

  const { error: e2 } = await supabase
    .from("results")
    .insert({
      attempt_id: attemptId,
      riasec: resultObj.riasec,
      top_codes: resultObj.top_codes,
      overall: resultObj.overall ?? null,
    });
  if (e2) throw e2;
}

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
function QuestionPalette({
  totalQuestions,
  currentIndex,
  onJump,
  onClose,
  savedScroll,
  setSavedScroll,
  answeredIndexes,
}) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current != null && savedScroll != null) {
      scrollRef.current.scrollTop = savedScroll;
    }
  }, [savedScroll]);

  const handleClose = () => {
    if (scrollRef.current) setSavedScroll(scrollRef.current.scrollTop);
    onClose();
  };
  const handleJump = (idx) => {
    if (scrollRef.current) setSavedScroll(scrollRef.current.scrollTop);
    onJump(idx);
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        ref={scrollRef}
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          maxWidth: 900,
          width: "90vw",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Jump to a Question</h3>
          <Btn variant="back" onClick={handleClose}>Close</Btn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(40px, 1fr))", gap: 8 }}>
          {Array.from({ length: totalQuestions }, (_, i) => {
            const idx = i + 1;
            const isCurrent = idx === currentIndex;
            const isAnswered = answeredIndexes?.has(idx);
            const bg = isCurrent ? "#2563eb" : isAnswered ? "#d1fae5" : "#f3f4f6";
            const br = isCurrent ? "1px solid #2563eb" : isAnswered ? "1px solid #10b981" : "1px solid #d1d5db";
            const fg = isCurrent ? "#fff" : "#111827";
            return (
              <button
                key={idx}
                onClick={() => handleJump(idx)}
                style={{
                  padding: "10px 0",
                  borderRadius: 6,
                  border: br,
                  background: bg,
                  color: fg,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {idx}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ====================== MAIN COMPONENT ====================== */
export default function Test({ onNavigate, lang = "EN", setLang }) {
  Test.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
  };
  const lenR = Q_RIASEC.length;
  const INTRO = 0;
  const R_START = 1;
  const LAST = R_START + Math.max(0, lenR - 1);
  const totalQuestions = lenR;

  const indexFromPage = (p) => (p >= R_START && p <= LAST ? p - R_START + 1 : 0);
  const pageFromIndex = (idx) => R_START + (idx - 1);

  const [page, setPage] = useState(INTRO);
  const [profile, setProfile] = useState({ name: "", email: "", school: "" });
  const [showProfileError, setShowProfileError] = useState(false);
  const [ansTF, setAnsTF] = useState({});
  const [showPalette, setShowPalette] = useState(false);
  const [savedScroll, setSavedScroll] = useState(null);
  const [attemptId, setAttemptId] = useState(null);

  const [timerMin, setTimerMin] = useState(() => {
    const saved = Number(localStorage.getItem("cg_timer_min") || 30);
    return Number.isFinite(saved) && saved > 0 ? saved : 30;
  });
  useEffect(() => { localStorage.setItem("cg_timer_min", String(timerMin)); }, [timerMin]);
  const cd = useCountdown(timerMin * 60);
  const [startTs, setStartTs] = useState(null);

  const shuffledRIASEC = useMemo(() => shuffleArray(Q_RIASEC), []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      if (saved && (saved.name || saved.email || saved.school)) setProfile(saved);
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

  const next = () => setPage((p) => Math.min(p + 1, LAST));
  const prev = () => setPage((p) => Math.max(p - 1, INTRO));

  const startTest = async () => {
    if (!isValidProfile()) return setShowProfileError(true);
    setShowProfileError(false);

    const user = await ensureAuth(profile.email);
    if (!user) return; // user must finish email sign-in

    const attempt = await sbStartAttempt(user.id, profile);
    setAttemptId(attempt.id);

    cd.reset(); cd.start();
    setStartTs(Date.now());
    setPage(R_START);
  };

  const endTest = async () => {
    try {
      if (!attemptId) {
        alert("No attempt started. Please start again.");
        return;
      }

      const resultObj = {
        riasec: riasecSums,
        top_codes: Array.isArray(top3) ? top3.map(t => t.letter ?? t?.code ?? t) : [],
        overall: null,
      };

      await sbSaveAnswers(attemptId, ansTF);
      await sbFinishAttempt(attemptId, resultObj);

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
      alert("Could not save to the server. Please check your connection and try again.");
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
  }, [page, R_START, LAST, shuffledRIASEC, setAnsTF, next, prev, endTest]);

  /* ---------- Pages ---------- */
  const Timer = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />
      <TimerHeader label={`⏳ ${cd.fmt(cd.remaining)}`} />
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
            <Field label="Name" value={profile.name} onChange={(e)=>setProfile({...profile,name:e.target.value})}/>
            <Field label="Email" value={profile.email} onChange={(e)=>setProfile({...profile,email:e.target.value})}/>
            <Field label="School / Organization" value={profile.school} onChange={(e)=>setProfile({...profile,school:e.target.value})}/>
          </div>
          {isAdmin && (
            <div style={{ marginTop: 16, padding: 12, border: "1px dashed #cbd5e1", borderRadius: 10, background: "#f8fafc", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 600 }}>⏱ Timer (minutes):</div>
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
            We’ll send a one-time login link to your email to secure your results.
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
    const current = ansTF[q.id];
    const isLast = page === LAST;
    return (
      <PageWrap>
        <HeaderBar title="Career Guidance Test" right={Timer} />
        <Card>
          <ProgressBar value={Math.round((indexFromPage(page)/totalQuestions)*100)} />
          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: 0, color: "#111827" }}>{q.text}</h3>
            {q.area && (
              <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>
                <b>Area:</b> {q.area}
              </div>
            )}
            <p style={{ color: "#6b7280", marginTop: 8 }}>Rate (1 = Not at all, 5 = Very much)</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {[1,2,3,4,5].map(v=>(
                <Btn key={v} variant="secondary" selected={current===v} onClick={()=>setAnsTF(s=>({...s,[q.id]:v}))} style={{minWidth:48}}>{v}</Btn>
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
