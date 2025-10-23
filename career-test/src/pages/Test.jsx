// src/pages/Test.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import Btn from "../components/Btn.jsx";
import { PageWrap, HeaderBar, Card, Field, ProgressBar } from "../components/Layout.jsx";
import TimerHeader from "../components/TimerHeader.jsx";
import useCountdown from "../hooks/useCountdown.js";

// ---- Updated imports for new questionBank.js ----
import {
  RIASEC_SCALE_MAX,
  Q_UNIFIED as RAW_RIASEC,   // unified RIASEC + pillars
} from "../questionBank.js";

// New placeholders (since APT/WORK/INT no longer exist)
const RAW_APT = [];
const RAW_WORK = [];
const RAW_INT  = [];

// ---- Scoring + validation ----
import {
  riasecFromAnswers,
  answeredCountByLetter,
  topRIASECFiltered,
  riasecRadarDataFiltered,
  aptitudeAggFromAnswers,
  aptitudeBarData,
  riasecAreaPercents,
  interestPercents,
} from "../lib/scoring.js";
import { validateAll } from "../lib/validate.js";

// Validate banks (catches duplicate ids, missing fields, etc.)
const { Q_RIASEC, Q_APT, Q_WORK, Q_INT } = validateAll({
  Q_RIASEC: RAW_RIASEC,
  Q_APT: RAW_APT,
  Q_WORK: RAW_WORK,
  Q_INT: RAW_INT,
});

const STORAGE_KEY = "cg_submissions_v1";
const PROFILE_KEY = "cg_profile_v1";
const readSubs = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const writeSubs = (rows) => localStorage.setItem(STORAGE_KEY, JSON.stringify(rows || []));

