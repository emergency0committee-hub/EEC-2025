// src/pages/sat/lessons/QuadraticEquationsInteractive.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../../components/Layout.jsx";
import Btn from "../../../components/Btn.jsx";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isAlmostInteger = (value, eps = 1e-9) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  return Math.abs(num - Math.round(num)) <= eps;
};

const fmt = (value, digits = 2) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? "");
  const rounded = Math.round(num * 10 ** digits) / 10 ** digits;
  return String(rounded);
};

const fmtIntish = (value, digits = 2) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? "");
  if (isAlmostInteger(num)) return String(Math.round(num));
  return fmt(num, digits);
};

const discriminant = (a, b, c) => {
  const A = Number(a);
  const B = Number(b);
  const C = Number(c);
  if (![A, B, C].every(Number.isFinite)) return NaN;
  return B * B - 4 * A * C;
};

const quadraticValue = (a, b, c, x) => {
  const A = Number(a);
  const B = Number(b);
  const C = Number(c);
  const X = Number(x);
  if (![A, B, C, X].every(Number.isFinite)) return NaN;
  return A * X * X + B * X + C;
};

function StepPill({ label, active, complete, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
      disabled={disabled}
      style={{
        border: "none",
        borderRadius: 999,
        padding: "8px 14px",
        cursor: disabled ? "not-allowed" : "pointer",
        background: active ? "#111827" : complete ? "#ecfdf5" : "#fff",
        color: active ? "#fff" : complete ? "#047857" : "#374151",
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderColor: complete ? "#86efac" : "#e5e7eb",
        borderStyle: "solid",
        borderWidth: 1,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span>{label}</span>
      {complete && !active && (
        <span aria-hidden style={{ fontSize: 11, fontWeight: 900 }}>
          OK
        </span>
      )}
    </button>
  );
}

StepPill.propTypes = {
  label: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  complete: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default function QuadraticEquationsInteractive({ onNavigate }) {
  QuadraticEquationsInteractive.propTypes = { onNavigate: PropTypes.func.isRequired };

  const steps = useMemo(
    () => [
      { id: "rules", label: "Interactive Rules" },
      { id: "disc", label: "Discriminant" },
      { id: "factor", label: "Factoring" },
      { id: "square", label: "Complete the Square" },
      { id: "formula", label: "Quadratic Formula" },
      { id: "challenge", label: "Challenge" },
    ],
    []
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [presenterMode, setPresenterMode] = useState(false);
  const [spotlightStep, setSpotlightStep] = useState(false);
  const [simpleNav, setSimpleNav] = useState(false);
  const [stepLocked, setStepLocked] = useState(false);
  const [revealAnswers, setRevealAnswers] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [showRecap, setShowRecap] = useState(true);
  const [showPacingTips, setShowPacingTips] = useState(false);
  const [teacherNotesOpen, setTeacherNotesOpen] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState("");
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Rules step
  const [rulesTouched, setRulesTouched] = useState(() => ({}));
  const touchRules = (key) => {
    const k = String(key || "").trim();
    if (!k) return;
    setRulesTouched((prev) => (prev?.[k] ? prev : { ...(prev || {}), [k]: true }));
  };
  const [rulesA, setRulesA] = useState(1);
  const [rulesB, setRulesB] = useState(2);
  const [rulesC, setRulesC] = useState(-3);
  const [rulesBranch, setRulesBranch] = useState("");

  const rulesD = useMemo(() => discriminant(rulesA, rulesB, rulesC), [rulesA, rulesB, rulesC]);
  const rulesRootInfo = useMemo(() => {
    if (!Number.isFinite(rulesD)) return { label: "Set coefficients.", tone: "#64748b" };
    if (Math.abs(rulesD) < 1e-9) return { label: "One real solution (double root).", tone: "#f59e0b" };
    if (rulesD > 0) return { label: "Two real solutions.", tone: "#047857" };
    return { label: "No real solutions (complex roots).", tone: "#b91c1c" };
  }, [rulesD]);

  const vertex = useMemo(() => {
    const A = Number(rulesA);
    const B = Number(rulesB);
    const C = Number(rulesC);
    if (![A, B, C].every(Number.isFinite) || Math.abs(A) < 1e-12) return null;
    const x = -B / (2 * A);
    const y = quadraticValue(A, B, C, x);
    return { x, y };
  }, [rulesA, rulesB, rulesC]);

  const rulesGraph = useMemo(() => {
    const A = Number(rulesA);
    const B = Number(rulesB);
    const C = Number(rulesC);
    if (![A, B, C].every(Number.isFinite) || Math.abs(A) < 1e-12) return null;
    const W = 260;
    const H = 180;
    const X_MIN = -6;
    const X_MAX = 6;
    const pts = [];
    for (let x = X_MIN; x <= X_MAX + 1e-9; x += 0.15) {
      pts.push({ x, y: quadraticValue(A, B, C, x) });
    }
    const yVals = pts.map((p) => p.y).filter((y) => Number.isFinite(y));
    if (!yVals.length) return null;
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);
    const pad = 0.12 * (yMax - yMin || 1);
    const vMin = yMin - pad;
    const vMax = yMax + pad;
    const toSvgX = (x) => ((x - X_MIN) / (X_MAX - X_MIN)) * W;
    const toSvgY = (y) => H - ((y - vMin) / (vMax - vMin)) * H;
    const d = pts
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${toSvgX(p.x).toFixed(2)} ${toSvgY(p.y).toFixed(2)}`)
      .join(" ");
    const xAxisY = clamp(toSvgY(0), 0, H);
    const yAxisX = clamp(toSvgX(0), 0, W);
    const vx = vertex ? toSvgX(vertex.x) : null;
    const vy = vertex ? toSvgY(vertex.y) : null;
    return { W, H, d, xAxisY, yAxisX, vx, vy };
  }, [rulesA, rulesB, rulesC, vertex]);

  const bHalfSquare = useMemo(() => {
    const b = Number(rulesB);
    if (!Number.isFinite(b)) return null;
    return (b / 2) ** 2;
  }, [rulesB]);

  const rulesRoots = useMemo(() => {
    const A = Number(rulesA);
    const B = Number(rulesB);
    const C = Number(rulesC);
    const D = discriminant(A, B, C);
    if (![A, B, C, D].every(Number.isFinite) || Math.abs(A) < 1e-12) return null;
    if (D < -1e-9) return { ok: false, message: "No real roots." };
    const sqrtD = Math.sqrt(Math.max(0, D));
    const denom = 2 * A;
    const plus = (-B + sqrtD) / denom;
    const minus = (-B - sqrtD) / denom;
    return { ok: true, plus, minus, D };
  }, [rulesA, rulesB, rulesC]);

  // Step: discriminant practice
  const DISC_PRACTICE = useMemo(
    () => [
      { id: "d1", a: 1, b: 4, c: 4, answer: "one" },
      { id: "d2", a: 1, b: 1, c: -6, answer: "two" },
      { id: "d3", a: 2, b: 1, c: 5, answer: "none" },
    ],
    []
  );
  const [discAnswers, setDiscAnswers] = useState(() => ({}));
  const discCorrectCount = useMemo(
    () =>
      DISC_PRACTICE.filter((q) => {
        const picked = discAnswers[q.id] || "";
        return picked && picked === q.answer;
      }).length,
    [DISC_PRACTICE, discAnswers]
  );

  // Step: factoring
  const FACTOR = useMemo(
    () => ({
      equation: "x^2 - 5x + 6 = 0",
      chips: ["(x - 2)", "(x - 3)", "(x + 2)", "(x + 3)", "(x - 1)", "(x - 6)"],
      correct: ["(x - 2)", "(x - 3)"],
    }),
    []
  );
  const [factorSlots, setFactorSlots] = useState(() => ["", ""]);
  const factorCorrect = useMemo(() => {
    const picked = factorSlots.filter(Boolean).slice().sort().join("|");
    const correct = FACTOR.correct.slice().sort().join("|");
    return picked === correct;
  }, [factorSlots, FACTOR.correct]);

  // Step: complete the square
  const SQUARE = useMemo(
    () => ({
      equation: "x^2 + 6x + 1 = 0",
      b: 6,
      choices: ["6", "9", "12", "3"],
      answer: "9",
    }),
    []
  );
  const [squareChoice, setSquareChoice] = useState("");
  const squareSolved = squareChoice === SQUARE.answer;

  // Step: quadratic formula
  const FORMULA = useMemo(
    () => ({ equation: "2x^2 + 3x - 2 = 0", a: 2, b: 3, c: -2 }),
    []
  );
  const formulaD = useMemo(() => discriminant(FORMULA.a, FORMULA.b, FORMULA.c), [FORMULA]);
  const formulaRoots = useMemo(() => {
    if (!Number.isFinite(formulaD) || formulaD < 0) return null;
    const sqrtD = Math.sqrt(formulaD);
    const denom = 2 * FORMULA.a;
    return {
      plus: (-FORMULA.b + sqrtD) / denom,
      minus: (-FORMULA.b - sqrtD) / denom,
      sqrtD,
    };
  }, [FORMULA, formulaD]);
  const [formulaPicked, setFormulaPicked] = useState(() => ({ plus: false, minus: false }));
  const formulaSolved = Boolean(formulaPicked.plus && formulaPicked.minus);

  // Step: challenge
  const CHALLENGE = useMemo(
    () => [
      {
        id: "q1",
        prompt: "How many real solutions does x^2 + 4x + 4 = 0 have?",
        choices: ["2", "1", "0"],
        answer: "1",
        explain: "D = 16 - 16 = 0, so one real double root.",
      },
      {
        id: "q2",
        prompt: "Best method for x^2 - 5x + 6 = 0?",
        choices: ["Factoring", "Quadratic formula", "Guessing", "None"],
        answer: "Factoring",
        explain: "It factors cleanly: (x-2)(x-3)=0.",
      },
      {
        id: "q3",
        prompt: "If a quadratic has negative discriminant, then it has:",
        choices: ["Two real roots", "One real root", "No real roots", "Infinite roots"],
        answer: "No real roots",
        explain: "Negative discriminant means complex roots.",
      },
    ],
    []
  );
  const [challengeAnswers, setChallengeAnswers] = useState(() => ({}));
  const challengeCorrect = useMemo(
    () => CHALLENGE.every((q) => challengeAnswers[q.id] === q.answer),
    [CHALLENGE, challengeAnswers]
  );

  const completed = useMemo(() => {
    const rulesComplete = ["disc", "vertex", "square", "formula"].every((k) => Boolean(rulesTouched?.[k]));
    return {
      rules: rulesComplete,
      disc: discCorrectCount >= 2,
      factor: factorCorrect,
      square: squareSolved,
      formula: formulaSolved,
      challenge: challengeCorrect,
    };
  }, [rulesTouched, discCorrectCount, factorCorrect, squareSolved, formulaSolved, challengeCorrect]);

  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    onFullscreen();
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const goNext = () => setStepIndex((i) => clamp(i + 1, 0, steps.length - 1));
  const goPrev = () => setStepIndex((i) => clamp(i - 1, 0, steps.length - 1));

  const resetAll = () => {
    setStepIndex(0);
    setRulesTouched({});
    setRulesA(1);
    setRulesB(2);
    setRulesC(-3);
    setRulesBranch("");
    setDiscAnswers({});
    setFactorSlots(["", ""]);
    setSquareChoice("");
    setFormulaPicked({ plus: false, minus: false });
    setChallengeAnswers({});
  };

  const copyLink = async () => {
    const text = String(window.location.href || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert("Lesson link copied.");
    } catch {
      window.prompt("Copy this lesson link:", text);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      alert("Fullscreen is not available in this browser.");
    }
  };

  const formatTimer = (value) => {
    const total = Math.max(0, Number(value) || 0);
    const mm = Math.floor(total / 60).toString().padStart(2, "0");
    const ss = Math.floor(total % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const updateTimerMinutes = (nextValue) => {
    const parsed = Number(nextValue);
    const next = Math.max(1, Math.min(60, Math.round(Number.isFinite(parsed) ? parsed : 1)));
    setTimerMinutes(next);
    if (!timerRunning) setTimerSeconds(next * 60);
  };

  const SUPPORT_CONTENT = useMemo(
    () => ({
      rules: {
        recap: "Discriminant classifies roots, the vertex is at x = -b/(2a), and the quadratic formula always works.",
        hints: [
          "If D is positive: two real roots. If D is zero: one real root. If D is negative: no real roots.",
          "Vertex x coordinate is -b/(2a).",
          "Complete the square to convert to vertex form.",
        ],
        answers: [
          "Vertex form: a(x - h)^2 + k has vertex (h, k).",
          "Quadratic formula: x = (-b +/- sqrt(D)) / (2a).",
        ],
        pacing: "3 to 4 min. Demo each rule with one quick example.",
      },
      disc: {
        recap: "Compute D = b^2 - 4ac and decide the number of real roots.",
        hints: ["D positive gives two real roots.", "D zero gives one repeated real root.", "D negative gives no real roots."],
        answers: ["For (1, 4, 4): D = 0 so one real root.", "For (1, 1, -6): D = 25 so two real roots.", "For (2, 1, 5): D = -39 so no real roots."],
        pacing: "2 min. Classify two or three cases.",
      },
      factor: {
        recap: "If it factors cleanly, set each factor to zero.",
        hints: ["Look for two numbers that multiply to c and add to b.", "Each factor set to zero gives a root."],
        answers: ["x^2 - 5x + 6 factors to (x - 2)(x - 3)."],
        pacing: "2 min. Factor one quadratic.",
      },
      square: {
        recap: "Complete the square by adding (b/2)^2.",
        hints: ["Here b = 6, so (b/2)^2 = 9.", "Add and subtract 9 to keep the equation balanced."],
        answers: ["For x^2 + 6x + 1, add 9 to complete the square.", "Square term becomes (x + 3)^2."],
        pacing: "3 min. Walk through one example.",
      },
      formula: {
        recap: "Use x = (-b +/- sqrt(D)) / (2a) to solve any quadratic.",
        hints: ["Compute D first, then sqrt(D).", "Divide by 2a after adding and subtracting the square root."],
        answers: ["For 2x^2 + 3x - 2 = 0, D = 25 and roots are 0.5 and -2."],
        pacing: "3 min. Solve one equation with the formula.",
      },
      challenge: {
        recap: "Apply discriminant logic, factoring when easy, and the meaning of negative D.",
        hints: ["If it factors nicely, use factoring instead of the formula."],
        answers: ["Q1: 1", "Q2: Factoring", "Q3: No real roots"],
        pacing: "4 min. One problem per minute.",
      },
    }),
    []
  );

  const stepMeta = steps[stepIndex] || {};
  const stepId = stepMeta.id || "";
  const stepLabel = stepMeta.label || "";
  const stepSupport = SUPPORT_CONTENT[stepId] || {};
  const showSupportPanel = showHints || showRecap || showPacingTips || revealAnswers;
  const timerLabel = formatTimer(timerSeconds);
  const toggleStyle = (active) => ({
    borderRadius: 999,
    border: "1px solid",
    borderColor: active ? "#111827" : "#d1d5db",
    background: active ? "#111827" : "#fff",
    color: active ? "#fff" : "#111827",
    padding: "6px 12px",
    cursor: "pointer",
    fontWeight: 800,
  });
  const panelStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#ffffff",
  };
  const headerCardStyle = spotlightStep ? { borderColor: "#bfdbfe", boxShadow: "0 0 0 3px rgba(59,130,246,0.15)" } : {};
  const toolsCardStyle = spotlightStep ? { borderColor: "#e2e8f0", opacity: 0.92 } : {};
  const stepCardStyle = {
    borderColor: spotlightStep ? "#93c5fd" : undefined,
    boxShadow: spotlightStep ? "0 0 0 4px rgba(59,130,246,0.2), 0 12px 24px -12px rgba(15,23,42,0.25)" : undefined,
    padding: presenterMode ? 30 : 24,
  };

  const renderStepBody = () => {
    const id = steps[stepIndex]?.id || "";

    if (id === "rules") {
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Interactive Rules (Quadratics)</h3>
          <p style={{ color: "#475569" }}>
            Move sliders and click buttons to see the discriminant, vertex, and roots update.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Pick coefficients</div>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>a</div>
                  {[1, -1, 2, -2].map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => {
                        touchRules("disc");
                        touchRules("vertex");
                        touchRules("square");
                        touchRules("formula");
                        setRulesA(value);
                      }}
                      style={{
                        borderRadius: 999,
                        border: "1px solid",
                        borderColor: rulesA === value ? "#111827" : "#d1d5db",
                        background: rulesA === value ? "#111827" : "#fff",
                        color: rulesA === value ? "#fff" : "#111827",
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>b</div>
                    <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 900 }}>{rulesB}</div>
                  </div>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={1}
                    value={rulesB}
                    onChange={(e) => {
                      touchRules("disc");
                      touchRules("vertex");
                      touchRules("square");
                      touchRules("formula");
                      setRulesB(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="b slider"
                  />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>c</div>
                    <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 900 }}>{rulesC}</div>
                  </div>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={1}
                    value={rulesC}
                    onChange={(e) => {
                      touchRules("disc");
                      touchRules("vertex");
                      touchRules("square");
                      touchRules("formula");
                      setRulesC(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="c slider"
                  />
                </div>
              </div>
              <div style={{ marginTop: 10, fontWeight: 900, color: "#0f172a" }}>
                f(x) = {rulesA}x^2 {rulesB >= 0 ? "+" : "-"} {Math.abs(rulesB)}x {rulesC >= 0 ? "+" : "-"} {Math.abs(rulesC)}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Discriminant</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                  D = b^2 - 4ac controls how many real solutions.
                </div>
                <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>D = {fmtIntish(rulesD, 0)}</div>
                  <div style={{ marginTop: 6, fontSize: 13, fontWeight: 900, color: rulesRootInfo.tone }}>
                    {rulesRootInfo.label}
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Vertex</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                  x_v = -b/(2a). The vertex is the turning point.
                </div>
                <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                  {vertex ? (
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>
                      ({fmt(vertex.x, 2)}, {fmt(vertex.y, 2)})
                    </div>
                  ) : (
                    <div style={{ color: "#64748b" }}>Set coefficients.</div>
                  )}
                  {rulesGraph && (
                    <div style={{ marginTop: 10 }}>
                      <svg width={rulesGraph.W} height={rulesGraph.H} style={{ width: "100%", height: "auto", display: "block" }}>
                        <rect x="0" y="0" width={rulesGraph.W} height={rulesGraph.H} rx="12" fill="#ffffff" stroke="#e5e7eb" />
                        <line x1="0" y1={rulesGraph.xAxisY} x2={rulesGraph.W} y2={rulesGraph.xAxisY} stroke="#cbd5e1" strokeWidth="2" />
                        <line x1={rulesGraph.yAxisX} y1="0" x2={rulesGraph.yAxisX} y2={rulesGraph.H} stroke="#cbd5e1" strokeWidth="2" />
                        <path d={rulesGraph.d} fill="none" stroke="#111827" strokeWidth="2.5" />
                        {typeof rulesGraph.vx === "number" && typeof rulesGraph.vy === "number" && (
                          <circle cx={rulesGraph.vx} cy={rulesGraph.vy} r="6" fill="#2563eb" opacity="0.9" />
                        )}
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Complete the Square</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                  For x^2 + bx, add (b/2)^2.
                </div>
                <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>b = {rulesB}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#334155", fontWeight: 900 }}>
                    (b/2)^2 = {bHalfSquare == null ? "?" : fmtIntish(bHalfSquare, 2)}
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Quadratic Formula</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                  x = (-b +/- sqrt(D)) / (2a). Pick a branch.
                </div>
                <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["plus", "minus"].map((branch) => (
                      <button
                        key={branch}
                        type="button"
                        onClick={() => {
                          touchRules("formula");
                          setRulesBranch(branch);
                        }}
                        style={{
                          borderRadius: 999,
                          border: "1px solid",
                          borderColor: rulesBranch === branch ? "#111827" : "#d1d5db",
                          background: rulesBranch === branch ? "#111827" : "#fff",
                          color: rulesBranch === branch ? "#fff" : "#111827",
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        {branch === "plus" ? "Use + branch" : "Use - branch"}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                    <div>D = {fmtIntish(rulesD, 0)}</div>
                    {rulesRoots?.ok ? (
                      <div style={{ marginTop: 6, fontWeight: 900, color: "#0f172a" }}>
                        {rulesBranch === "plus"
                          ? `x = ${fmt(rulesRoots.plus, 3)}`
                          : rulesBranch === "minus"
                            ? `x = ${fmt(rulesRoots.minus, 3)}`
                            : "Pick a branch."}
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, fontWeight: 900, color: "#b91c1c" }}>
                        {rulesRoots?.message || "No real roots."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.rules ? "#047857" : "#64748b" }}>
            {completed.rules ? "Completed: you interacted with every rule demo." : "Interact with all rule demos (change a/b/c and pick a formula branch) to complete this step."}
          </div>
        </>
      );
    }

    if (id === "disc") {
      const options = [
        { id: "two", label: "2 real solutions" },
        { id: "one", label: "1 real solution" },
        { id: "none", label: "0 real solutions" },
      ];

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Discriminant (Practice)</h3>
          <p style={{ color: "#475569" }}>
            For each quadratic, decide how many real solutions it has using D = b^2 - 4ac.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {DISC_PRACTICE.map((q) => {
              const picked = discAnswers[q.id] || "";
              const ok = picked && picked === q.answer;
              const d = discriminant(q.a, q.b, q.c);
              return (
                <div key={q.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>
                    {q.a}x^2 {q.b >= 0 ? "+" : "-"} {Math.abs(q.b)}x {q.c >= 0 ? "+" : "-"} {Math.abs(q.c)} = 0
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    D = {fmtIntish(d, 0)}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDiscAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                        style={{
                          borderRadius: 12,
                          border: "1px solid",
                          borderColor: picked === opt.id ? "#111827" : "#d1d5db",
                          background: picked === opt.id ? "#111827" : "#fff",
                          color: picked === opt.id ? "#fff" : "#111827",
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {picked && (
                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: ok ? "#047857" : "#b91c1c" }}>
                      {ok ? "Correct." : "Incorrect."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
            Correct: <b style={{ color: "#0f172a" }}>{discCorrectCount}</b>/3
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: completed.disc ? "#047857" : "#64748b" }}>
            {completed.disc ? "Completed: discriminant." : "Get at least 2 correct to complete this step."}
          </div>
        </>
      );
    }

    if (id === "factor") {
      const firstEmpty = factorSlots.findIndex((v) => !v);
      const place = (label) => {
        const idx = firstEmpty === -1 ? 0 : firstEmpty;
        setFactorSlots((prev) => prev.map((v, i) => (i === idx ? label : v)));
      };
      const setSlot = (idx, label) => setFactorSlots((prev) => prev.map((v, i) => (i === idx ? label : v)));
      const clearSlot = (idx) => setSlot(idx, "");

      const onDrop = (idx, e) => {
        e.preventDefault?.();
        const label = e.dataTransfer?.getData?.("text/plain") || "";
        if (!label) return;
        setSlot(idx, label);
      };

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Factoring (Practice)</h3>
          <p style={{ color: "#475569" }}>
            Build the factorization by dragging factors into the slots (or click a factor chip to place it).
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Equation</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{FACTOR.equation}</div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(140px, 1fr))", gap: 10 }}>
              {factorSlots.map((slot, idx) => (
                <button
                   
                  key={idx}
                  type="button"
                  onClick={() => clearSlot(idx)}
                  onDragOver={(e) => e.preventDefault?.()}
                  onDrop={(e) => onDrop(idx, e)}
                  style={{
                    borderRadius: 14,
                    border: "1px solid",
                    borderColor: slot ? "#111827" : "#cbd5e1",
                    background: slot ? "#111827" : "#ffffff",
                    color: slot ? "#ffffff" : "#94a3b8",
                    padding: "14px 12px",
                    cursor: "pointer",
                    fontWeight: 900,
                    minHeight: 56,
                    display: "grid",
                    placeItems: "center",
                  }}
                  title={slot ? "Click to clear slot" : "Drop a factor here"}
                >
                  {slot || "Drop here"}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {FACTOR.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer?.setData?.("text/plain", chip);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => place(chip)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    color: "#111827",
                    padding: "8px 12px",
                    cursor: "grab",
                    fontWeight: 900,
                    userSelect: "none",
                  }}
                  title="Drag into a slot (or click)"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="secondary" onClick={() => setFactorSlots(["", ""])}>Clear</Btn>
              <Btn variant="secondary" onClick={() => setFactorSlots(FACTOR.correct)}>Show answer</Btn>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 900, color: factorCorrect ? "#047857" : "#64748b" }}>
              {factorCorrect ? "Correct: roots are x = 2 and x = 3." : "Tip: look for two numbers that multiply to 6 and add to -5."}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: completed.factor ? "#047857" : "#64748b" }}>
              {completed.factor ? "Completed: factoring." : "Place both correct factors to complete this step."}
            </div>
          </div>
        </>
      );
    }

    if (id === "square") {
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Complete the Square (Practice)</h3>
          <p style={{ color: "#475569" }}>
            For x^2 + bx, the number you add is (b/2)^2. Here b = {SQUARE.b}. Choose the correct number.
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Equation</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{SQUARE.equation}</div>

            <div style={{ marginTop: 12, fontWeight: 900, color: "#0f172a" }}>
              To complete the square on x^2 + 6x, add:
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SQUARE.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setSquareChoice(choice)}
                  style={{
                    borderRadius: 12,
                    border: "1px solid",
                    borderColor: squareChoice === choice ? "#111827" : "#d1d5db",
                    background: squareChoice === choice ? "#111827" : "#fff",
                    color: squareChoice === choice ? "#fff" : "#111827",
                    padding: "10px 12px",
                    cursor: "pointer",
                    fontWeight: 900,
                    minWidth: 72,
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>

            {squareChoice && (
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 900, color: squareSolved ? "#047857" : "#b91c1c" }}>
                {squareSolved ? "Correct." : "Not quite. Remember: (b/2)^2."}
              </div>
            )}

            {squareSolved && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                <div>Rewrite: x^2 + 6x + 9 = 8</div>
                <div>Factor: (x + 3)^2 = 8</div>
                <div>Solve: x = -3 +/- sqrt(8)</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.square ? "#047857" : "#64748b" }}>
            {completed.square ? "Completed: complete the square." : "Choose the correct number to complete this step."}
          </div>
        </>
      );
    }

    if (id === "formula") {
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Quadratic Formula (Practice)</h3>
          <p style={{ color: "#475569" }}>
            Use the formula x = (-b +/- sqrt(D)) / (2a). Click both branches to see both roots.
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Equation</div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{FORMULA.equation}</div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#334155" }}>
              D = <b>{fmtIntish(formulaD, 0)}</b>
              {formulaRoots ? (
                <>
                  {" "}
                  and sqrt(D) = <b>{fmtIntish(formulaRoots.sqrtD, 0)}</b>
                </>
              ) : null}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setFormulaPicked((prev) => ({ ...prev, plus: true }))}
                style={{
                  borderRadius: 12,
                  border: "1px solid",
                  borderColor: formulaPicked.plus ? "#111827" : "#d1d5db",
                  background: formulaPicked.plus ? "#111827" : "#fff",
                  color: formulaPicked.plus ? "#fff" : "#111827",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Use + branch
              </button>
              <button
                type="button"
                onClick={() => setFormulaPicked((prev) => ({ ...prev, minus: true }))}
                style={{
                  borderRadius: 12,
                  border: "1px solid",
                  borderColor: formulaPicked.minus ? "#111827" : "#d1d5db",
                  background: formulaPicked.minus ? "#111827" : "#fff",
                  color: formulaPicked.minus ? "#fff" : "#111827",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Use - branch
              </button>
              <Btn variant="secondary" onClick={() => setFormulaPicked({ plus: false, minus: false })}>Reset</Btn>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 13, color: "#334155" }}>
              <div>
                + branch: <b>{formulaPicked.plus && formulaRoots ? fmt(formulaRoots.plus, 3) : "-"}</b>
              </div>
              <div>
                - branch: <b>{formulaPicked.minus && formulaRoots ? fmt(formulaRoots.minus, 3) : "-"}</b>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 900, color: formulaSolved ? "#047857" : "#64748b" }}>
              {formulaSolved ? "Completed: you found both roots." : "Click both branches to complete this step."}
            </div>
          </div>
        </>
      );
    }

    if (id === "challenge") {
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Hard Check</h3>
          <p style={{ color: "#475569" }}>
            Answer all 3.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {CHALLENGE.map((q) => {
              const picked = challengeAnswers[q.id] || "";
              const ok = picked && picked === q.answer;
              const showExplain = Boolean(picked);
              return (
                <div key={q.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>{q.prompt}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {q.choices.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setChallengeAnswers((prev) => ({ ...prev, [q.id]: choice }))}
                        style={{
                          borderRadius: 12,
                          border: "1px solid",
                          borderColor: picked === choice ? "#111827" : "#d1d5db",
                          background: picked === choice ? "#111827" : "#fff",
                          color: picked === choice ? "#fff" : "#111827",
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontWeight: 900,
                          minWidth: 84,
                        }}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  {showExplain && (
                    <div style={{ marginTop: 10, fontSize: 13, color: ok ? "#047857" : "#b91c1c", fontWeight: 800 }}>
                      {ok ? "Correct." : "Incorrect."}
                      <div style={{ marginTop: 6, color: "#334155", fontWeight: 600 }}>{q.explain}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: challengeCorrect ? "#047857" : "#64748b" }}>
              {challengeCorrect ? "Completed: challenge passed." : "Get all 3 correct to complete this step."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="secondary" onClick={copyLink}>Copy lesson link</Btn>
            </div>
          </div>
        </>
      );
    }

    return (
      <div style={{ padding: 4, color: "#475569" }}>
        Step: <b style={{ color: "#0f172a" }}>{id}</b>
      </div>
    );
  };

  return (
    <PageWrap>
      <HeaderBar title="SAT Interactive Lesson: Quadratic Equations" />
      <Card style={headerCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Hard - Moving + clickable explanation</div>
            <h2 style={{ marginTop: 6, marginBottom: 0 }}>Quadratic Equations</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant="secondary" onClick={resetAll}>Reset</Btn>
            <Btn variant="secondary" onClick={copyLink}>Copy lesson link</Btn>
            <Btn variant="back" onClick={() => onNavigate("sat-training")}>Back to SAT Training</Btn>
          </div>
        </div>

        {simpleNav ? (
          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>
              Step {stepIndex + 1} of {steps.length}: {stepLabel}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Simple navigation is on.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {steps.map((s, idx) => (
              <StepPill
                key={s.id}
                label={s.label}
                active={idx === stepIndex}
                complete={Boolean(completed[s.id])}
                onClick={() => setStepIndex(idx)}
                disabled={stepLocked}
              />
            ))}
          </div>
        )}
        {stepLocked && (
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>
            Step navigation is locked by the teacher.
          </div>
        )}
      </Card>

      <Card style={toolsCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
          <div>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Teaching tools</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Presenter mode, teacher controls, and student support.</div>
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Current step: {stepLabel || "G"}</div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div style={panelStyle}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Presenter mode</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={toggleStyle(presenterMode)} onClick={() => setPresenterMode((v) => !v)}>
                Presenter
              </button>
              <button type="button" style={toggleStyle(spotlightStep)} onClick={() => setSpotlightStep((v) => !v)}>
                Spotlight step
              </button>
              <button type="button" style={toggleStyle(simpleNav)} onClick={() => setSimpleNav((v) => !v)}>
                Simple nav
              </button>
              <button type="button" style={toggleStyle(isFullscreen)} onClick={toggleFullscreen}>
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              Use for screen share: larger spacing, focus, and simple navigation.
            </div>
          </div>

          <div style={panelStyle}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Teacher controls</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={toggleStyle(stepLocked)} onClick={() => setStepLocked((v) => !v)}>
                Lock step
              </button>
              <button type="button" style={toggleStyle(revealAnswers)} onClick={() => setRevealAnswers((v) => !v)}>
                Reveal answers
              </button>
              <button type="button" style={toggleStyle(teacherNotesOpen)} onClick={() => setTeacherNotesOpen((v) => !v)}>
                Notes
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Lesson timer</div>
              <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={timerMinutes}
                  onChange={(e) => updateTimerMinutes(e.target.value)}
                  disabled={timerRunning}
                  style={{
                    width: 70,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                  }}
                />
                <div style={{ fontWeight: 900, color: timerSeconds <= 60 ? "#b91c1c" : "#0f172a" }}>{timerLabel}</div>
                <button
                  type="button"
                  style={toggleStyle(timerRunning)}
                  onClick={() => {
                    if (!timerRunning && timerSeconds === 0) setTimerSeconds(timerMinutes * 60);
                    setTimerRunning((v) => !v);
                  }}
                >
                  {timerRunning ? "Pause" : "Start"}
                </button>
                <button
                  type="button"
                  style={toggleStyle(false)}
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(timerMinutes * 60);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Student support</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={toggleStyle(showHints)} onClick={() => setShowHints((v) => !v)}>
                Hints
              </button>
              <button type="button" style={toggleStyle(showRecap)} onClick={() => setShowRecap((v) => !v)}>
                Recap
              </button>
              <button type="button" style={toggleStyle(showPacingTips)} onClick={() => setShowPacingTips((v) => !v)}>
                Pacing tips
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              These appear below the activity for students.
            </div>
          </div>
        </div>

        {teacherNotesOpen && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>Teacher notes</div>
            <textarea
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="Write quick notes or prompts for this step."
              rows={4}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 13,
              }}
            />
          </div>
        )}
      </Card>

      <Card style={stepCardStyle}>
        <div style={{ fontSize: presenterMode ? 16 : 14, lineHeight: presenterMode ? 1.7 : 1.6 }}>
          {renderStepBody()}
        </div>

        {showSupportPanel && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Support for students</div>
            {showRecap && stepSupport.recap && (
              <div style={{ marginTop: 8, color: "#334155", fontSize: 13 }}>{stepSupport.recap}</div>
            )}
            {showHints && Array.isArray(stepSupport.hints) && stepSupport.hints.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: "#0f172a" }}>Hints</div>
                <ul style={{ marginTop: 6, paddingLeft: 18, color: "#334155", fontSize: 13 }}>
                  {stepSupport.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}
            {showPacingTips && stepSupport.pacing && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#334155" }}>
                <span style={{ fontWeight: 900 }}>Pacing: </span>
                {stepSupport.pacing}
              </div>
            )}
            {revealAnswers && Array.isArray(stepSupport.answers) && stepSupport.answers.length > 0 && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid #fde68a", background: "#fffbeb" }}>
                <div style={{ fontWeight: 900, color: "#92400e" }}>Teacher answer key</div>
                <ul style={{ marginTop: 6, paddingLeft: 18, color: "#7c2d12", fontSize: 13 }}>
                  {stepSupport.answers.map((answer) => (
                    <li key={answer}>{answer}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <Btn variant="secondary" onClick={goPrev} disabled={stepLocked || stepIndex === 0}>Back</Btn>
          <Btn variant="primary" onClick={goNext} disabled={stepLocked || stepIndex === steps.length - 1}>Next</Btn>
        </div>
        {stepIndex === steps.length - 1 && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={copyLink}>Copy lesson link</Btn>
          </div>
        )}
      </Card>
    </PageWrap>
  );
}
