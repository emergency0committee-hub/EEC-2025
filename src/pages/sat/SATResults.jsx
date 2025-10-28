// src/pages/sat/SATResults.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";

function colorForPct(pct) {
  const p = Math.max(0, Math.min(100, Number(pct || 0)));
  if (p < 20) return "#ef4444";      // red
  if (p < 40) return "#e2f50bff";      // orange
  if (p < 60) return "#fbbf24";      // amber
  if (p < 80) return "#84cc16";      // lime
  return "#22c55e";                   // green
}

function BarRow({ label, valuePct, color = "auto", hideValue = false }) {
  const pct = Math.round(Math.max(0, Math.min(100, Number(valuePct || 0))));
  const barColor = (color === "auto" || !color) ? colorForPct(pct) : color;
  return (
    <div className="avoid-break" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#374151", marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        {!hideValue && <span>{pct}%</span>}
      </div>
      <div style={{ height: 10, background: "#f3f4f6", borderRadius: 999, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor }} />
      </div>
    </div>
  );
}

function ScoreChip({ label, pct, color = "#2563eb" }) {
  const scaled = Math.round(200 + Math.max(0, Math.min(100, Number(pct || 0))) * 6); // 200–800 estimate
  return (
    <div style={{
      border: `1px solid ${color}`,
      background: "#fff",
      borderRadius: 12,
      padding: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      minWidth: 220,
    }}>
      <div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Estimated</div>
        <div style={{ fontWeight: 800, color: color }}>{scaled}/800</div>
      </div>
    </div>
  );
}