// Fisher–Yates shuffle (used only for RIASEC)
function shuffleArray(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Reusable shell around question content
function QuestionShell({ children, progress, timerRight }) {
  return (
    <PageWrap>
      <HeaderBar title="Career Guidance Test" right={timerRight} />
      <Card>
        <ProgressBar value={progress} />
        <div style={{ marginTop: 18 }}>{children}</div>
      </Card>
    </PageWrap>
  );
}

// Palette overlay (jump between questions)
function QuestionPalette({
  totalQuestions,
  currentIndex,
  onJump,
  onClose,
  savedScroll,
  setSavedScroll,
}) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current && savedScroll != null) {
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onWheel={(e)=> e.stopPropagation()}
      onTouchMove={(e)=> e.stopPropagation()}
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(10, minmax(40px, 1fr))",
            gap: 8,
          }}
        >
          {Array.from({ length: totalQuestions }, (_, i) => {
            const idx = i + 1;
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={() => handleJump(idx)}
                style={{
                  padding: "10px 0",
                  borderRadius: 6,
                  border: isCurrent ? "1px solid #2563eb" : "1px solid #d1d5db",
                  background: isCurrent ? "#2563eb" : "#f3f4f6",
                  color: isCurrent ? "#fff" : "#111827",
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
    </div>
  );
}

export default function Test({ onNavigate }) {
  // lengths
  const lenR = Q_RIASEC.length;
  const lenA = Q_APT.length;
  const lenW = Q_WORK.length;
  const lenI = Q_INT.length;

  // paging map
  const INTRO = 0;
  const R_START = 1;
  const A_START = R_START + lenR;
  const W_START = A_START + lenA;
  const I_START = W_START + lenW;
  const LAST = (
    lenI > 0 ? I_START + Math.max(0, lenI - 1) :
    lenW > 0 ? W_START + Math.max(0, lenW - 1) :
    lenA > 0 ? A_START + Math.max(0, lenA - 1) :
               R_START + Math.max(0, lenR - 1)
  );
  const totalQuestions = lenR + lenA + lenW + lenI;

  const indexFromPage = (p) => {
    if (p >= R_START && p < A_START) return p - R_START + 1;
    if (p >= A_START && p < W_START) return (p - A_START + 1) + lenR;
    if (p >= W_START && p < I_START) return (p - W_START + 1) + lenR + lenA;
    if (p >= I_START && p <= LAST)   return (p - I_START + 1) + lenR + lenA + lenW;
    return 0;
  };

  // state
  const [page, setPage] = useState(INTRO);
  const [profile, setProfile] = useState({ name: "", email: "", school: "" });
  const [showProfileError, setShowProfileError] = useState(false);
  const [ansTF, setAnsTF] = useState({});
  const [ansMCQ, setAnsMCQ] = useState({});
  const [showPalette, setShowPalette] = useState(false);
  const [savedScroll, setSavedScroll] = useState(null);

  // countdown
  const cd = useCountdown(30 * 60);
  const [startTs, setStartTs] = useState(null);

  // shuffle RIASEC
  const shuffledRIASEC = useMemo(() => shuffleArray(Q_RIASEC), []);

  // profile persistence
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      if (saved && (saved.name || saved.email || saved.school)) {
        setProfile({ name: saved.name || "", email: saved.email || "", school: saved.school || "" });
      }
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  // validators
  const isEmail = (s) => /^\S+@\S+\.\S+$/.test(String(s || "").trim());
  const isValidName = (s) => String(s || "").trim().length > 1;
  const isValidSchool = (s) => String(s || "").trim().length > 1;
  const isValidProfile = () => isValidName(profile.name) && isEmail(profile.email) && isValidSchool(profile.school);

  // derived data
  const riasecSums     = useMemo(() => riasecFromAnswers(Q_RIASEC || [], ansTF), [ansTF]);
  const answeredCounts = useMemo(() => answeredCountByLetter(Q_RIASEC || [], ansTF), [ansTF]);
  const top3           = useMemo(() => topRIASECFiltered(riasecSums, answeredCounts), [riasecSums, answeredCounts]);
  const radarData      = useMemo(() => riasecRadarDataFiltered(riasecSums, answeredCounts, RIASEC_SCALE_MAX), [riasecSums, answeredCounts]);
  const areaPerc       = useMemo(() => riasecAreaPercents(Q_RIASEC || [], ansTF, RIASEC_SCALE_MAX), [ansTF]);
  const aptAgg         = useMemo(() => aptitudeAggFromAnswers(Q_APT || [], ansMCQ), [ansMCQ]);
  const aptBars        = useMemo(() => aptitudeBarData(aptAgg), [aptAgg]);
  const interestsPerc  = useMemo(() => interestPercents(Q_INT || [], ansTF), [ansTF]);

  // save submission
  const saveSubmission = () => {
    const endTs = Date.now();
    const durationSec = startTs ? Math.round((endTs - startTs) / 1000) : undefined;
    const rows = readSubs();
    rows.push({
      ts: new Date(endTs).toISOString(),
      name: profile.name || "",
      email: profile.email || "",
      school: profile.school || "",
      top3,
      riasec: riasecSums,
      radarData,
      areaPercents: areaPerc,
      interestPercents: interestsPerc,
      aptitude: aptBars.reduce((acc, x) => { acc[x.domain] = x.score; return acc; }, {}),
      durationSec,
      remainingSec: cd.remaining,
    });
    writeSubs(rows);
  };

  // auto-submit on time up
  useEffect(() => {
    if (cd.remaining === 0 && page !== INTRO) {
      saveSubmission();
      onNavigate("results", {
        code: top3,
        radar: radarData,
        areaPercents: areaPerc,
        interestPercents: interestsPerc,
      });
    }
  }, [cd.remaining]);

  const progressPct = useMemo(() => {
    const idx = indexFromPage(page);
    if (!idx || totalQuestions === 0) return 0;
    return Math.round((idx / totalQuestions) * 100);
  }, [page, totalQuestions]);

  const next = () => setPage((p) => Math.min(p + 1, LAST));
  const prev = () => setPage((p) => Math.max(p - 1, INTRO));

  const startTest = () => {
    if (!isValidProfile()) {
      setShowProfileError(true);
      return;
    }
    setShowProfileError(false);
    cd.reset();
    cd.start();
    setStartTs(Date.now());
    setPage(R_START);
  };

  const endTest = () => {
    saveSubmission();
    onNavigate("results", {
      code: top3,
      radar: radarData,
      areaPercents: areaPerc,
      interestPercents: interestsPerc,
    });
  };

  const Timer = <TimerHeader label={`⏳ ${cd.fmt(cd.remaining)}`} />;

  // ============ INTRO PAGE ============
  if (page === INTRO) {
    const nameInvalid = showProfileError && !isValidName(profile.name);
    const emailInvalid = showProfileError && !isEmail(profile.email);
    const schoolInvalid = showProfileError && !isValidSchool(profile.school);

    return (
      <PageWrap>
        <HeaderBar title="Career Guidance Test" right={null} />
        <Card>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <Field label="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" invalid={nameInvalid}/>
            <Field label="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="email@example.com" invalid={emailInvalid}/>
            <Field label="School / Organization" value={profile.school} onChange={(e) => setProfile({ ...profile, school: e.target.value })} placeholder="Your school" invalid={schoolInvalid}/>
          </div>
          {showProfileError && (
            <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 14 }}>
              Please complete all fields (valid email) to begin.
            </div>
          )}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
            <Btn variant="primary" onClick={startTest} disabled={!isValidProfile()}>Start Test</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  // ============ RIASEC ============
  if (page >= R_START && page <= LAST) {
    const idx = page - R_START;
    const q = shuffledRIASEC[idx];
    if (!q) return null;
    const current = ansTF[q.id];
    const isLast = page === LAST;

    return (
      <QuestionShell progress={progressPct} timerRight={Timer}>
        <h3 style={{ margin: 0, color: "#111827" }}>{q.text}</h3>
        {q.area && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            color: "#374151",
            fontSize: 13,
            fontWeight: 500
          }}>
            <span style={{ width: 6, height: 6, background: "#2563eb", borderRadius: 999 }} />
            {q.area}
          </div>
        )}
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          Rate how much this sounds like you (1 = Not at all, 5 = Very much).
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 18, flexWrap: "wrap" }}>
          {[1,2,3,4,5].map((v) => (
            <Btn
              key={v}
              variant="secondary"
              selected={current === v}
              onClick={() => setAnsTF((s) => ({ ...s, [q.id]: v }))}>
              {v}
            </Btn>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, gap: 8 }}>
          <Btn variant="back" onClick={prev} disabled={page === R_START}>Back</Btn>

          <Btn variant="secondary" onClick={() => setShowPalette(true)}>
            Question {indexFromPage(page)} / {totalQuestions}
          </Btn>

          {isLast ? (
            <Btn variant="primary" onClick={endTest}>End Test</Btn>
          ) : (
            <Btn variant="primary" onClick={next}>Next</Btn>
          )}
        </div>

        {showPalette && (
          <QuestionPalette
            totalQuestions={totalQuestions}
            currentIndex={indexFromPage(page)}
            onJump={(idx1) => setPage(idx1)}
            onClose={() => setShowPalette(false)}
            savedScroll={savedScroll}
            setSavedScroll={setSavedScroll}
          />
        )}
      </QuestionShell>
    );
  }

  return null;
}
