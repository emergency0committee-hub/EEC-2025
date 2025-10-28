// src/pages/sat/SATExam.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card, ProgressBar } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { SATFooterBar } from "./SATLayout.jsx";
import PaletteOverlay from "../test/PaletteOverlay.jsx";
import useCountdown from "../../hooks/useCountdown.js";
import { supabase } from "../../lib/supabase.js";
import { saveSatResult } from "../../lib/supabaseStorage.js";
import { loadRWModules, MATH_MODULES } from "../../sat/questions.js";

export default function SATExam({ onNavigate, practice = null }) {
  SATExam.propTypes = { onNavigate: PropTypes.func.isRequired, practice: PropTypes.object };

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
  const modules = useMemo(() => {
    if (practice) {
      // Custom quiz (from Classwork/Homework/Quiz CSV)
      if (practice.custom && Array.isArray(practice.custom.questions)) {
        const qs = practice.custom.questions || [];
        const dur = Number(practice.custom.durationSec || 15 * 60);
        const title = practice.custom.title || 'Custom Quiz';
        return [{ key: 'custom', title, durationSec: dur, questions: qs }];
      }
      // Simple practice: one module per selection
      if (practice.section === 'MATH') {
        const m = MATH_MODULES[0] || [];
        return [{ key: 'pm', title: 'Math Practice', durationSec: 15 * 60, questions: m }];
      }
      return [{ key: 'prw', title: 'Reading & Writing Practice', durationSec: 15 * 60, questions: (rwMods[0] || []).slice(0, 10) }];
    }
    return [
      { key: "rw1", title: "Reading & Writing — Module 1", durationSec: 32 * 60, questions: rwMods[0] || [] },
      { key: "rw2", title: "Reading & Writing — Module 2", durationSec: 32 * 60, questions: rwMods[1] || [] },
      { key: "m1",  title: "Math — Module 1",              durationSec: 35 * 60, questions: MATH_MODULES[0] || [] },
      { key: "m2",  title: "Math — Module 2",              durationSec: 35 * 60, questions: MATH_MODULES[1] || [] },
    ];
  }, [rwMods, practice]);

  const [modIdx, setModIdx] = useState(0);
  const mod = modules[modIdx];
  const totalMods = modules.length;
  const [answers, setAnswers] = useState({}); // { modKey: { qid: value } }
  const [flags, setFlags] = useState({}); // { modKey: { qid: true } }
  const [showPalette, setShowPalette] = useState(false);
  const [page, setPage] = useState(1);
  const qCount = mod?.questions?.length || 0;
  const cd = useCountdown(mod?.durationSec || 60);
  const startedAtRef = useRef(Date.now());

  useEffect(() => { // reset timer and page on module change
    cd.reset(mod?.durationSec || 60); cd.start();
    setPage(1);
  }, [modIdx]);

  useEffect(() => { // auto-advance on timer end
    if (cd.remaining <= 0) {
      handleNextModule();
    }
  }, [cd.remaining]);

  if (!mod) return null;

  const currentAns = answers[mod.key] || {};
  const currentFlags = flags[mod.key] || {};
  const setAns = (qid, val) => setAnswers((s) => ({ ...s, [mod.key]: { ...(s[mod.key] || {}), [qid]: val } }));
  const toggleFlag = (qid) => setFlags((s) => ({ ...s, [mod.key]: { ...(s[mod.key] || {}), [qid]: !((s[mod.key] || {})[qid]) } }));

  const handleNextModule = () => {
    if (modIdx + 1 < totalMods) {
      setModIdx(modIdx + 1);
    } else {
      handleSubmit();
    }
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
        if (a[q.id] != null && String(a[q.id]) === String(q.correct)) t.correct += 1;
      });
    });
    return summary;
  };

  const handleSubmit = async () => {
    const finishedAt = Date.now();
    const elapsedSec = Math.round((finishedAt - startedAtRef.current) / 1000);
    const summary = scoreSummary();
    try {
      if (practice) {
        const { saveSatTraining } = await import("../../lib/supabaseStorage.js");
        await saveSatTraining({
          kind: practice.kind || 'classwork',
          section: practice.section || null,
          unit: practice.unit || null,
          lesson: practice.lesson || null,
          summary,
          answers,
          elapsedSec,
        });

        // If this is a custom quiz (from CSV), route to results page with skills breakdown
        if (practice.custom && Array.isArray(practice.custom.questions)) {
          const qs = practice.custom.questions || [];
          const bySkill = new Map(); // key -> { label, correct, total }
          const a = answers[modules[0]?.key || 'custom'] || {};
          qs.forEach((q) => {
            const sk = (q.skill || '').trim();
            const label = sk || 'General';
            if (!bySkill.has(label)) bySkill.set(label, { label, correct: 0, total: 0 });
            const rec = bySkill.get(label);
            rec.total += 1;
            const picked = a[q.id];
            if (picked != null && String(picked) === String(q.correct)) rec.correct += 1;
          });
          const customSkills = Array.from(bySkill.values()).map(r => ({
            label: r.label,
            pct: r.total ? Math.round((r.correct / r.total) * 100) : 0,
            correct: r.correct,
            total: r.total,
          }));
          const count = qs.length;
          const submission = {
            ts: new Date().toISOString(),
            pillar_agg: { summary },
            pillar_counts: { modules: [{ key: 'custom', title: practice.custom.title || 'Custom Quiz', count }], elapsedSec, avgSec: count ? Math.round(elapsedSec / count) : 0 },
            customSkills,
          };
          onNavigate('sat-results', { submission });
        } else {
          onNavigate('sat-training');
        }
      } else {
        await saveSatResult({
          summary,
          answers,
          modules: modules.map((m) => ({ key: m.key, title: m.title, count: m.questions.length })),
          elapsedSec,
        });
        onNavigate("sat-results", { submission: { pillar_agg: { summary }, pillar_counts: { modules: modules.map((m) => ({ key: m.key, title: m.title, count: m.questions.length })), elapsedSec } } });
      }
    } catch (e) {
      console.error("SAT save failed:", e);
      alert(e?.message || String(e));
    }
  };

  const q = mod.questions[page - 1];
  const percent = qCount ? Math.round((page / qCount) * 100) : 0;

  // Helpers
  const letter = (i) => String.fromCharCode(65 + i); // 0 -> A

  const [showPassage, setShowPassage] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [overlay, setOverlay] = useState({ open: false, title: "", message: "" });
  const openOverlay = (title, message) => setOverlay({ open: true, title, message });
  const closeOverlay = () => setOverlay((o) => ({ ...o, open: false }));

  return (
    <PageWrap>
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
              {showTimer ? cd.fmt(cd.remaining) : ""}
            </div>
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setShowTimer((v) => !v)}
                style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 999, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}
              >
                {showTimer ? "Hide" : "Show"}
              </button>
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
              {q.passage}
            </div>
          )}
          <div>
            <h3 style={{ margin: 0, color: "#111827", lineHeight: 1.4 }}>{q?.text || "No question available."}</h3>
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
            {(q?.choices || []).map((ch, idx) => {
              const isSelected = currentAns[q.id] === ch.value;
              return (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => setAns(q.id, ch.value)}
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
                  <span style={{ color: "#111827" }}>{ch.label}</span>
                </button>
              );
            })}
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
