// src/pages/sat/lessons/SolvingEquationsInteractive.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../../components/Layout.jsx";
import Btn from "../../../components/Btn.jsx";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isAlmostInteger = (value, eps = 1e-9) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  return Math.abs(num - Math.round(num)) <= eps;
};

const almostEqual = (a, b, eps = 1e-9) => Math.abs(Number(a) - Number(b)) <= eps;

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

const formatLinearExpr = (xCoeffRaw, constantRaw) => {
  const xCoeff = Number(xCoeffRaw);
  const constant = Number(constantRaw);
  const a = Number.isFinite(xCoeff) ? xCoeff : 0;
  const b = Number.isFinite(constant) ? constant : 0;

  const parts = [];

  if (Math.abs(a) > 1e-12) {
    const abs = Math.abs(a);
    const coeffText = almostEqual(abs, 1) ? "" : fmtIntish(abs);
    const sign = a < 0 ? "-" : "";
    parts.push(`${sign}${coeffText}x`);
  }

  if (Math.abs(b) > 1e-12 || !parts.length) {
    const abs = Math.abs(b);
    const text = fmtIntish(abs);
    if (!parts.length) {
      parts.push(b < 0 ? `-${text}` : text);
    } else {
      parts.push(`${b < 0 ? "-" : "+"} ${text}`);
    }
  }

  return parts.join(" ");
};

const solveLinearEquation = (eq) => {
  const lx = Number(eq?.lx);
  const lc = Number(eq?.lc);
  const rx = Number(eq?.rx);
  const rc = Number(eq?.rc);
  if (![lx, lc, rx, rc].every(Number.isFinite)) return { kind: "invalid" };
  const denom = lx - rx;
  const numer = rc - lc;
  if (Math.abs(denom) <= 1e-12) {
    if (Math.abs(numer) <= 1e-12) return { kind: "infinite" };
    return { kind: "none" };
  }
  return { kind: "unique", x: numer / denom };
};

const getSolvedForm = (eq) => {
  const lx = Number(eq?.lx);
  const lc = Number(eq?.lc);
  const rx = Number(eq?.rx);
  const rc = Number(eq?.rc);
  if (![lx, lc, rx, rc].every(Number.isFinite)) return null;

  // ax = c
  if (Math.abs(lc) <= 1e-9 && Math.abs(rx) <= 1e-9 && Math.abs(lx) > 1e-12) {
    const x = rc / lx;
    if (Number.isFinite(x)) return { x };
  }

  // c = ax
  if (Math.abs(rc) <= 1e-9 && Math.abs(lx) <= 1e-9 && Math.abs(rx) > 1e-12) {
    const x = lc / rx;
    if (Number.isFinite(x)) return { x };
  }

  return null;
};

const applyOp = (eq, op, target) => {
  const next = { ...eq };
  const sideList = target === "both" ? ["l", "r"] : [target === "left" ? "l" : "r"];
  const addConst = (sideKey, k) => {
    if (sideKey === "l") next.lc = Number(next.lc) + k;
    else next.rc = Number(next.rc) + k;
  };
  const addX = (sideKey, k) => {
    if (sideKey === "l") next.lx = Number(next.lx) + k;
    else next.rx = Number(next.rx) + k;
  };
  const mul = (sideKey, m) => {
    if (sideKey === "l") {
      next.lx = Number(next.lx) * m;
      next.lc = Number(next.lc) * m;
    } else {
      next.rx = Number(next.rx) * m;
      next.rc = Number(next.rc) * m;
    }
  };
  const div = (sideKey, d) => {
    if (Math.abs(d) <= 1e-12) return;
    mul(sideKey, 1 / d);
  };

  const kind = op?.kind || "";
  sideList.forEach((sideKey) => {
    if (kind === "addConst") addConst(sideKey, Number(op.value) || 0);
    if (kind === "addX") addX(sideKey, Number(op.value) || 0);
    if (kind === "mul") mul(sideKey, Number(op.value) || 1);
    if (kind === "div") div(sideKey, Number(op.value) || 1);
  });
  return next;
};

