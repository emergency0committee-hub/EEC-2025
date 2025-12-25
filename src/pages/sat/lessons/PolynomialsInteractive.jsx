// src/pages/sat/lessons/PolynomialsInteractive.jsx
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

const polyEval = (coeffs, xRaw) => {
  const x = Number(xRaw);
  const list = Array.isArray(coeffs) ? coeffs.map((c) => Number(c || 0)) : [];
  if (!Number.isFinite(x) || list.some((n) => !Number.isFinite(n))) return NaN;
  return list.reduce((acc, c) => acc * x + c, 0);
};

const polyToString = (coeffs, digits = 2) => {
  const list = Array.isArray(coeffs) ? coeffs.map((c) => Number(c || 0)) : [];
  const degree = list.length - 1;
  const parts = [];

  list.forEach((c, idx) => {
    if (!Number.isFinite(c) || Math.abs(c) < 1e-12) return;
    const power = degree - idx;
    const sign = c < 0 ? "-" : "+";
    const abs = Math.abs(c);

    let coeffText = "";
    if (power === 0) coeffText = fmtIntish(abs, digits);
    else if (!isAlmostInteger(abs) || Math.abs(abs - 1) > 1e-12) coeffText = fmtIntish(abs, digits);

    const varText = power === 0 ? "" : power === 1 ? "x" : `x^${power}`;
    parts.push({ sign, term: `${coeffText}${varText}` });
  });

  if (!parts.length) return "0";
  return parts
    .map((p, i) => {
      if (i === 0) return p.sign === "-" ? `-${p.term}` : p.term;
      return ` ${p.sign} ${p.term}`;
    })
    .join("");
};

const syntheticDivision = (coeffs, aRaw) => {
  const a = Number(aRaw);
  const top = (Array.isArray(coeffs) ? coeffs : []).map((c) => Number(c || 0));
  if (!Number.isFinite(a) || !top.length || top.some((n) => !Number.isFinite(n))) return null;

  const bottom = [];
  for (let i = 0; i < top.length; i += 1) {
    if (i === 0) bottom.push(top[0]);
    else bottom.push(top[i] + a * bottom[i - 1]);
  }
  return {
    a,
    top,
    bottom,
    quotient: bottom.slice(0, -1),
    remainder: bottom[bottom.length - 1],
  };
};

const chipStyle = ({ active = false, success = false } = {}) => ({
  borderRadius: 999,
  border: "1px solid",
  borderColor: active ? "#111827" : success ? "#86efac" : "#d1d5db",
  background: active ? "#111827" : success ? "#ecfdf5" : "#ffffff",
  color: active ? "#ffffff" : success ? "#047857" : "#111827",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 900,
});

const RULE_CARD = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  background: "#ffffff",
  boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
  boxSizing: "border-box",
  width: "100%",
  minWidth: "100%",
  scrollSnapAlign: "center",
  flex: "0 0 100%",
};
const PANEL = {
  marginTop: 12,
  padding: 12,
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};

const P_RULE_ZEROS = [1, -6, 11, -6]; // (x-1)(x-2)(x-3)
const Q_WORK = [2, -3, -11, 6]; // roots: 3, 1/2, -2
const ROOT_CANDIDATES = ["-3", "-2", "-1", "-0.5", "0.5", "1", "2", "3"];

const SYNTH = {
  a: 3,
  coeffs: Q_WORK,
  bottomAnswer: ["2", "3", "-2", "0"],
  options: {
    0: ["2", "-2", "3", "6"],
    1: ["3", "6", "-3", "9"],
    2: ["-2", "2", "-11", "9"],
    3: ["0", "6", "-6", "2"],
  },
};

const FACTOR_ACTIVITY = {
  polynomial: Q_WORK,
  correct: ["(x - 3)", "(2x - 1)", "(x + 2)"],
  chips: ["(x - 3)", "(x + 3)", "(2x - 1)", "(2x + 1)", "(x + 2)", "(x - 2)"],
};