export default function SATResults({ onNavigate, submission }) {
  SATResults.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    submission: PropTypes.object,
  };

  const s = submission || {};
  const participant = s.participant || {};
  const summary = s.pillar_agg?.summary || { rw: { correct: 0, total: 0 }, math: { correct: 0, total: 0 } };
  const modules = s.pillar_counts?.modules || [];
  const elapsedSec = s.pillar_counts?.elapsedSec || 0;
  const avgSec = s.pillar_counts?.avgSec || 0;

  const pct = (c, t) => (t > 0 ? Math.round((c / t) * 100) : 0);
  const rwPct = pct(summary.rw.correct, summary.rw.total);
  const mathPct = pct(summary.math.correct, summary.math.total);
  const dateStr = s.ts ? new Date(s.ts).toLocaleDateString() : new Date().toLocaleDateString();
  const fmtDur = (sec) => {
    if (!Number.isFinite(sec)) return "—";
    const mm = Math.floor(sec / 60).toString().padStart(2, "0");
    const ss = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // English (RW) skills list with descriptions
  const EN_SKILLS = [
    { key: "central_ideas",  label: "Central Ideas and Details", desc: "finding the main idea, key points, and supporting details." },
    { key: "cross_text",     label: "Cross-Text Connections", desc: "Compare and contrast arguments, themes, or evidence across multiple passages." },
    { key: "inference",      label: "Inference", desc: "Draw logical conclusions from information that is implied but not directly stated." },
    { key: "interpreting_data", label: "Interpreting Data", desc: "Analyze and interpret charts, tables, and graphs in relation to the passage." },
    { key: "modifier",       label: "Modifier Placement", desc: "Place modifiers clearly to avoid confusion." },
    { key: "parallel",       label: "Parallel Structure", desc: "Maintain grammatical consistency in lists and paired ideas." },
    { key: "pronoun",        label: "Pronoun Usage", desc: "Use correct pronouns and avoid ambiguity." },
    { key: "punctuation",    label: "Punctuation Rules", desc: "Correct use of commas, semicolons, colons, apostrophes, and dashes." },
    { key: "rhetoric",       label: "Rhetorical purpose & point of view", desc: "Recognize why specific examples, details, or evidence are included." },
    { key: "text_structure", label: "Text Structure and Purpose", desc: "Analyze how the passage is organized and the author’s purpose." },
    { key: "evidence",       label: "Textual Command of Evidence", desc: "Select the most relevant textual evidence to support a claim or conclusion." },
    { key: "transitions",    label: "Transitions", desc: "Choose or revise words/phrases to improve logical flow between sentences and paragraphs." },
    { key: "verbs",          label: "Verbs Agreement", desc: "Ensure verbs match subjects in number and person" },
    { key: "vocab",          label: "Vocabulary in Context", desc: "Determine the meaning of words or phrases using contextual clues." },
  ];
  const rwSkills = useMemo(() => {
    // Expect optional submission.pillar_agg.skills.rw = { key: percent }
    const byKey = s.pillar_agg?.skills?.rw || {};
    return EN_SKILLS.map((sk) => ({ ...sk, pct: Math.round(Number(byKey[sk.key] ?? 0)) }));
  }, [s]);

  // Math units and lessons
  const MATH_UNITS = [
    {
      key: "algebra",
      label: "Algebra",
      lessons: [
        { key: "linear_equations", label: "Linear Equations and Inequalities" },
        { key: "linear_functions", label: "Linear Functions" },
        { key: "systems", label: "Systems of Linear Equations" },
      ],
    },
    {
      key: "psda",
      label: "Problem Solving & Data Analysis",
      lessons: [
        { key: "ratios", label: "Ratios, Proportions, and Percentages" },
        { key: "rates", label: "Rates" },
        { key: "probability", label: "Probability" },
        { key: "data_interpretation", label: "Data Interpretation" },
        { key: "statistics", label: "Statistics" },
      ],
    },
    {
      key: "adv_math",
      label: "Advanced Math",
      lessons: [
        { key: "rational_expressions", label: "Rational Expressions and Equations" },
        { key: "quadratic_functions", label: "Quadratic Functions" },
        { key: "exponential_functions", label: "Exponential Functions" },
        { key: "exponent_rules", label: "Exponent Rules" },
        { key: "polynomial_expressions", label: "Polynomial Expressions" },
      ],
    },
    {
      key: "geo_trig",
      label: "Geometry & Trigonometry",
      lessons: [
        { key: "angle_relationships", label: "Angle Relationships" },
        { key: "coordinate_geometry", label: "Coordinate Geometry" },
        { key: "area_perimeter", label: "Area and Perimeter" },
        { key: "right_triangle_trig", label: "Right Triangle Trigonometry" },
        { key: "volume_surface_area", label: "Volume and Surface Area" },
      ],
    },
  ];

  const mathUnits = useMemo(() => {
    // Expect optional submission.pillar_agg.skills.math structure:
    // { unitKey: { pct: number, lessons: { lessonKey: number } }, ... }
    const byKey = s.pillar_agg?.skills?.math || {};
    return MATH_UNITS.map((u) => {
      const unit = byKey[u.key];
      const unitPct = Math.round(Number((unit && unit.pct) ?? byKey[u.key] ?? 0));
      const lessons = u.lessons.map((l) => ({
        ...l,
        pct: Math.round(Number((unit && unit.lessons && unit.lessons[l.key]) ?? byKey[l.key] ?? 0)),
      }));
      return { key: u.key, label: u.label, pct: unitPct, lessons };
    });
  }, [s]);

  return (
    <PageWrap>
      <style>{`
        .card { border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; padding: 16px; }
        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        .muted { color: #6b7280; }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: #fff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <HeaderBar title="SAT Diagnostic Results" />

      {/* Card 1: Total Score out of 1600 (name/date left, total box right) */}
      <div className="card avoid-break" style={{ marginBottom: 16 }}>
        {(() => {
          const scaledRW = Math.round(200 + Math.max(0, Math.min(100, Number(rwPct || 0))) * 6);
          const scaledM  = Math.round(200 + Math.max(0, Math.min(100, Number(mathPct || 0))) * 6);
          const total = Math.max(400, Math.min(1600, scaledRW + scaledM));
          const totalPct = Math.round(((total - 400) / 1200) * 100);
          const c = colorForPct(totalPct);
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Candidate</div>
                <div style={{ fontWeight: 800, color: "#111827" }}>{participant.name || participant.email || "—"}</div>
                <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{dateStr} • {fmtDur(elapsedSec)}</div>
              </div>
              <div style={{ justifySelf: "end", minWidth: 220 }}>
                <div style={{
                  border: `1px solid ${c}`,
                  background: "#fff",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Total Score</div>
                    <div style={{ fontWeight: 800, color: c, fontSize: 22 }}>{total}/1600</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Card 2: Student details (class, school, phone) */}
      <div className="card avoid-break" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "#111827" }}>Candidate Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(140px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Class</div>
            <div style={{ fontWeight: 700, color: "#111827" }}>{participant.class || participant.className || participant.grade || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>School</div>
            <div style={{ fontWeight: 700, color: "#111827" }}>{participant.school || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Phone</div>
            <div style={{ fontWeight: 700, color: "#111827" }}>{participant.phone || participant.tel || "—"}</div>
          </div>
        </div>
      </div>

      {/* Overall scores */}
      {/* Card 3: Estimated section scores (bars + boxed estimates, aligned per section) */}
      <div className="card avoid-break" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "#111827" }}>Estimated Section Scores</h3>
        <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "center" }}>
            <BarRow label="Reading & Writing" valuePct={rwPct} color="auto" hideValue={true} />
            <ScoreChip label="Reading & Writing" pct={rwPct} color={colorForPct(rwPct)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "center" }}>
            <BarRow label="Math" valuePct={mathPct} color="auto" hideValue={true} />
            <ScoreChip label="Math" pct={mathPct} color={colorForPct(mathPct)} />
          </div>
        </div>
      </div>

      {/* Insights: two cards (left/right) with colored bullets */}
      {(() => {
        // Prepare English strengths/focus
        const engStrengths = rwSkills.slice().sort((a,b)=>b.pct-a.pct).filter(s=>s.pct>=67).slice(0,4);
        const engFocus = rwSkills.slice().sort((a,b)=>a.pct-b.pct).filter(s=>s.pct>0 && s.pct<40).slice(0,4);
        // Prepare Math strengths/focus from lessons
        const lessons = [];
        mathUnits.forEach(u => (u.lessons||[]).forEach(l => lessons.push({ ...l, unit: u.label })));
        const mathStrengths = lessons.slice().sort((a,b)=>b.pct-a.pct).filter(x=>x.pct>=67).slice(0,4);
        const mathFocus = lessons.slice().sort((a,b)=>a.pct-b.pct).filter(x=>x.pct>0 && x.pct<40).slice(0,4);
        const Bullet = ({c}) => (<span style={{ display:'inline-block', width:10, height:10, borderRadius:999, background:c, marginRight:8 }} />);
        return (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div className="card avoid-break">
              <h3 style={{ marginTop:0, color:'#111827' }}>English (Reading & Writing) — Insights</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div className="muted" style={{ marginBottom:4 }}>Strengths</div>
                  <ul style={{ margin:0, paddingLeft:0, listStyle:'none', color:'#374151' }}>
                    {engStrengths.map(s => (
                      <li key={`e_st_${s.key}`}>
                        <Bullet c={colorForPct(s.pct)} />{s.label} ({s.pct}%)
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="muted" style={{ marginBottom:4 }}>Focus Areas</div>
                  <ul style={{ margin:0, paddingLeft:0, listStyle:'none', color:'#374151' }}>
                    {engFocus.map(s => (
                      <li key={`e_fc_${s.key}`}>
                        <Bullet c={colorForPct(s.pct)} />{s.label} ({s.pct}%)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="card avoid-break">
              <h3 style={{ marginTop:0, color:'#111827' }}>Math — Insights</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div className="muted" style={{ marginBottom:4 }}>Strengths</div>
                  <ul style={{ margin:0, paddingLeft:0, listStyle:'none', color:'#374151' }}>
                    {mathStrengths.map((l,i) => (
                      <li key={`m_st_${l.key}_${i}`}>
                        <Bullet c={colorForPct(l.pct)} />{l.label} ({l.pct}%)
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="muted" style={{ marginBottom:4 }}>Focus Areas</div>
                  <ul style={{ margin:0, paddingLeft:0, listStyle:'none', color:'#374151' }}>
                    {mathFocus.map((l,i) => (
                      <li key={`m_fc_${l.key}_${i}`}>
                        <Bullet c={colorForPct(l.pct)} />{l.label} ({l.pct}%)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Score Breakdown: two cards */}
            {Array.isArray(s.customSkills) && s.customSkills.length > 0 ? (
        <div className="card avoid-break" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, color: "#111827" }}>Skills</h3>
          <div style={{ marginTop: 8 }}>
            {s.customSkills.map((sk, i) => (
              <div key={`${sk.label}_${i}`} className="avoid-break" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{sk.label}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{sk.correct ?? 0}/{sk.total ?? 0}</div>
                </div>
                <BarRow label={" "} valuePct={sk.pct} color="auto" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="card avoid-break">
            <h3 style={{ marginTop: 0, color: "#111827" }}>English (Reading & Writing)</h3>
            <BarRow label={`Reading & Writing (${summary.rw.correct}/${summary.rw.total})`} valuePct={rwPct} color="auto" />
            <div style={{ marginTop: 8 }}>
              {rwSkills.map((sk) => (
                <div key={sk.key} className="avoid-break" style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{sk.label}</div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>{sk.desc}</div>
                  <BarRow label={" "} valuePct={sk.pct} color="auto" />
                </div>
              ))}
            </div>
          </div>
          <div className="card avoid-break">
            <h3 style={{ marginTop: 0, color: "#111827" }}>Math</h3>
            <BarRow label={`Math (${summary.math.correct}/${summary.math.total})`} valuePct={mathPct} color="auto" />
            <div style={{ marginTop: 8 }}>
              {mathUnits.map((u) => (
                <div key={u.key} className="avoid-break" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{u.label}</div>
                  <BarRow label={" "} valuePct={u.pct} color="auto" />
                  <div style={{ marginTop: 6 }}>
                    {u.lessons.map((l) => (
                      <div key={l.key} style={{ margin: "6px 0" }}>
                        <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 2 }}>{l.label}</div>
                        <BarRow label={" "} valuePct={l.pct} color="auto" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ color: "#6b7280", fontSize: 12 }}>
          {Number.isFinite(elapsedSec) && modules && modules.length > 0 && (
            <>Total time: {fmtDur(elapsedSec)}{avgSec ? ` - Avg/question: ${fmtDur(avgSec)}` : ""}</>
          )}
        </div>
        <Btn variant="secondary" onClick={() => onNavigate("admin-sat")}>Back to SAT Submissions</Btn>
        <Btn variant="primary" onClick={() => window.print()}>Export PDF</Btn>
      </div>

    </PageWrap>
  );
}