const chipStyle = ({ active = false, success = false, danger = false } = {}) => ({
  borderRadius: 999,
  border: "1px solid",
  borderColor: active ? "#111827" : danger ? "#fecaca" : success ? "#86efac" : "#d1d5db",
  background: active ? "#111827" : danger ? "#fef2f2" : success ? "#ecfdf5" : "#ffffff",
  color: active ? "#ffffff" : danger ? "#b91c1c" : success ? "#047857" : "#111827",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 900,
});

const operationButtonStyle = (active) => ({
  borderRadius: 12,
  border: "1px solid",
  borderColor: active ? "#111827" : "#d1d5db",
  background: active ? "#111827" : "#fff",
  color: active ? "#fff" : "#111827",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 900,
  minWidth: 92,
});

const balanceBeamStyle = (angle) => ({
  width: 260,
  height: 10,
  borderRadius: 999,
  background: "linear-gradient(90deg, #e2e8f0, #94a3b8, #e2e8f0)",
  transformOrigin: "50% 50%",
  transform: `rotate(${angle}deg)`,
  transition: "transform 420ms cubic-bezier(.2,.9,.2,1)",
  position: "relative",
});

const pivotStyle = {
  width: 30,
  height: 14,
  background: "#0f172a",
  borderRadius: 10,
  margin: "10px auto 0",
  boxShadow: "0 8px 20px rgba(15,23,42,0.15)",
};