const CHALLENGE = [
  {
    id: "q1",
    prompt: "For q(x) = 2x^3 - 3x^2 - 11x + 6, what is the remainder when dividing by (x - 3)?",
    choices: ["0", "6", "-6", "3"],
    answer: "0",
    explain: "Remainder theorem: remainder = q(3). Here q(3) = 0.",
  },
  {
    id: "q2",
    prompt: "If q(0.5) = 0, which factor must be present?",
    choices: ["(x - 0.5)", "(2x - 1)", "(x + 0.5)", "(2x + 1)"],
    answer: "(2x - 1)",
    explain: "x = 1/2 corresponds to factor 2x - 1 (same root).",
  },
  {
    id: "q3",
    prompt: "End behavior: degree 4 with a negative leading coefficient means:",
    choices: ["both ends up", "both ends down", "left up right down", "left down right up"],
    answer: "both ends down",
    explain: "Even degree: ends match. Negative leading coefficient: down on the right, so both down.",
  },
];

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

function EndBehaviorDiagram({ leftUp, rightUp, accent = "#111827" }) {
  const W = 240;
  const H = 90;
  const midY = 50;
  const leftTipY = leftUp ? 14 : 84;
  const rightTipY = rightUp ? 14 : 84;
  const arrowHead = (x, y, up) =>
    up
      ? `${x - 6},${y + 10} ${x + 6},${y + 10} ${x},${y}`
      : `${x - 6},${y - 10} ${x + 6},${y - 10} ${x},${y}`;

  return (
    <svg width={W} height={H} style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x="0" y="0" width={W} height={H} rx="12" fill="#ffffff" stroke="#e5e7eb" />
      <line x1="14" y1={midY} x2={W - 14} y2={midY} stroke="#cbd5e1" strokeWidth="2" />
      <path
        d={`M 36 ${midY} C 82 ${midY - 18}, ${W - 82} ${midY + 18}, ${W - 36} ${midY}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
      />

      <line x1="36" y1={midY} x2="36" y2={leftTipY} stroke={accent} strokeWidth="3" />
      <polygon points={arrowHead(36, leftTipY, leftUp)} fill={accent} style={{ transition: "all 150ms ease" }} />

      <line x1={W - 36} y1={midY} x2={W - 36} y2={rightTipY} stroke={accent} strokeWidth="3" />
      <polygon points={arrowHead(W - 36, rightTipY, rightUp)} fill={accent} style={{ transition: "all 150ms ease" }} />
    </svg>
  );
}

EndBehaviorDiagram.propTypes = {
  leftUp: PropTypes.bool.isRequired,
  rightUp: PropTypes.bool.isRequired,
  accent: PropTypes.string,
};

export default function PolynomialsInteractive({ onNavigate }) {
  PolynomialsInteractive.propTypes = { onNavigate: PropTypes.func.isRequired };

  const steps = useMemo(
    () => [
      { id: "rules", label: "Interactive Rules" },
      { id: "end", label: "End Behavior" },
      { id: "zeros", label: "Zeros and Factors" },
      { id: "synthetic", label: "Synthetic Division" },
      { id: "factor", label: "Factor Form" },
      { id: "challenge", label: "Challenge" },
    ],
    []
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [rulesSlide, setRulesSlide] = useState(0);
  const rulesScrollRef = useRef(null);
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
  const [rulesDegree, setRulesDegree] = useState(3);
  const [rulesLeadSign, setRulesLeadSign] = useState(1);
  const [rulesZeroPick, setRulesZeroPick] = useState("2");
  const [rulesRemA, setRulesRemA] = useState(3);
  const [rulesShowQuotient, setRulesShowQuotient] = useState(false);
  const [rulesMulti, setRulesMulti] = useState(2);
  const [rulesMultiRoot, setRulesMultiRoot] = useState(0.0);

  const rulesEnd = useMemo(() => {
    const even = rulesDegree % 2 === 0;
    const rightUp = rulesLeadSign > 0;
    const leftUp = even ? rightUp : !rightUp;
    return { even, leftUp, rightUp };
  }, [rulesDegree, rulesLeadSign]);

  const rulesZeroValue = useMemo(() => polyEval(P_RULE_ZEROS, Number(rulesZeroPick)), [rulesZeroPick]);
  const rulesZeroOk = useMemo(
    () => isAlmostInteger(rulesZeroValue) && Math.abs(rulesZeroValue) < 1e-9,
    [rulesZeroValue]
  );

  const rulesRem = useMemo(() => syntheticDivision(Q_WORK, rulesRemA), [rulesRemA]);
  const quotientAt3 = useMemo(() => syntheticDivision(Q_WORK, 3), []);

  const multiplicityPlot = useMemo(() => {
    const root = Number(rulesMultiRoot);
    const m = Number(rulesMulti);
    const X_MIN = -1.6;
    const X_MAX = 1.6;
    const W = 240;
    const H = 160;
    const points = [];
    for (let x = X_MIN; x <= X_MAX + 1e-9; x += 0.08) {
      points.push({ x, y: (x - root) ** m });
    }
    const yVals = points.map((p) => p.y);
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);
    const pad = 0.15 * (yMax - yMin || 1);
    const viewMin = yMin - pad;
    const viewMax = yMax + pad;
    const toSvgX = (x) => ((x - X_MIN) / (X_MAX - X_MIN)) * W;
    const toSvgY = (y) => H - ((y - viewMin) / (viewMax - viewMin)) * H;
    const d = points
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${toSvgX(p.x).toFixed(2)} ${toSvgY(p.y).toFixed(2)}`)
      .join(" ");
    const xAxisY = clamp(toSvgY(0), 0, H);
    const rootX = toSvgX(root);
    return { W, H, d, xAxisY, rootX };
  }, [rulesMulti, rulesMultiRoot]);

  // End behavior practice
  const END_PRACTICE = useMemo(
    () => [
      { id: "e1", degree: 3, leadSign: 1, answer: "left down right up" },
      { id: "e2", degree: 4, leadSign: -1, answer: "both ends down" },
      { id: "e3", degree: 5, leadSign: -1, answer: "left up right down" },
    ],
    []
  );
  const [endAnswers, setEndAnswers] = useState(() => ({}));
  const endCorrectCount = useMemo(
    () => END_PRACTICE.filter((q) => (endAnswers[q.id] || "") === q.answer).length,
    [endAnswers, END_PRACTICE]
  );

  // Zeros hunt
  const [foundRoots, setFoundRoots] = useState(() => new Set());

  // Synthetic activity
  const [synthFill, setSynthFill] = useState(() => ["", "", "", ""]);
  const synthComplete = useMemo(
    () => synthFill.every((v, idx) => String(v) === SYNTH.bottomAnswer[idx]),
    [synthFill]
  );

  // Factor activity
  const [factorSlots, setFactorSlots] = useState(() => ["", "", ""]);
  const factorCorrect = useMemo(() => {
    const picked = factorSlots.filter(Boolean).slice().sort().join("|");
    const correct = FACTOR_ACTIVITY.correct.slice().sort().join("|");
    return picked === correct;
  }, [factorSlots]);

  // Challenge
  const [challengeAnswers, setChallengeAnswers] = useState(() => ({}));
  const challengeCorrect = useMemo(
    () => CHALLENGE.every((q) => challengeAnswers[q.id] === q.answer),
    [challengeAnswers]
  );

  const completed = useMemo(() => {
    const rulesComplete = ["end", "zeros", "remainder", "synthetic", "multiplicity"].every((k) => Boolean(rulesTouched?.[k]));
    return {
      rules: rulesComplete,
      end: endCorrectCount >= 2,
      zeros: foundRoots.size >= 2,
      synthetic: synthComplete,
      factor: factorCorrect,
      challenge: challengeCorrect,
    };
  }, [rulesTouched, endCorrectCount, foundRoots, synthComplete, factorCorrect, challengeCorrect]);

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

  const scrollRulesTo = (index, behavior = "smooth") => {
    const node = rulesScrollRef.current;
    if (!node) return;
    const target = node.children[index];
    if (!target) return;
    node.scrollTo({ left: target.offsetLeft, behavior });
  };

  useEffect(() => {
    if (steps[stepIndex]?.id !== "rules") return;
    scrollRulesTo(rulesSlide);
  }, [rulesSlide, stepIndex, steps]);

  const goNext = () => setStepIndex((i) => clamp(i + 1, 0, steps.length - 1));
  const goPrev = () => setStepIndex((i) => clamp(i - 1, 0, steps.length - 1));

  const resetAll = () => {
    setStepIndex(0);
    setRulesSlide(0);
    setRulesTouched({});
    setRulesDegree(3);
    setRulesLeadSign(1);
    setRulesZeroPick("2");
    setRulesRemA(3);
    setRulesShowQuotient(false);
    setRulesMulti(2);
    setRulesMultiRoot(0.0);
    setEndAnswers({});
    setFoundRoots(new Set());
    setSynthFill(["", "", "", ""]);
    setFactorSlots(["", "", ""]);
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
        recap: "Use degree parity and leading sign for end behavior. Zeros give factors. The remainder theorem gives remainders. Multiplicity tells touch versus cross.",
        hints: [
          "Even degree: ends match. Odd degree: ends are opposite.",
          "If p(r) = 0, then (x - r) is a factor.",
          "Remainder when dividing by (x - a) equals p(a).",
          "Multiplicity 2 touches the x-axis, multiplicity 3 crosses and flattens.",
        ],
        answers: [
          "Even degree and positive lead means both ends up.",
          "Odd degree and negative lead means left up, right down.",
          "Remainder theorem: remainder = p(a).",
        ],
        pacing: "3 to 4 min. Demonstrate each rule with one example.",
      },
      end: {
        recap: "Pick end behavior using degree parity and leading sign.",
        hints: ["Degree 3 with positive lead: left down, right up.", "Degree 4 with negative lead: both ends down."],
        answers: [
          "Degree 3, positive lead: left down right up.",
          "Degree 4, negative lead: both ends down.",
          "Degree 5, negative lead: left up right down.",
        ],
        pacing: "2 min. Get at least two correct.",
      },
      zeros: {
        recap: "Test candidate rational roots. Each root r gives factor (x - r).",
        hints: ["For q(x) = 2x^3 - 3x^2 - 11x + 6, try r = 3, 0.5, -2.", "Remainder 0 means a root."],
        answers: ["Roots here include -2, 0.5, and 3.", "Root 0.5 corresponds to factor (2x - 1)."],
        pacing: "3 min. Find two roots, then name one factor.",
      },
      synthetic: {
        recap: "Synthetic division by x - a gives the quotient row and remainder.",
        hints: ["Bring down the first coefficient.", "Multiply by a and add down each column.", "The last number is the remainder."],
        answers: ["For a = 3, the bottom row is 2, 3, -2, 0.", "Remainder 0 confirms x = 3 is a root."],
        pacing: "3 min. Fill the bottom row left to right.",
      },
      factor: {
        recap: "Factor form is the product of linear factors from the roots.",
        hints: ["Use all three factors from the root set.", "Check by plugging in a root."],
        answers: ["(x - 3)(2x - 1)(x + 2)."],
        pacing: "2 min. Place all factors.",
      },
      challenge: {
        recap: "Use remainder theorem, root-factor links, and end behavior.",
        hints: ["Remainder at x = 3 is q(3).", "Half roots become factors like (2x - 1)."],
        answers: ["Q1: 0", "Q2: (2x - 1)", "Q3: both ends down"],
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
      const rulesSlideCount = 5;
      const goRulesSlide = (nextIndex) => {
        const clamped = clamp(nextIndex, 0, rulesSlideCount - 1);
        setRulesSlide(clamped);
        scrollRulesTo(clamped);
      };
      const onRulesScroll = (event) => {
        const el = event.currentTarget;
        const width = el.clientWidth || 1;
        const nextIndex = Math.round(el.scrollLeft / width);
        if (nextIndex !== rulesSlide) {
          setRulesSlide(clamp(nextIndex, 0, rulesSlideCount - 1));
        }
      };
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Interactive Rules (Polynomials)</h3>
          <p style={{ color: "#475569" }}>
            Explanation first. Move sliders and click chips to see the rules update.
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Swipe left/right between rules. One rule fills the card.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Btn
                variant="secondary"
                onClick={() => goRulesSlide(rulesSlide - 1)}
                disabled={rulesSlide === 0}
                style={{
                  minWidth: 90,
                  opacity: rulesSlide === 0 ? 0.5 : 1,
                  cursor: rulesSlide === 0 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </Btn>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#0f172a",
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                }}
              >
                Rule {rulesSlide + 1} / {rulesSlideCount}
              </div>
              <Btn
                variant="secondary"
                onClick={() => goRulesSlide(rulesSlide + 1)}
                disabled={rulesSlide === rulesSlideCount - 1}
                style={{
                  minWidth: 90,
                  opacity: rulesSlide === rulesSlideCount - 1 ? 0.5 : 1,
                  cursor: rulesSlide === rulesSlideCount - 1 ? "not-allowed" : "pointer",
                }}
              >
                Next
              </Btn>
            </div>
          </div>

          <div
            ref={rulesScrollRef}
            onScroll={onRulesScroll}
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              scrollSnapStop: "always",
              scrollPadding: "0 8px",
              paddingBottom: 6,
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={RULE_CARD}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>1) End behavior depends on degree and leading sign</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                Even degree means both ends match. Odd degree means ends are opposite.
              </div>

              <div style={PANEL}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>
                    degree {rulesDegree} ({rulesEnd.even ? "even" : "odd"})
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        touchRules("end");
                        setRulesLeadSign(1);
                      }}
                      style={chipStyle({ active: rulesLeadSign === 1 })}
                    >
                      leading +
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        touchRules("end");
                        setRulesLeadSign(-1);
                      }}
                      style={chipStyle({ active: rulesLeadSign === -1 })}
                    >
                      leading -
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={2}
                  max={6}
                  step={1}
                  value={rulesDegree}
                  onChange={(e) => {
                    touchRules("end");
                    setRulesDegree(Number(e.target.value));
                  }}
                  style={{ width: "100%", marginTop: 10 }}
                  aria-label="Polynomial degree"
                />
                <div style={{ marginTop: 10 }}>
                  <EndBehaviorDiagram leftUp={rulesEnd.leftUp} rightUp={rulesEnd.rightUp} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                  Summary: {rulesEnd.leftUp ? "left up" : "left down"}, {rulesEnd.rightUp ? "right up" : "right down"}.
                </div>
              </div>
            </div>

            <div style={RULE_CARD}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>2) Zeros and factors: p(r) = 0 means (x - r) is a factor</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                Test a candidate r. If the result is 0, you found a root.
              </div>

              <div style={PANEL}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>p(x) = {polyToString(P_RULE_ZEROS)}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["-1", "0", "1", "2", "3", "4"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        touchRules("zeros");
                        setRulesZeroPick(v);
                      }}
                      style={chipStyle({ active: rulesZeroPick === v })}
                    >
                      r = {v}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                  <div>
                    p({rulesZeroPick}) = <b>{fmtIntish(rulesZeroValue, 2)}</b>
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 900, color: rulesZeroOk ? "#047857" : "#b91c1c" }}>
                    {rulesZeroOk ? `Root. Factor: (x - ${rulesZeroPick}).` : "Not a root. Try another."}
                  </div>
                </div>
              </div>
            </div>

            <div style={RULE_CARD}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>3) Remainder theorem: remainder after (x - a) equals p(a)</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                Instead of long division, just evaluate at a.
              </div>

              <div style={PANEL}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>q(x) = {polyToString(Q_WORK)}</div>
                <input
                  type="range"
                  min={-3}
                  max={3}
                  step={0.5}
                  value={rulesRemA}
                  onChange={(e) => {
                    touchRules("remainder");
                    setRulesRemA(Number(e.target.value));
                  }}
                  style={{ width: "100%", marginTop: 10 }}
                  aria-label="Choose a for remainder"
                />
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                  <span>-3</span>
                  <span>
                    a = <b style={{ color: "#0f172a" }}>{fmt(rulesRemA, 1)}</b>
                  </span>
                  <span>3</span>
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: "#334155" }}>
                  Remainder: <b>{fmtIntish(rulesRem?.remainder, 2)}</b>
                </div>
                {rulesRem && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                    Synthetic bottom row: {rulesRem.bottom.map((v) => fmtIntish(v, 2)).join(", ")}
                  </div>
                )}
              </div>
            </div>

            <div style={RULE_CARD}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>4) Synthetic division gives the quotient (when remainder is 0)</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                Bottom row except the last becomes the quotient polynomial.
              </div>

              <div style={PANEL}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>Divide q(x) by (x - 3)</div>
                  <Btn
                    variant="secondary"
                    onClick={() => {
                      touchRules("synthetic");
                      setRulesShowQuotient((v) => !v);
                    }}
                  >
                    {rulesShowQuotient ? "Hide" : "Show"} quotient
                  </Btn>
                </div>

                {rulesShowQuotient && quotientAt3 && (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                    <div>
                      Quotient: <b>{polyToString(quotientAt3.quotient)}</b>
                    </div>
                    <div>
                      Remainder: <b>{fmtIntish(quotientAt3.remainder, 2)}</b>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                      Since remainder is 0, (x - 3) is a factor.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={RULE_CARD}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>5) Multiplicity changes how the graph hits the x-axis</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                Odd multiplicity crosses. Even multiplicity touches and turns. Larger multiplicity looks flatter.
              </div>

              <div style={PANEL}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>y = (x - r)^{rulesMulti}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    r = <b style={{ color: "#0f172a" }}>{fmt(rulesMultiRoot, 1)}</b>
                  </div>
                </div>

                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={rulesMulti}
                  onChange={(e) => {
                    touchRules("multiplicity");
                    setRulesMulti(Number(e.target.value));
                  }}
                  style={{ width: "100%", marginTop: 10 }}
                  aria-label="Multiplicity"
                />
                <input
                  type="range"
                  min={-1.2}
                  max={1.2}
                  step={0.1}
                  value={rulesMultiRoot}
                  onChange={(e) => {
                    touchRules("multiplicity");
                    setRulesMultiRoot(Number(e.target.value));
                  }}
                  style={{ width: "100%", marginTop: 8 }}
                  aria-label="Root location"
                />

                <div style={{ marginTop: 10 }}>
                  <svg width={multiplicityPlot.W} height={multiplicityPlot.H} style={{ width: "100%", height: "auto", display: "block" }}>
                    <rect x="0" y="0" width={multiplicityPlot.W} height={multiplicityPlot.H} rx="12" fill="#ffffff" stroke="#e5e7eb" />
                    <line x1="0" y1={multiplicityPlot.xAxisY} x2={multiplicityPlot.W} y2={multiplicityPlot.xAxisY} stroke="#cbd5e1" strokeWidth="2" />
                    <path d={multiplicityPlot.d} fill="none" stroke="#111827" strokeWidth="2.5" />
                    <circle
                      cx={multiplicityPlot.rootX}
                      cy={multiplicityPlot.xAxisY}
                      r="6"
                      fill={rulesMulti % 2 === 0 ? "#f97316" : "#22c55e"}
                      opacity="0.9"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.rules ? "#047857" : "#64748b" }}>
            {completed.rules ? "Completed: you interacted with all rule demos." : "Interact with every rule card once to complete this step."}
          </div>
        </>
      );
    }

    if (id === "end") {
      const options = ["both ends up", "both ends down", "left up right down", "left down right up"];
      const diagFor = (choice) => {
        const leftUp = choice.includes("left up") || choice.includes("both ends up");
        const rightUp = choice.includes("right up") || choice.includes("both ends up");
        return <EndBehaviorDiagram leftUp={leftUp} rightUp={rightUp} accent="#2563eb" />;
      };

      return (
        <>
          <h3 style={{ marginTop: 0 }}>End Behavior (Practice)</h3>
          <p style={{ color: "#475569" }}>
            Pick the correct end behavior. Use only odd/even degree and leading sign.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {END_PRACTICE.map((q) => {
              const picked = endAnswers[q.id] || "";
              const ok = picked && picked === q.answer;
              const even = q.degree % 2 === 0;
              const leadingText = q.leadSign > 0 ? "positive" : "negative";
              return (
                <div key={q.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>
                    degree {q.degree} ({even ? "even" : "odd"}), leading coefficient is {leadingText}
                  </div>
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                    {options.map((choice) => {
                      const active = picked === choice;
                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setEndAnswers((prev) => ({ ...prev, [q.id]: choice }))}
                          style={{
                            borderRadius: 14,
                            border: "1px solid",
                            borderColor: active ? "#111827" : "#d1d5db",
                            background: active ? "#111827" : "#fff",
                            color: active ? "#fff" : "#111827",
                            padding: 10,
                            cursor: "pointer",
                            fontWeight: 900,
                            textAlign: "left",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8 }}>{choice}</div>
                          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 8 }}>{diagFor(choice)}</div>
                        </button>
                      );
                    })}
                  </div>
                  {picked && (
                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: ok ? "#047857" : "#b91c1c" }}>
                      {ok ? "Correct." : "Incorrect. Re-check odd/even and sign."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.end ? "#047857" : "#64748b" }}>
            {completed.end ? "Completed: end behavior." : `Get at least 2 correct (currently ${endCorrectCount}/3).`}
          </div>
        </>
      );
    }

    if (id === "zeros") {
      const testRoot = (value) => {
        const x = Number(value);
        if (!Number.isFinite(x)) return;
        const v = polyEval(Q_WORK, x);
        if (isAlmostInteger(v) && Math.abs(v) < 1e-9) {
          setFoundRoots((prev) => {
            const next = new Set(prev);
            next.add(String(value));
            return next;
          });
        }
      };

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Zeros and Factors (Hunt)</h3>
          <p style={{ color: "#475569" }}>
            Click candidate rational roots. If q(r) = 0, you found a root and a factor.
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>q(x) = {polyToString(Q_WORK)}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ROOT_CANDIDATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => testRoot(r)}
                  style={chipStyle({ success: foundRoots.has(r) })}
                  title={foundRoots.has(r) ? "Root found" : "Click to test"}
                >
                  r = {r}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: "#334155" }}>
              Found roots:{" "}
              <b>{foundRoots.size ? Array.from(foundRoots).sort((a, b) => Number(a) - Number(b)).join(", ") : "none"}</b>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              Tip: one root here is a fraction (0.5).
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.zeros ? "#047857" : "#64748b" }}>
            {completed.zeros ? "Completed: root hunting." : "Find at least 2 roots to complete this step."}
          </div>
        </>
      );
    }

    if (id === "synthetic") {
      const firstEmpty = synthFill.findIndex((v) => !v);
      const activeIdx = firstEmpty === -1 ? synthFill.length : firstEmpty;

      const pick = (idx, value) => {
        if (idx !== activeIdx) return;
        if (String(value) !== SYNTH.bottomAnswer[idx]) return;
        setSynthFill((prev) => prev.map((v, i) => (i === idx ? String(value) : v)));
      };

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Synthetic Division (Interactive)</h3>
          <p style={{ color: "#475569" }}>
            Fill the bottom row for dividing q(x) by (x - 3). Click the correct value for each cell (left to right).
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>q(x) = {polyToString(SYNTH.coeffs)}</div>
            <div style={{ marginTop: 10, fontSize: 13, color: "#334155" }}>
              a = <b>{SYNTH.a}</b>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px repeat(4, 1fr)", gap: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Top</div>
                {SYNTH.coeffs.map((c, idx) => (
                  <div
                    key={String(idx)}
                    style={{
                      textAlign: "center",
                      padding: "10px 8px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      fontWeight: 900,
                      color: "#0f172a",
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "60px repeat(4, 1fr)", gap: 8, alignItems: "center" }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Bottom</div>
                {synthFill.map((v, idx) => (
                  <div key={String(idx)} style={{ textAlign: "center" }}>
                    {v ? (
                      <div
                        style={{
                          padding: "10px 8px",
                          borderRadius: 12,
                          border: "1px solid #86efac",
                          background: "#ecfdf5",
                          fontWeight: 900,
                          color: "#047857",
                        }}
                      >
                        {v}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "10px 8px",
                          borderRadius: 12,
                          border: "1px dashed",
                          borderColor: idx === activeIdx ? "#111827" : "#cbd5e1",
                          background: idx === activeIdx ? "#ffffff" : "#f1f5f9",
                          fontWeight: 900,
                          color: idx === activeIdx ? "#111827" : "#94a3b8",
                        }}
                      >
                        {idx === activeIdx ? "?" : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {activeIdx < 4 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Pick for cell {activeIdx + 1}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SYNTH.options[activeIdx].map((opt) => (
                    <button key={opt} type="button" onClick={() => pick(activeIdx, opt)} style={chipStyle()}>
                      {opt}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                  Rule: bring down, multiply by a, add, repeat.
                </div>
              </div>
            )}

            {synthComplete && (
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 900, color: "#047857" }}>
                Completed. Quotient is {polyToString([2, 3, -2])} and remainder is 0.
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.synthetic ? "#047857" : "#64748b" }}>
            {completed.synthetic ? "Completed: synthetic division." : "Fill the full bottom row correctly to complete this step."}
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
          <h3 style={{ marginTop: 0 }}>Factor Form (Drag or Click)</h3>
          <p style={{ color: "#475569" }}>
            Build the full factorization of q(x). Drag factors into the slots (or click a chip to place it).
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>q(x) = {polyToString(FACTOR_ACTIVITY.polynomial)}</div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, 1fr))", gap: 10 }}>
              {factorSlots.map((slot, idx) => (
                <button
                  // eslint-disable-next-line react/no-array-index-key
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
                    minHeight: 52,
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
              {FACTOR_ACTIVITY.chips.map((chip) => (
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
                    ...chipStyle(),
                    cursor: "grab",
                    userSelect: "none",
                  }}
                  title="Drag into a slot (or click)"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="secondary" onClick={() => setFactorSlots(["", "", ""])}>Clear slots</Btn>
              <Btn variant="secondary" onClick={() => setFactorSlots(FACTOR_ACTIVITY.correct)}>Show answer</Btn>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 900, color: factorCorrect ? "#047857" : "#64748b" }}>
              {factorCorrect ? "Correct factorization." : "Tip: roots are -2, 0.5, and 3."}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.factor ? "#047857" : "#64748b" }}>
            {completed.factor ? "Completed: factor form." : "Place all 3 correct factors to complete this step."}
          </div>
        </>
      );
    }

    if (id === "challenge") {
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Hard Check</h3>
          <p style={{ color: "#475569" }}>
            Answer all 3. Use end behavior, roots, and the remainder theorem.
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
      <HeaderBar title="SAT Interactive Lesson: Polynomials" />
      <Card style={headerCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Hard - Moving + clickable explanation</div>
            <h2 style={{ marginTop: 6, marginBottom: 0 }}>Polynomials</h2>
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