const safeParseOp = (key) => {
  const k = String(key || "").trim();
  if (!k) return null;
  if (k.startsWith("addConst:")) return { kind: "addConst", value: Number(k.split(":")[1]) };
  if (k.startsWith("addX:")) return { kind: "addX", value: Number(k.split(":")[1]) };
  if (k.startsWith("mul:")) return { kind: "mul", value: Number(k.split(":")[1]) };
  if (k.startsWith("div:")) return { kind: "div", value: Number(k.split(":")[1]) };
  return null;
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

export default function SolvingEquationsInteractive({ onNavigate }) {
  SolvingEquationsInteractive.propTypes = { onNavigate: PropTypes.func.isRequired };

  const steps = useMemo(
    () => [
      { id: "rules", label: "Interactive Rules" },
      { id: "linear", label: "Linear" },
      { id: "distribute", label: "Distribute" },
      { id: "fractions", label: "Fractions" },
      { id: "systems", label: "Systems" },
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
  const [rulesEq, setRulesEq] = useState(() => ({ lx: 2, lc: 3, rx: 0, rc: 11 })); // 2x + 3 = 11
  const [rulesXGuess, setRulesXGuess] = useState(4);
  const [rulesTarget, setRulesTarget] = useState("both"); // both | left | right
  const [rulesOpKey, setRulesOpKey] = useState("addConst:-3");
  const [rulesFeedback, setRulesFeedback] = useState("");
  const rulesOp = useMemo(() => safeParseOp(rulesOpKey), [rulesOpKey]);
  const rulesSolution = useMemo(() => solveLinearEquation(rulesEq), [rulesEq]);
  const rulesSolvedForm = useMemo(() => getSolvedForm(rulesEq), [rulesEq]);
  const rulesLeftVal = useMemo(() => Number(rulesEq.lx) * Number(rulesXGuess) + Number(rulesEq.lc), [rulesEq, rulesXGuess]);
  const rulesRightVal = useMemo(() => Number(rulesEq.rx) * Number(rulesXGuess) + Number(rulesEq.rc), [rulesEq, rulesXGuess]);
  const rulesDiff = useMemo(() => rulesLeftVal - rulesRightVal, [rulesLeftVal, rulesRightVal]);
  const rulesAngle = useMemo(() => clamp(rulesDiff * 1.2, -12, 12), [rulesDiff]);
  const rulesBalanced = useMemo(() => Math.abs(rulesDiff) <= 1e-6, [rulesDiff]);

  // Linear step
  const [linearEq, setLinearEq] = useState(() => ({ lx: 5, lc: -12, rx: 3, rc: 6 })); // 5x - 12 = 3x + 6
  const [linearOpKey, setLinearOpKey] = useState("addX:-3");
  const linearOp = useMemo(() => safeParseOp(linearOpKey), [linearOpKey]);
  const linearSolvedForm = useMemo(() => getSolvedForm(linearEq), [linearEq]);
  const linearSolution = useMemo(() => solveLinearEquation(linearEq), [linearEq]);

  // Distribute step
  const DIST = useMemo(() => ({ m: 3, insideX: 2, insideC: -5, right: { rx: 4, rc: 7 }, targetX: 11 }), []);
  const [distClicked, setDistClicked] = useState(() => ({ x: false, c: false }));
  const [distEq, setDistEq] = useState(() => ({ lx: 6, lc: -15, rx: 4, rc: 7 })); // After distribution
  const [distOpKey, setDistOpKey] = useState("addX:-4");
  const distOp = useMemo(() => safeParseOp(distOpKey), [distOpKey]);
  const distSolvedForm = useMemo(() => getSolvedForm(distEq), [distEq]);

  // Fractions step
  const [fracChoice, setFracChoice] = useState("");
  const [fracCleared, setFracCleared] = useState(false);
  const [fracEq, setFracEq] = useState(() => ({ lx: 7, lc: 0, rx: 0, rc: 84 })); // When cleared: 7x = 84
  const [fracOpKey, setFracOpKey] = useState("div:7");
  const fracOp = useMemo(() => safeParseOp(fracOpKey), [fracOpKey]);
  const fracSolvedForm = useMemo(() => getSolvedForm(fracEq), [fracEq]);

  // Systems step
  const SYS = useMemo(
    () => ({
      e1: { a: 2, b: 1, c: 11 }, // 2x + y = 11
      e2: { a: 1, b: -1, c: 1 }, // x - y = 1
      x: 4,
      y: 3,
    }),
    []
  );
  const [sysCombine, setSysCombine] = useState(""); // add | sub
  const [sysXPick, setSysXPick] = useState("");
  const [sysYPick, setSysYPick] = useState("");

  // Challenge
  const CHALLENGE = useMemo(
    () => [
      {
        id: "q1",
        prompt: "Solve: 7x + 4 = 3x + 28",
        choices: ["x = 6", "x = 8", "x = 7", "x = 4"],
        answer: "x = 6",
        explain: "Subtract 3x: 4x + 4 = 28. Subtract 4: 4x = 24. Divide by 4: x = 6.",
      },
      {
        id: "q2",
        prompt: "Solve: 2(3x - 1) = 5x + 7",
        choices: ["x = 9", "x = 5", "x = 7", "x = 3"],
        answer: "x = 9",
        explain: "Distribute: 6x - 2 = 5x + 7. Subtract 5x: x - 2 = 7. Add 2: x = 9.",
      },
      {
        id: "q3",
        prompt: "System: 2x + y = 11 and x - y = 1. What is (x, y)?",
        choices: ["(4, 3)", "(3, 4)", "(5, 1)", "(2, 7)"],
        answer: "(4, 3)",
        explain: "Add equations to eliminate y: 3x = 12 so x = 4. Substitute into x - y = 1 to get y = 3.",
      },
    ],
    []
  );
  const [challengeAnswers, setChallengeAnswers] = useState({});
  const challengeCorrect = useMemo(
    () => CHALLENGE.every((q) => (challengeAnswers[q.id] || "") === q.answer),
    [CHALLENGE, challengeAnswers]
  );

  const completed = useMemo(() => {
    const rulesComplete = Boolean(rulesTouched?.both) && Boolean(rulesTouched?.check) && Boolean(rulesSolvedForm);
    const linearComplete = Boolean(linearSolvedForm) && linearSolution?.kind === "unique";
    const distComplete = Boolean(distClicked?.x) && Boolean(distClicked?.c) && Boolean(distSolvedForm);
    const fracComplete = fracCleared && Boolean(fracSolvedForm);
    const sysComplete = sysCombine === "add" && sysXPick === String(SYS.x) && sysYPick === String(SYS.y);
    return {
      rules: rulesComplete,
      linear: linearComplete,
      distribute: distComplete,
      fractions: fracComplete,
      systems: sysComplete,
      challenge: challengeCorrect,
    };
  }, [
    rulesTouched,
    rulesSolvedForm,
    linearSolvedForm,
    linearSolution,
    distClicked,
    distSolvedForm,
    fracCleared,
    fracSolvedForm,
    sysCombine,
    sysXPick,
    sysYPick,
    SYS.x,
    SYS.y,
    challengeCorrect,
  ]);

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
    setRulesEq({ lx: 2, lc: 3, rx: 0, rc: 11 });
    setRulesXGuess(4);
    setRulesTarget("both");
    setRulesOpKey("addConst:-3");
    setRulesFeedback("");
    setLinearEq({ lx: 5, lc: -12, rx: 3, rc: 6 });
    setLinearOpKey("addX:-3");
    setDistClicked({ x: false, c: false });
    setDistEq({ lx: 6, lc: -15, rx: 4, rc: 7 });
    setDistOpKey("addX:-4");
    setFracChoice("");
    setFracCleared(false);
    setFracEq({ lx: 7, lc: 0, rx: 0, rc: 84 });
    setFracOpKey("div:7");
    setSysCombine("");
    setSysXPick("");
    setSysYPick("");
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
        recap: "Equations stay balanced when you apply the same operation to both sides.",
        hints: ["Use inverse operations to isolate x.", "Check balance by substituting a value of x."],
        answers: ["2x + 3 = 11 gives x = 4."],
        pacing: "3 min. Demonstrate subtracting and dividing once.",
      },
      linear: {
        recap: "Move x terms to one side, constants to the other, then divide.",
        hints: ["Subtract 3x from both sides in 5x - 12 = 3x + 6.", "Then add 12 to both sides and divide by 2."],
        answers: ["x = 9"],
        pacing: "2 min. Solve one linear equation.",
      },
      distribute: {
        recap: "Distribute first, then solve the linear equation.",
        hints: ["3(2x - 5) becomes 6x - 15.", "Move 4x and -15 to isolate x."],
        answers: ["x = 11"],
        pacing: "3 min. Distribute and solve once.",
      },
      fractions: {
        recap: "Clear denominators using the LCM, then solve the integer equation.",
        hints: ["LCM of 3 and 4 is 12.", "After clearing, 7x = 84."],
        answers: ["x = 12"],
        pacing: "2 min. Multiply by the LCM then solve.",
      },
      systems: {
        recap: "Use elimination by adding equations with opposite coefficients.",
        hints: ["Add the equations to eliminate y.", "Solve 3x = 12 first."],
        answers: ["x = 4, y = 3"],
        pacing: "3 min. Eliminate, solve x, then y.",
      },
      challenge: {
        recap: "Combine inverse operations, distribution, and elimination.",
        hints: ["Move x terms first, then constants.", "For systems, add the equations."],
        answers: ["Q1: x = 6", "Q2: x = 9", "Q3: (4, 3)"],
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

  const renderEquationCard = ({ eq, title, subtitle }) => {
    const eqText = `${formatLinearExpr(eq.lx, eq.lc)} = ${formatLinearExpr(eq.rx, eq.rc)}`;
    const sol = solveLinearEquation(eq);
    return (
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
        <div style={{ fontWeight: 900, color: "#0f172a" }}>{title}</div>
        {subtitle && <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>{subtitle}</div>}
        <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, letterSpacing: 0.2, color: "#111827" }}>{eqText}</div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
          {sol.kind === "unique" && <span>Unique solution exists. (Try to isolate x.)</span>}
          {sol.kind === "none" && <span style={{ color: "#b91c1c", fontWeight: 800 }}>No solution.</span>}
          {sol.kind === "infinite" && <span style={{ color: "#0f766e", fontWeight: 800 }}>Infinitely many solutions.</span>}
        </div>
      </div>
    );
  };

  const renderStepBody = () => {
    const id = steps[stepIndex]?.id || "";

    if (id === "rules") {
      const currentEqText = `${formatLinearExpr(rulesEq.lx, rulesEq.lc)} = ${formatLinearExpr(rulesEq.rx, rulesEq.rc)}`;
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Interactive Rules (Balance + Inverse Ops)</h3>
          <p style={{ color: "#475569" }}>
            Equation solving is balance: do the same operation on both sides. Use inverse operations to isolate x.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {renderEquationCard({
              eq: rulesEq,
              title: "Example equation",
              subtitle: "Goal: isolate x. Try subtracting 3, then dividing by 2 (to both sides).",
            })}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 12,
                alignItems: "start",
              }}
            >
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Balance check (move the slider)</div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ borderRadius: 12, padding: 12, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Left value</div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, color: "#111827" }}>{fmtIntish(rulesLeftVal)}</div>
                  </div>
                  <div style={{ borderRadius: 12, padding: 12, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Right value</div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, color: "#111827" }}>{fmtIntish(rulesRightVal)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Try x = {fmtIntish(rulesXGuess)}</div>
                    <div style={{ fontSize: 12, color: rulesBalanced ? "#047857" : "#b91c1c", fontWeight: 900 }}>
                      {rulesBalanced ? "Balanced" : "Not balanced"}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={0.25}
                    value={rulesXGuess}
                    onChange={(e) => setRulesXGuess(Number(e.target.value))}
                    style={{ width: "100%", marginTop: 8 }}
                  />
                </div>

                <div style={{ marginTop: 14, display: "grid", justifyItems: "center" }}>
                  <div style={balanceBeamStyle(rulesAngle)}>
                    <div
                      style={{
                        position: "absolute",
                        left: 10,
                        top: -18,
                        width: 56,
                        height: 18,
                        borderRadius: 999,
                        background: "#0ea5e9",
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 900,
                        boxShadow: "0 8px 18px rgba(14,165,233,0.25)",
                      }}
                    >
                      Left
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        right: 10,
                        top: -18,
                        width: 56,
                        height: 18,
                        borderRadius: 999,
                        background: "#f97316",
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 900,
                        boxShadow: "0 8px 18px rgba(249,115,22,0.25)",
                      }}
                    >
                      Right
                    </div>
                  </div>
                  <div style={pivotStyle} />
                </div>

                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Current: <span style={{ fontWeight: 900, color: "#0f172a" }}>{currentEqText}</span>
                  </div>
                  <Btn
                    variant="secondary"
                    onClick={() => {
                      if (rulesBalanced) {
                        touchRules("check");
                        setRulesFeedback("Good: your x value keeps the equation balanced.");
                      } else {
                        setRulesFeedback("Not yet: adjust x or fix the equation operations.");
                      }
                    }}
                    style={{ padding: "6px 10px", minWidth: 120 }}
                  >
                    Check balance
                  </Btn>
                </div>
                {rulesFeedback && (
                  <div style={{ marginTop: 8, fontSize: 12, color: rulesBalanced ? "#047857" : "#b91c1c", fontWeight: 800 }}>
                    {rulesFeedback}
                  </div>
                )}
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Do an operation</div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Choose operation</div>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[
                        { key: "addConst:-3", label: "−3" },
                        { key: "addConst:3", label: "+3" },
                        { key: "addX:-2", label: "−2x" },
                        { key: "addX:2", label: "+2x" },
                        { key: "mul:2", label: "×2" },
                        { key: "div:2", label: "÷2" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setRulesOpKey(opt.key)}
                          style={operationButtonStyle(rulesOpKey === opt.key)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Apply to</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[
                        { key: "both", label: "Both sides" },
                        { key: "left", label: "Left only" },
                        { key: "right", label: "Right only" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setRulesTarget(opt.key)}
                          style={chipStyle({
                            active: rulesTarget === opt.key,
                            danger: opt.key !== "both" && rulesTarget === opt.key,
                          })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                      Tip: For correct solving, always use both sides.
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <Btn
                      variant="primary"
                      onClick={() => {
                        if (!rulesOp) return;
                        const target = rulesTarget;
                        const next = applyOp(rulesEq, rulesOp, target);
                        setRulesEq(next);
                        if (target === "both") touchRules("both");
                        setRulesFeedback(
                          target === "both"
                            ? "Nice. Same operation on both sides keeps equality."
                            : "Notice the balance changes: one-side operations break equality."
                        );
                      }}
                      style={{ minWidth: 140 }}
                    >
                      Apply
                    </Btn>
                    <Btn
                      variant="secondary"
                      onClick={() => {
                        setRulesEq({ lx: 2, lc: 3, rx: 0, rc: 11 });
                        setRulesFeedback("");
                      }}
                      style={{ padding: "6px 10px", minWidth: 120 }}
                    >
                      Reset example
                    </Btn>
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {rulesSolution.kind === "unique" ? (
                      <span>Unique solution exists. When you isolate x, the value stays the same.</span>
                    ) : (
                      <span>Try adjusting your steps.</span>
                    )}
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 900, color: completed.rules ? "#047857" : "#64748b" }}>
                    {completed.rules ? "Completed: balanced + checked + isolated." : "To complete: apply to both sides, check balance, and isolate x."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (id === "linear") {
      const eqText = `${formatLinearExpr(linearEq.lx, linearEq.lc)} = ${formatLinearExpr(linearEq.rx, linearEq.rc)}`;
      const reveal = linearSolvedForm?.x;
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Linear Equation (Hard)</h3>
          <p style={{ color: "#475569" }}>
            Solve by moving x terms to one side, constants to the other, then dividing.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {renderEquationCard({ eq: linearEq, title: "Practice", subtitle: "Isolate x. This one has x on both sides." })}

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Apply operations (both sides)</div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { key: "addX:-3", label: "−3x" },
                  { key: "addX:-5", label: "−5x" },
                  { key: "addConst:12", label: "+12" },
                  { key: "addConst:-6", label: "−6" },
                  { key: "mul:-1", label: "×(−1)" },
                  { key: "div:2", label: "÷2" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setLinearOpKey(opt.key)}
                    style={operationButtonStyle(linearOpKey === opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Current: <span style={{ fontWeight: 900, color: "#0f172a" }}>{eqText}</span>
                </div>
                <Btn
                  variant="primary"
                  onClick={() => {
                    if (!linearOp) return;
                    setLinearEq((prev) => applyOp(prev, linearOp, "both"));
                  }}
                  style={{ minWidth: 120 }}
                >
                  Apply
                </Btn>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Btn
                  variant="secondary"
                  onClick={() => setLinearEq({ lx: 5, lc: -12, rx: 3, rc: 6 })}
                  style={{ padding: "6px 10px", minWidth: 120 }}
                >
                  Reset
                </Btn>
                {linearSolvedForm && (
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#047857" }}>
                    Solved form: x = {fmtIntish(reveal)}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: completed.linear ? "#047857" : "#64748b" }}>
                {completed.linear ? "Completed: x isolated." : "Isolate x to complete this step."}
              </div>
            </div>
          </div>
        </>
      );
    }

    if (id === "distribute") {
      const distDone = Boolean(distClicked.x) && Boolean(distClicked.c);
      const insideStyle = ({ done }) => ({
        ...chipStyle({ success: done }),
        padding: "10px 12px",
        minWidth: 90,
        textAlign: "center",
      });

      const eqText = `${formatLinearExpr(distEq.lx, distEq.lc)} = ${formatLinearExpr(distEq.rx, distEq.rc)}`;
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Distribute, Then Solve (Hard)</h3>
          <p style={{ color: "#475569" }}>
            Distribute first, then solve the resulting linear equation.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Step 1: Distribute</div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Click each term inside parentheses</div>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#111827" }}>{DIST.m}</div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#64748b" }}>(</div>
                    <button
                      type="button"
                      onClick={() => setDistClicked((prev) => ({ ...prev, x: true }))}
                      style={insideStyle({ done: distClicked.x })}
                    >
                      {formatLinearExpr(DIST.insideX, 0)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistClicked((prev) => ({ ...prev, c: true }))}
                      style={insideStyle({ done: distClicked.c })}
                    >
                      {formatLinearExpr(0, DIST.insideC)}
                    </button>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#64748b" }}>)</div>
                  </div>
                </div>

                <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#ffffff" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Expanded terms</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div
                      style={{
                        ...chipStyle({ success: distClicked.x }),
                        opacity: distClicked.x ? 1 : 0.25,
                        transform: distClicked.x ? "translateY(0px)" : "translateY(10px)",
                        transition: "all 420ms cubic-bezier(.2,.9,.2,1)",
                      }}
                    >
                      {formatLinearExpr(DIST.m * DIST.insideX, 0)}
                    </div>
                    <div
                      style={{
                        ...chipStyle({ success: distClicked.c }),
                        opacity: distClicked.c ? 1 : 0.25,
                        transform: distClicked.c ? "translateY(0px)" : "translateY(10px)",
                        transition: "all 420ms cubic-bezier(.2,.9,.2,1)",
                      }}
                    >
                      {formatLinearExpr(0, DIST.m * DIST.insideC)}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: distDone ? "#047857" : "#64748b", fontWeight: 900 }}>
                    {distDone ? "Nice. Now solve the equation below." : "Complete distribution to continue."}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff", opacity: distDone ? 1 : 0.5 }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Step 2: Solve</div>
              <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, color: "#111827" }}>
                {distDone ? eqText : "Finish distribution first."}
              </div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { key: "addX:-4", label: "−4x" },
                  { key: "addConst:15", label: "+15" },
                  { key: "div:2", label: "÷2" },
                  { key: "mul:-1", label: "×(−1)" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setDistOpKey(opt.key)}
                    style={operationButtonStyle(distOpKey === opt.key)}
                    disabled={!distDone}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Btn
                  variant="primary"
                  onClick={() => {
                    if (!distDone || !distOp) return;
                    setDistEq((prev) => applyOp(prev, distOp, "both"));
                  }}
                  disabled={!distDone}
                  style={{ minWidth: 120 }}
                >
                  Apply
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={() => {
                    setDistClicked({ x: false, c: false });
                    setDistEq({ lx: 6, lc: -15, rx: 4, rc: 7 });
                  }}
                  style={{ padding: "6px 10px", minWidth: 120 }}
                >
                  Reset
                </Btn>
              </div>
              {distSolvedForm && (
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: "#047857" }}>
                  Solved form: x = {fmtIntish(distSolvedForm.x)}
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: completed.distribute ? "#047857" : "#64748b" }}>
                {completed.distribute ? "Completed: distributed and solved." : `Goal: x = ${DIST.targetX}.`}
              </div>
            </div>
          </div>
        </>
      );
    }

    if (id === "fractions") {
      const FRACTION_PROMPT = "Solve: x/3 + x/4 = 7";
      const choiceOk = fracChoice === "12";
      const onPick = (value) => {
        const v = String(value);
        setFracChoice(v);
        if (v === "12") {
          setFracCleared(true);
          setFracEq({ lx: 7, lc: 0, rx: 0, rc: 84 });
        } else {
          setFracCleared(false);
        }
      };

      const eqText = `${formatLinearExpr(fracEq.lx, fracEq.lc)} = ${formatLinearExpr(fracEq.rx, fracEq.rc)}`;
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Fractions: Clear Denominators (Hard)</h3>
          <p style={{ color: "#475569" }}>
            Multiply both sides by the LCM of denominators to avoid messy fractions.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Prompt</div>
              <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, color: "#111827" }}>{FRACTION_PROMPT}</div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", fontWeight: 900 }}>Pick the best multiplier (LCM of 3 and 4):</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["6", "12", "24"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onPick(v)}
                    style={chipStyle({ active: fracChoice === v, success: fracChoice === v && v === "12", danger: fracChoice === v && v !== "12" })}
                  >
                    ×{v}
                  </button>
                ))}
              </div>
              {fracChoice && (
                <div style={{ marginTop: 8, fontSize: 12, color: choiceOk ? "#047857" : "#b91c1c", fontWeight: 800 }}>
                  {choiceOk ? "Correct: multiplying by 12 clears all denominators." : "Not ideal: try the least common multiple (12)."}
                </div>
              )}
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff", opacity: fracCleared ? 1 : 0.5 }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>After clearing denominators</div>
              <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, color: "#111827" }}>
                {fracCleared ? eqText : "Pick the LCM first."}
              </div>

              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { key: "div:7", label: "÷7" },
                  { key: "mul:-1", label: "×(−1)" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFracOpKey(opt.key)}
                    style={operationButtonStyle(fracOpKey === opt.key)}
                    disabled={!fracCleared}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Btn
                  variant="primary"
                  onClick={() => {
                    if (!fracCleared || !fracOp) return;
                    setFracEq((prev) => applyOp(prev, fracOp, "both"));
                  }}
                  disabled={!fracCleared}
                  style={{ minWidth: 120 }}
                >
                  Apply
                </Btn>
                <Btn
                  variant="secondary"
                  onClick={() => {
                    setFracChoice("");
                    setFracCleared(false);
                    setFracEq({ lx: 7, lc: 0, rx: 0, rc: 84 });
                  }}
                  style={{ padding: "6px 10px", minWidth: 120 }}
                >
                  Reset
                </Btn>
              </div>
              {fracSolvedForm && (
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: "#047857" }}>
                  Solved form: x = {fmtIntish(fracSolvedForm.x)}
                </div>
              )}

              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: completed.fractions ? "#047857" : "#64748b" }}>
                {completed.fractions ? "Completed: cleared denominators and solved." : "Solve to complete this step."}
              </div>
            </div>
          </div>
        </>
      );
    }

    if (id === "systems") {
      const eq1 = "2x + y = 11";
      const eq2 = "x - y = 1";
      const result = sysCombine === "add" ? "3x = 12" : sysCombine === "sub" ? "x + 2y = 10" : "";
      const pickedX = sysXPick && sysXPick === String(SYS.x);
      const pickedY = sysYPick && sysYPick === String(SYS.y);
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Systems (Elimination)</h3>
          <p style={{ color: "#475569" }}>
            Look for opposite coefficients. Add or subtract equations to eliminate a variable.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>System</div>
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontWeight: 900, fontSize: 16, color: "#111827" }}>
                <div>{eq1}</div>
                <div>{eq2}</div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Combine equations to eliminate y:</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setSysCombine("add")}
                    style={chipStyle({ active: sysCombine === "add", success: sysCombine === "add" })}
                  >
                    Add (E1 + E2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSysCombine("sub")}
                    style={chipStyle({ active: sysCombine === "sub", danger: sysCombine === "sub" })}
                  >
                    Subtract (E1 − E2)
                  </button>
                </div>
              </div>

              {sysCombine && (
                <div style={{ marginTop: 10, fontSize: 14, fontWeight: 900, color: sysCombine === "add" ? "#047857" : "#b91c1c" }}>
                  Result: {result}
                </div>
              )}
              {sysCombine === "sub" && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#b91c1c", fontWeight: 800 }}>
                  This does not eliminate y. Try adding instead.
                </div>
              )}
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff", opacity: sysCombine === "add" ? 1 : 0.5 }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Solve x</div>
              <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
                From add: 3x = 12 so x = 4.
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["3", "4", "5", "6"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSysXPick(v)}
                    disabled={sysCombine !== "add"}
                    style={chipStyle({ active: sysXPick === v, success: sysXPick === v && v === String(SYS.x), danger: sysXPick === v && v !== String(SYS.x) })}
                  >
                    x = {v}
                  </button>
                ))}
              </div>
              {sysXPick && (
                <div style={{ marginTop: 8, fontSize: 12, color: pickedX ? "#047857" : "#b91c1c", fontWeight: 800 }}>
                  {pickedX ? "Correct." : "Not correct. Re-check 3x = 12."}
                </div>
              )}
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff", opacity: pickedX ? 1 : 0.5 }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Solve y</div>
              <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
                Use x − y = 1. If x = 4 then y = 3.
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["2", "3", "4", "5"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSysYPick(v)}
                    disabled={!pickedX}
                    style={chipStyle({ active: sysYPick === v, success: sysYPick === v && v === String(SYS.y), danger: sysYPick === v && v !== String(SYS.y) })}
                  >
                    y = {v}
                  </button>
                ))}
              </div>
              {sysYPick && (
                <div style={{ marginTop: 8, fontSize: 12, color: pickedY ? "#047857" : "#b91c1c", fontWeight: 800 }}>
                  {pickedY ? "Correct." : "Not correct. Substitute x = 4 into x − y = 1."}
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: completed.systems ? "#047857" : "#64748b" }}>
                {completed.systems ? "Completed: solved system." : "Solve x and y to complete this step."}
              </div>
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
            Answer all 3. Focus on inverse operations, distribution, and elimination.
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
            <div style={{ fontSize: 13, fontWeight: 900, color: completed.challenge ? "#047857" : "#64748b" }}>
              {completed.challenge ? "Completed: challenge passed." : "Get all 3 correct to complete this step."}
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
      <HeaderBar title="SAT Interactive Lesson: Solving Equations" />
      <Card style={headerCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Hard - Moving + clickable explanation</div>
            <h2 style={{ marginTop: 6, marginBottom: 0 }}>Solving Equations</h2>
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
