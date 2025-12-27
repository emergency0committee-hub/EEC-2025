// src/pages/sat/lessons/FunctionsAndDecimalsInteractive.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { InlineMath } from "react-katex";
import { PageWrap, HeaderBar, Card } from "../../../components/Layout.jsx";
import Btn from "../../../components/Btn.jsx";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isAlmostInteger = (value, eps = 1e-9) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  return Math.abs(num - Math.round(num)) <= eps;
};

const gcd = (a, b) => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
};

const decimalToFractionString = (raw) => {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  const negative = text.startsWith("-");
  const normalized = negative ? text.slice(1) : text;
  if (!normalized.includes(".")) return negative ? `-${normalized}` : normalized;
  const [intPart, fracPart = ""] = normalized.split(".");
  const digits = fracPart.length;
  const denom = 10 ** digits;
  const numer = Number(`${intPart}${fracPart}`);
  if (!Number.isFinite(numer) || !Number.isFinite(denom) || denom === 0) return text;
  const div = gcd(numer, denom);
  const n = numer / div;
  const d = denom / div;
  const prefix = negative ? "-" : "";
  if (d === 1) return `${prefix}${n}`;
  return `${prefix}${n}/${d}`;
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

const placeDecimalFromInteger = (integer, places) => {
  const n = Number(integer);
  const p = Number(places);
  if (!Number.isFinite(n) || !Number.isFinite(p)) return String(integer ?? "");
  const negative = n < 0;
  const abs = Math.abs(Math.trunc(n));
  const digits = String(abs);
  const dec = Math.max(0, Math.trunc(p));
  if (dec === 0) return `${negative ? "-" : ""}${digits}`;
  const padded = digits.padStart(dec + 1, "0");
  const splitIndex = padded.length - dec;
  return `${negative ? "-" : ""}${padded.slice(0, splitIndex)}.${padded.slice(splitIndex)}`;
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
      {complete && !active && <span aria-hidden style={{ fontSize: 11, fontWeight: 900 }}>OK</span>}
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

function FlipCard({ front, back, onFlip }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setFlipped((v) => !v);
        onFlip();
      }}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div style={{ width: "100%", height: 92, perspective: 900 }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 420ms cubic-bezier(.2,.9,.2,1)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              display: "grid",
              placeItems: "center",
              backfaceVisibility: "hidden",
              boxShadow: "0 2px 10px rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>{front}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Click to flip</div>
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 14,
              border: "1px solid #bae6fd",
              background: "linear-gradient(135deg, #eff6ff, #ecfeff)",
              display: "grid",
              placeItems: "center",
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              boxShadow: "0 2px 10px rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18, color: "#075985" }}>{back}</div>
            <div style={{ fontSize: 12, color: "#0369a1", marginTop: 6 }}>Click to flip back</div>
          </div>
        </div>
      </div>
    </button>
  );
}

FlipCard.propTypes = {
  front: PropTypes.string.isRequired,
  back: PropTypes.string.isRequired,
  onFlip: PropTypes.func.isRequired,
};

function DraggableValueCard({ value, disabled, onSelect, getDropRect }) {
  const ref = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0, active: false });
  const [snapBack, setSnapBack] = useState(false);

  const finish = (dropped) => {
    dragRef.current.active = false;
    setPos({ x: 0, y: 0, active: false });
    setSnapBack(true);
    window.setTimeout(() => setSnapBack(false), 220);
    if (dropped) onSelect(String(value));
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        if (disabled) return;
        onSelect(String(value));
      }}
      onPointerDown={(e) => {
        if (disabled) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
        setPos({ x: 0, y: 0, active: true });
        setSnapBack(false);
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.active) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPos({ x: dx, y: dy, active: true });
      }}
      onPointerUp={(e) => {
        if (!dragRef.current.active) return;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
        const dropRect = getDropRect?.() || null;
        const cardRect = ref.current?.getBoundingClientRect?.() || null;
        if (!dropRect || !cardRect) return finish(false);
        const cx = cardRect.left + cardRect.width / 2;
        const cy = cardRect.top + cardRect.height / 2;
        const dropped =
          cx >= dropRect.left &&
          cx <= dropRect.right &&
          cy >= dropRect.top &&
          cy <= dropRect.bottom;
        finish(dropped);
      }}
      onPointerCancel={() => {
        if (!dragRef.current.active) return;
        finish(false);
      }}
      disabled={disabled}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: "10px 12px",
        background: disabled ? "#f1f5f9" : "#fff",
        color: disabled ? "#94a3b8" : "#0f172a",
        cursor: disabled ? "not-allowed" : "grab",
        fontWeight: 900,
        fontSize: 16,
        boxShadow: pos.active ? "0 14px 30px rgba(15,23,42,0.18)" : "0 2px 10px rgba(15,23,42,0.06)",
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: pos.active ? "none" : snapBack ? "transform 200ms ease" : "transform 150ms ease",
        touchAction: "none",
        userSelect: "none",
        position: "relative",
        zIndex: pos.active ? 20 : 1,
        minWidth: 86,
      }}
      title="Drag into the drop zone (or click to select)"
    >
      {value}
    </button>
  );
}

DraggableValueCard.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  disabled: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  getDropRect: PropTypes.func.isRequired,
};

const MACHINE_ITEMS = [
  { x: 4, y: 0, choices: ["0", "1.2", "2.8", "-2.4"] },
  { x: 1.5, y: -0.75, choices: ["-0.75", "0.45", "0.3", "1.65"] },
  { x: -0.6, y: -1.38, choices: ["-1.38", "-0.18", "-1.8", "1.02"] },
  { x: 2.5, y: -0.45, choices: ["-0.45", "0.75", "1.3", "1.95"] },
];

const DOMAIN_VALUES = [
  { value: "-0.6", label: "-0.6" },
  { value: "-0.5", label: "-0.5" },
  { value: "1.2", label: "1.2" },
  { value: "1.3", label: "1.3" },
  { value: "0.4", label: "0.4" },
];

const CHALLENGE = [
  {
    id: "q1",
    prompt: "If f(x) = 0.3x - 1.2, what is f(2.5)?",
    choices: ["-0.45", "0.75", "1.3", "-1.95"],
    answer: "-0.45",
    explain: "Substitute: f(2.5)=0.3(2.5)-1.2=0.75-1.2=-0.45.",
  },
  {
    id: "q2",
    prompt: "If f(x)=0.2x+1.5, what is f^-1(2.3)?",
    choices: ["4", "0.4", "8", "1.15"],
    answer: "4",
    explain: "Solve 0.2x+1.5=2.3 -> 0.2x=0.8 -> x=4.",
  },
  {
    id: "q3",
    prompt: "If f(x)=x^2 and g(x)=x-0.2, what is f(g(1.3))?",
    choices: ["1.21", "1.69", "1.1", "1.11"],
    answer: "1.21",
    explain: "g(1.3)=1.1, then f(1.1)=1.21.",
  },
];

export default function FunctionsAndDecimalsInteractive({ onNavigate }) {
  FunctionsAndDecimalsInteractive.propTypes = { onNavigate: PropTypes.func.isRequired };

  const steps = useMemo(
    () => [
      { id: "rules", label: "Fundamentals" },
      { id: "fractions", label: "Decimals and Fractions" },
      { id: "machine", label: "Function Machine" },
      { id: "clear", label: "Clear Decimals" },
      { id: "domain", label: "Domain" },
      { id: "transform", label: "Transformations" },
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
    const normalized = String(key || "").trim();
    if (!normalized) return;
    setRulesTouched((prev) => {
      if (prev?.[normalized]) return prev;
      return { ...(prev || {}), [normalized]: true };
    });
  };
  const [orderStep, setOrderStep] = useState(1);
  const [foilA, setFoilA] = useState(2);
  const [foilB, setFoilB] = useState(-3);
  const [lcmA, setLcmA] = useState(6);
  const [lcmB, setLcmB] = useState(8);
  const [gcfA, setGcfA] = useState(24);
  const [gcfB, setGcfB] = useState(36);
  const [fracDenA, setFracDenA] = useState(3);
  const [fracDenB, setFracDenB] = useState(5);

  // Step 2
  const [flipCount, setFlipCount] = useState(0);

  // Step 3
  const [machineInput, setMachineInput] = useState("");
  const [machineLastChoice, setMachineLastChoice] = useState(null);
  const [machineSolved, setMachineSolved] = useState(() => ({}));
  const [showMachineWork, setShowMachineWork] = useState(false);
  const dropRef = useRef(null);

  const machineEntry = useMemo(() => {
    const x = machineInput ? Number(machineInput) : null;
    if (!Number.isFinite(x)) return null;
    return MACHINE_ITEMS.find((item) => Number(item.x) === x) || null;
  }, [machineInput]);

  const machineCorrectCount = useMemo(() => Object.values(machineSolved).filter(Boolean).length, [machineSolved]);

  // Step 4
  const [multiplier, setMultiplier] = useState(null);
  const [clearAnswer, setClearAnswer] = useState(null);

  // Step 5
  const [domainX, setDomainX] = useState(0.0);
  const [domainSelected, setDomainSelected] = useState(() => new Set());
  const domainInvalidSet = useMemo(() => new Set(["-0.6", "1.3"]), []);

  const domainStatus = useMemo(() => {
    const x = Number(domainX);
    const tooHigh = x > 1.2 + 1e-9;
    const denomZero = Math.abs(x + 0.6) < 0.05;
    if (denomZero) return { ok: false, reason: "Denominator hits 0 at x = -0.6." };
    if (tooHigh) return { ok: false, reason: "Square root needs 1.2 - x >= 0, so x must be <= 1.2." };
    return { ok: true, reason: "Valid input (domain satisfied)." };
  }, [domainX]);

  // Step 6
  const [h, setH] = useState(0.8);
  const [k, setK] = useState(-0.4);
  const [vertexGuess, setVertexGuess] = useState(null);
  const [showVertexAnswer, setShowVertexAnswer] = useState(false);
  const [vertexDragging, setVertexDragging] = useState(false);
  const svgRef = useRef(null);

  const vertexAnswer = useMemo(() => ({ x: Number(h), y: Number(k) }), [h, k]);
  const vertexCorrect = useMemo(() => {
    if (!vertexGuess) return false;
    const dx = vertexGuess.x - vertexAnswer.x;
    const dy = vertexGuess.y - vertexAnswer.y;
    return Math.hypot(dx, dy) <= 0.25;
  }, [vertexGuess, vertexAnswer]);

  // Step 7
  const [challengeAnswers, setChallengeAnswers] = useState(() => ({}));
  const challengeCorrect = useMemo(
    () => CHALLENGE.every((q) => challengeAnswers[q.id] === q.answer),
    [challengeAnswers]
  );

  const completed = useMemo(() => {
    const rulesComplete = ["order", "foil", "lcm", "gcf", "fractions"].every((k) => Boolean(rulesTouched?.[k]));
    return {
      rules: rulesComplete,
      fractions: flipCount >= 3,
      machine: machineCorrectCount >= 2,
      clear: multiplier === 100 && clearAnswer === "8",
      domain:
        domainSelected.size === domainInvalidSet.size &&
        Array.from(domainInvalidSet).every((v) => domainSelected.has(v)),
      transform: vertexCorrect,
      challenge: challengeCorrect,
    };
  }, [
    rulesTouched,
    flipCount,
    machineCorrectCount,
    multiplier,
    clearAnswer,
    domainSelected,
    domainInvalidSet,
    vertexCorrect,
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
    setOrderStep(1);
    setFoilA(2);
    setFoilB(-3);
    setLcmA(6);
    setLcmB(8);
    setGcfA(24);
    setGcfB(36);
    setFracDenA(3);
    setFracDenB(5);
    setFlipCount(0);
    setMachineInput("");
    setMachineLastChoice(null);
    setMachineSolved({});
    setShowMachineWork(false);
    setMultiplier(null);
    setClearAnswer(null);
    setDomainX(0.0);
    setDomainSelected(new Set());
    setH(0.8);
    setK(-0.4);
    setVertexGuess(null);
    setShowVertexAnswer(false);
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
        recap:
          "Core moves: follow order of operations, multiply binomials with FOIL, use LCM to combine fractions, use GCF to factor/simplify, and clear denominators to solve fraction equations.",
        hints: [
          "Do parentheses first, then exponents, then multiply/divide, then add/subtract.",
          "FOIL gives x^2 + (a + b)x + ab.",
          "LCM clears denominators; GCF factors expressions.",
        ],
        answers: [
          "6 + 2 * (5 - 3)^2 = 14.",
          "(x + 2)(x - 3) = x^2 - x - 6.",
          "LCM(6, 8) = 24; GCF(24, 36) = 12.",
          "x/3 + 3/5 = 2 -> x = 4.2.",
        ],
        pacing: "4 to 5 min. Hit one quick example per rule.",
      },
      fractions: {
        recap: "Write the decimal as an integer over 10^n, then reduce with gcd.",
        hints: [
          "Example: 0.08 -> 8/100 -> 2/25.",
          "Keep the negative sign in the numerator.",
        ],
        answers: ["0.3 = 3/10", "1.2 = 6/5", "0.08 = 2/25", "1.25 = 5/4", "0.6 = 3/5", "-0.4 = -2/5"],
        pacing: "2 min. Flip three cards, then ask for one more.",
      },
      machine: {
        recap: "Evaluate f(x) = 0.3x - 1.2 exactly (use fraction form if needed).",
        hints: ["0.3 = 3/10 and 1.2 = 6/5.", "Multiply first, then subtract 1.2."],
        answers: ["x = 4 -> 0", "x = 1.5 -> -0.75", "x = -0.6 -> -1.38", "x = 2.5 -> -0.45"],
        pacing: "3 min. Solve two inputs correctly.",
      },
      clear: {
        recap: "Multiply by 100 to clear decimals, then solve the integer equation.",
        hints: ["Max decimal places is 2, so use 100.", "After clearing: 8x + 60 = 124."],
        answers: ["Multiplier 100.", "x = 8."],
        pacing: "2 min. Choose multiplier and solve once.",
      },
      domain: {
        recap: "Combine restrictions: denominator not zero and sqrt input nonnegative.",
        hints: ["x cannot be -0.6.", "1.2 - x must be nonnegative, so x must be 1.2 or less."],
        answers: ["Invalid values: -0.6 and 1.3."],
        pacing: "3 min. Check two invalid values and one valid value.",
      },
      transform: {
        recap: "g(x) = f(x - h) + k shifts the vertex to (h, k).",
        hints: ["h positive shifts right.", "k positive shifts up."],
        answers: ["Vertex is (h, k)."],
        pacing: "3 min. Adjust h and k, then place the vertex once.",
      },
      challenge: {
        recap: "Use substitution, inverse functions, and composition in the right order.",
        hints: ["Inverse: solve 0.2x + 1.5 = 2.3.", "Composition: compute g(1.3) then plug into f."],
        answers: ["Q1: -0.45", "Q2: 4", "Q3: 1.21"],
        pacing: "4 min. One question per minute plus review.",
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
      const ruleCard = {
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
      const ruleTitle = { fontWeight: 900, color: "#0f172a" };
      const ruleText = { marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 };

      const orderSteps = [
        { id: 1, label: "Parentheses: (5 - 3) = 2" },
        { id: 2, label: "Exponents: 2^2 = 4" },
        { id: 3, label: "Multiply: 2 * 4 = 8" },
        { id: 4, label: "Add: 6 + 8 = 14" },
      ];
      const orderStepClamped = clamp(orderStep, 1, orderSteps.length);

      const foilSum = Number(foilA) + Number(foilB);
      const foilProd = Number(foilA) * Number(foilB);
      const foilAAbs = fmtIntish(Math.abs(foilA), 0);
      const foilBAbs = fmtIntish(Math.abs(foilB), 0);
      const foilASign = foilA >= 0 ? "+" : "-";
      const foilBSign = foilB >= 0 ? "+" : "-";
      const signed = (value, suffix = "") => {
        const num = Number(value);
        if (!Number.isFinite(num)) return "";
        const abs = fmtIntish(Math.abs(num), 0);
        return `${num >= 0 ? "+" : "-"} ${abs}${suffix}`;
      };

      const lcmValue = (a, b) => {
        const A = Math.abs(Number(a) || 0);
        const B = Math.abs(Number(b) || 0);
        if (!A || !B) return 0;
        return Math.round((A * B) / gcd(A, B));
      };
      const lcmAB = lcmValue(lcmA, lcmB);
      const lcmMultiplesA = Array.from({ length: 5 }, (_, i) => lcmA * (i + 1));
      const lcmMultiplesB = Array.from({ length: 5 }, (_, i) => lcmB * (i + 1));

      const gcfVal = gcd(gcfA, gcfB);
      const commonFactors = [];
      const maxFactor = Math.min(gcfA, gcfB);
      for (let i = 1; i <= maxFactor; i += 1) {
        if (gcfA % i === 0 && gcfB % i === 0) commonFactors.push(i);
      }
      const commonFactorsText =
        commonFactors.length > 12 ? `${commonFactors.slice(0, 12).join(", ")}...` : commonFactors.join(", ");

      const FRACTION_NUM = 3;
      const FRACTION_TARGET = 2;
      const fracLcm = lcmValue(fracDenA, fracDenB);
      const fracA = fracDenA ? fracLcm / fracDenA : 0;
      const fracB = fracDenB ? (FRACTION_NUM * fracLcm) / fracDenB : 0;
      const fracRhs = FRACTION_TARGET * fracLcm;
      const fracX = fracA ? (fracRhs - fracB) / fracA : 0;
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
          <h3 style={{ marginTop: 0 }}>Fundamentals Rules (Explain First)</h3>
          <p style={{ color: "#475569" }}>
            Core math rules: order of operations, FOIL, LCM, GCF, and solving fractions. Swipe to teach one rule at a time.
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
            <div style={ruleCard}>
              <div style={ruleTitle}>1) Order of Operations (PEMDAS)</div>
              <div style={ruleText}>
                {"Parentheses -> Exponents -> Multiply/Divide -> Add/Subtract."}
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                {(() => {
                  const pemdasCells = [
                    [
                      {
                        prefix: "Parentheses ( ) and other grouping symbols, like ",
                        latex: "\\sqrt{}",
                        suffix: " or { }",
                      },
                      { prefix: "Exponents ", latex: "x^y" },
                    ],
                    [
                      { prefix: "Multiplication ", latex: "x \\times y" },
                      { prefix: "Division ", latex: "\\frac{x}{y}" },
                    ],
                    [
                      { prefix: "Addition ", latex: "x + y" },
                      { prefix: "Subtraction ", latex: "x - y" },
                    ],
                  ];
                  return (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <tbody>
                      <tr style={{ background: "#eef2ff", borderBottom: "1px solid #e2e8f0" }}>
                        {["Please Excuse", "My Dear", "Aunt Sally"].map((label, idx) => {
                          const words = label.split(" ");
                          return (
                          <td
                            key={label}
                            style={{
                              padding: "8px 10px",
                              fontWeight: 900,
                              color: "#0f172a",
                              borderRight: idx === 2 ? "none" : "1px solid #e2e8f0",
                            }}
                          >
                            <div style={{ fontSize: 15 }}>
                              {words.map((word, wordIndex) => (
                                <span key={`${label}-${wordIndex}`}>
                                  <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                                    {word.charAt(0)}
                                  </span>
                                  {word.slice(1)}
                                  {wordIndex < words.length - 1 ? " " : ""}
                                </span>
                              ))}
                            </div>
                          </td>
                          );
                        })}
                      </tr>
                      <tr>
                        {pemdasCells.map((lines, idx) => (
                          <td
                            key={`pemdas-body-${idx}`}
                            style={{
                              padding: "8px 10px",
                              verticalAlign: "top",
                              borderRight: idx === 2 ? "none" : "1px solid #e2e8f0",
                            }}
                          >
                            {lines.map((line, lineIndex) => (
                              <div key={`${line.prefix || "line"}-${lineIndex}`} style={{ marginTop: lineIndex ? 6 : 0, color: "#334155" }}>
                                {line.prefix && <span>{line.prefix}</span>}
                                {line.latex && (
                                  <span style={{ marginLeft: line.prefix ? 2 : 0 }}>
                                    <InlineMath math={line.latex} />
                                  </span>
                                )}
                                {line.suffix && <span>{line.suffix}</span>}
                                {line.latexAfter && (
                                  <span style={{ marginLeft: 4 }}>
                                    <InlineMath math={line.latexAfter} />
                                  </span>
                                )}
                              </div>
                            ))}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                  );
                })()}

                <div style={{ fontWeight: 900, color: "#0f172a" }}>Evaluate: 6 + 2 * (5 - 3)^2</div>
                <div style={{ marginTop: 10 }}>
                  <input
                    type="range"
                    min={1}
                    max={orderSteps.length}
                    step={1}
                    value={orderStepClamped}
                    onChange={(e) => {
                      touchRules("order");
                      setOrderStep(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="Order of operations step"
                  />
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                    Step {orderStepClamped} of {orderSteps.length}
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {orderSteps.map((step) => {
                    const active = orderStepClamped >= step.id;
                    return (
                      <div
                        key={step.id}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: active ? "#e0f2fe" : "#ffffff",
                          color: active ? "#0f172a" : "#64748b",
                          fontWeight: active ? 900 : 600,
                          fontSize: 13,
                        }}
                      >
                        {step.label}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: orderStepClamped === 4 ? "#047857" : "#64748b" }}>
                  {orderStepClamped === 4 ? "Answer: 14" : "Keep going to reach the final answer."}
                </div>
              </div>
            </div>

            <div style={ruleCard}>
              <div style={ruleTitle}>2) FOIL: Multiply Binomials</div>
              <div style={ruleText}>
                First, Outer, Inner, Last. Then combine like terms.
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>(x {foilASign} {foilAAbs})(x {foilBSign} {foilBAbs})</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    a = <b style={{ color: "#0f172a" }}>{fmtIntish(foilA, 0)}</b>, b = <b style={{ color: "#0f172a" }}>{fmtIntish(foilB, 0)}</b>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>a</div>
                    <input
                      type="range"
                      min={-6}
                      max={6}
                      step={1}
                      value={foilA}
                      onChange={(e) => {
                        touchRules("foil");
                        setFoilA(Number(e.target.value));
                      }}
                      style={{ width: "100%" }}
                      aria-label="FOIL a"
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>b</div>
                    <input
                      type="range"
                      min={-6}
                      max={6}
                      step={1}
                      value={foilB}
                      onChange={(e) => {
                        touchRules("foil");
                        setFoilB(Number(e.target.value));
                      }}
                      style={{ width: "100%" }}
                      aria-label="FOIL b"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                  <div>First: x · x = x^2</div>
                  <div>Outer: x · {fmtIntish(foilB, 0)} = {fmtIntish(foilB, 0)}x</div>
                  <div>Inner: {fmtIntish(foilA, 0)} · x = {fmtIntish(foilA, 0)}x</div>
                  <div>Last: {fmtIntish(foilA, 0)} · {fmtIntish(foilB, 0)} = {fmtIntish(foilProd, 0)}</div>
                  <div style={{ marginTop: 4, fontWeight: 900, color: "#0f172a" }}>
                    x^2 {signed(foilSum, "x")} {signed(foilProd)}
                  </div>
                </div>
              </div>
            </div>

            <div style={ruleCard}>
              <div style={ruleTitle}>3) Least Common Multiple (LCM)</div>
              <div style={ruleText}>
                LCM is the smallest number both values divide into. Use it to combine fractions fast.
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Number A</div>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      step={1}
                      value={lcmA}
                      onChange={(e) => {
                        touchRules("lcm");
                        setLcmA(Number(e.target.value));
                      }}
                      style={{ width: "100%" }}
                      aria-label="LCM number A"
                    />
                    <div style={{ marginTop: 4, fontSize: 12, color: "#0f172a", fontWeight: 900 }}>A = {lcmA}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Number B</div>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      step={1}
                      value={lcmB}
                      onChange={(e) => {
                        touchRules("lcm");
                        setLcmB(Number(e.target.value));
                      }}
                      style={{ width: "100%" }}
                      aria-label="LCM number B"
                    />
                    <div style={{ marginTop: 4, fontSize: 12, color: "#0f172a", fontWeight: 900 }}>B = {lcmB}</div>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                  <div>Multiples of {lcmA}: {lcmMultiplesA.join(", ")}</div>
                  <div>Multiples of {lcmB}: {lcmMultiplesB.join(", ")}</div>
                  <div style={{ marginTop: 6, fontWeight: 900, color: "#0f172a" }}>LCM({lcmA}, {lcmB}) = {lcmAB}</div>
                </div>
              </div>
            </div>

            <div style={ruleCard}>
              <div style={ruleTitle}>4) Greatest Common Factor (GCF)</div>
              <div style={ruleText}>
                The GCF is the largest factor shared by both numbers. Use it to simplify expressions.
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Number A</div>
                    <input
                      type="range"
                      min={12}
                      max={60}
                      step={1}
                      value={gcfA}
                      onChange={(e) => {
                        touchRules("gcf");
                        setGcfA(Number(e.target.value));
                      }}
                      style={{ width: "100%" }}
                      aria-label="GCF number A"
                    />
                    <div style={{ marginTop: 4, fontSize: 12, color: "#0f172a", fontWeight: 900 }}>A = {gcfA}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Number B</div>
                    <input
                      type="range"
                      min={12}
                      max={60}
                      step={1}
                      value={gcfB}
                      onChange={(e) => {
                        touchRules("gcf");
                        setGcfB(Number(e.target.value));
                      }}
                      style={{ width: "100%" }}
                      aria-label="GCF number B"
                    />
                    <div style={{ marginTop: 4, fontSize: 12, color: "#0f172a", fontWeight: 900 }}>B = {gcfB}</div>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                  <div>Common factors: {commonFactorsText || "-"}</div>
                  <div style={{ marginTop: 6, fontWeight: 900, color: "#0f172a" }}>GCF({gcfA}, {gcfB}) = {gcfVal}</div>
                </div>
              </div>
            </div>

            <div style={ruleCard}>
              <div style={ruleTitle}>5) Solve Equations with Fractions</div>
              <div style={ruleText}>
                Clear denominators by multiplying every term by the LCM of the denominators.
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>
                  x / {fracDenA} + {FRACTION_NUM} / {fracDenB} = {FRACTION_TARGET}
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Denominator A</div>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      step={1}
                      value={fracDenA}
                      onChange={(e) => {
                        touchRules("fractions");
                        setFracDenA(Number(e.target.value));
                      }}
                      style={{ width: "100%" }}
                      aria-label="Fraction denominator A"
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Denominator B</div>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      step={1}
                      value={fracDenB}
                      onChange={(e) => {
                        touchRules("fractions");
                        setFracDenB(Number(e.target.value));
                      }}
                      style={{ width: "100%" }}
                      aria-label="Fraction denominator B"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                  <div>LCM({fracDenA}, {fracDenB}) = <b>{fracLcm}</b></div>
                  <div>
                    Multiply both sides by {fracLcm}: <b>{fmtIntish(fracA, 0)}x + {fmtIntish(fracB, 0)} = {fmtIntish(fracRhs, 0)}</b>
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 900, color: "#0f172a" }}>
                    x = {fmtIntish(fracX, 2)}
                  </div>
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

    if (id === "fractions") {
      const cards = [
        { front: "0.3", back: decimalToFractionString("0.3") },
        { front: "1.2", back: decimalToFractionString("1.2") },
        { front: "0.08", back: decimalToFractionString("0.08") },
        { front: "1.25", back: decimalToFractionString("1.25") },
        { front: "0.6", back: decimalToFractionString("0.6") },
        { front: "-0.4", back: decimalToFractionString("-0.4") },
      ];

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Decimals and Fractions (Hard)</h3>
          <p style={{ color: "#475569" }}>
            On hard SAT questions, decimals often hide clean fractions. Converting helps you avoid rounding drift.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {cards.map((c) => (
              <FlipCard
                key={c.front}
                front={c.front}
                back={c.back}
                onFlip={() => setFlipCount((n) => Math.min(cards.length, n + 1))}
              />
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: completed.fractions ? "#047857" : "#64748b" }}>
            {completed.fractions ? "Completed: nice." : "Flip at least 3 cards to complete this step."}
          </div>
        </>
      );
    }

    if (id === "machine") {
      const hintFraction = "f(x) = 0.3x - 1.2  =  (3/10)x - (6/5)";
      const canPick = (x) => !machineSolved[String(x)];
      const currentCorrect = machineEntry ? String(machineEntry.y) : "";
      const lastWasCorrect = machineLastChoice && machineEntry ? machineLastChoice === currentCorrect : null;

      const setInput = (value) => {
        const normalized = String(value || "").trim();
        if (!normalized) return;
        if (!MACHINE_ITEMS.some((item) => String(item.x) === normalized)) return;
        setMachineInput(normalized);
        setMachineLastChoice(null);
        setShowMachineWork(false);
      };

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Function Machine: Evaluate with Decimals</h3>
          <p style={{ color: "#475569" }}>
            Drag an input into the machine (or click it), then click the correct output.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Rule</div>
                <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>f(x) = 0.3x - 1.2</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{hintFraction}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: machineCorrectCount ? "#86efac" : "#e5e7eb",
                    background: machineCorrectCount ? "#ecfdf5" : "#f9fafb",
                    color: machineCorrectCount ? "#047857" : "#6b7280",
                  }}
                >
                  Correct: {machineCorrectCount}/{MACHINE_ITEMS.length}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(200px, 260px)", gap: 14, alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 800, marginBottom: 8, color: "#0f172a" }}>Inputs</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {MACHINE_ITEMS.map((item) => (
                    <DraggableValueCard
                      key={String(item.x)}
                      value={item.x}
                      disabled={!canPick(item.x)}
                      onSelect={setInput}
                      getDropRect={() => dropRef.current?.getBoundingClientRect?.() || null}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                  Tip: Use parentheses for negatives (e.g., f(-0.6) = 0.3(-0.6) - 1.2).
                </div>
              </div>

              <div
                ref={dropRef}
                style={{
                  borderRadius: 16,
                  border: "2px dashed #93c5fd",
                  background: "linear-gradient(135deg, #eff6ff, #ecfeff)",
                  padding: 14,
                  minHeight: 140,
                  display: "grid",
                  gap: 8,
                  alignContent: "start",
                }}
              >
                <div style={{ fontWeight: 900, color: "#1d4ed8" }}>Drop zone</div>
                {machineInput ? (
                  <div style={{ fontSize: 14, color: "#0f172a" }}>
                    Input chosen: <b>{machineInput}</b>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#64748b" }}>Drag a card here or click a value.</div>
                )}

                {machineInput && machineEntry && (
                  <div style={{ marginTop: 6, display: "grid", gap: 8 }}>
                    <div style={{ fontWeight: 800 }}>Pick the output</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {machineEntry.choices.map((choice) => {
                        const picked = machineLastChoice === choice;
                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => {
                              if (!canPick(machineEntry.x)) return;
                              setMachineLastChoice(choice);
                              const ok = String(choice) === String(machineEntry.y);
                              setMachineSolved((prev) => ({
                                ...prev,
                                [String(machineEntry.x)]: ok ? true : prev[String(machineEntry.x)] || false,
                              }));
                            }}
                            style={{
                              borderRadius: 999,
                              border: "1px solid",
                              borderColor: picked ? "#111827" : "#d1d5db",
                              background: picked ? "#111827" : "#fff",
                              color: picked ? "#fff" : "#111827",
                              padding: "8px 12px",
                              cursor: canPick(machineEntry.x) ? "pointer" : "not-allowed",
                              fontWeight: 900,
                            }}
                            disabled={!canPick(machineEntry.x)}
                          >
                            {choice}
                          </button>
                        );
                      })}
                    </div>

                    {lastWasCorrect != null && (
                      <div
                        style={{
                          fontSize: 13,
                          color: lastWasCorrect ? "#047857" : "#b91c1c",
                          fontWeight: 800,
                        }}
                      >
                        {lastWasCorrect ? "Correct." : "Not quite - try the fraction method or re-check subtraction."}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      <Btn
                        variant="secondary"
                        onClick={() => setShowMachineWork((v) => !v)}
                        disabled={!machineEntry}
                      >
                        {showMachineWork ? "Hide work" : "Show work"}
                      </Btn>
                      <Btn
                        variant="secondary"
                        onClick={() => {
                          setMachineInput("");
                          setMachineLastChoice(null);
                          setShowMachineWork(false);
                        }}
                      >
                        Clear
                      </Btn>
                    </div>

                    {showMachineWork && machineEntry && (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                        <div>
                          f({machineEntry.x}) = 0.3({machineEntry.x}) - 1.2
                        </div>
                        <div>
                          = {fmt(0.3 * machineEntry.x, 2)} - 1.2
                        </div>
                        <div>
                          = <b>{machineEntry.y}</b>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: 13, color: completed.machine ? "#047857" : "#64748b" }}>
              {completed.machine ? "Completed: you can handle decimal substitution." : "Get 2 correct inputs to complete this step."}
            </div>
          </div>
        </>
      );
    }

    if (id === "clear") {
      const equation = "0.08x + 0.6 = 1.24";
      const multiply = (m) => {
        if (m === 10) return "0.8x + 6 = 12.4 (still has decimals)";
        if (m === 100) return "8x + 60 = 124";
        if (m === 1000) return "80x + 600 = 1240";
        return "";
      };
      const clearsAll = multiplier === 100 || multiplier === 1000;
      const minimal = multiplier === 100;
      const solved = clearAnswer === "8";

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Clear Decimals (Hard)</h3>
          <p style={{ color: "#475569" }}>
            Multiply both sides by a power of 10 so every decimal becomes an integer.
          </p>
          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Equation</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6 }}>{equation}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[10, 100, 1000].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMultiplier(m)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: multiplier === m ? "#111827" : "#d1d5db",
                    background: multiplier === m ? "#111827" : "#fff",
                    color: multiplier === m ? "#fff" : "#111827",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  *{m}
                </button>
              ))}
            </div>

            {multiplier && (
              <div style={{ marginTop: 12 }}>
                <div style={{ color: "#334155", fontSize: 13 }}>
                  Result: <b>{multiply(multiplier)}</b>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800, color: clearsAll ? "#047857" : "#b91c1c" }}>
                  {clearsAll ? (minimal ? "Great: multiplying by 100 clears all decimals with the smallest power." : "Works, but multiplying by 100 is the smallest power that clears all decimals.") : "Not enough - decimals remain."}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Solve for x</div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 10 }}>
              After multiplying by 100: 8x + 60 = 124, so 8x = 64, so x = ?
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["6", "8", "10", "12"].map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setClearAnswer(choice)}
                  style={{
                    borderRadius: 12,
                    border: "1px solid",
                    borderColor: clearAnswer === choice ? "#111827" : "#d1d5db",
                    background: clearAnswer === choice ? "#111827" : "#fff",
                    color: clearAnswer === choice ? "#fff" : "#111827",
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
            {clearAnswer && (
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: solved ? "#047857" : "#b91c1c" }}>
                {solved ? "Correct." : "Not quite - re-check 124 - 60."}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.clear ? "#047857" : "#64748b" }}>
            {completed.clear ? "Completed: clearing decimals + solving." : "Choose *100 and solve x correctly to complete this step."}
          </div>
        </>
      );
    }

    if (id === "domain") {
      const toggleValue = (value) => {
        setDomainSelected((prev) => {
          const next = new Set(prev);
          if (next.has(value)) next.delete(value);
          else next.add(value);
          return next;
        });
      };
      const domainCorrect =
        domainSelected.size === domainInvalidSet.size &&
        Array.from(domainInvalidSet).every((v) => domainSelected.has(v));

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Domain (Two Restrictions)</h3>
          <p style={{ color: "#475569" }}>
            Domain mistakes are common on hard questions. Here we have a denominator restriction and a square-root restriction.
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Function</div>
            <div style={{ fontSize: 16, fontWeight: 900, marginTop: 6 }}>
              p(x) = (x - 0.4)/(x + 0.6) + sqrt(1.2 - x)
            </div>
            <ul style={{ marginTop: 10, marginBottom: 0, color: "#334155", fontSize: 13, lineHeight: 1.6 }}>
              <li>Denominator: x + 0.6 != 0, so x != -0.6</li>
              <li>{"Square root: 1.2 - x >= 0, so x <= 1.2"}</li>
            </ul>
          </div>

          <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Test an input (drag the slider)</div>
            <input
              type="range"
              min={-2}
              max={2}
              step={0.1}
              value={domainX}
              onChange={(e) => setDomainX(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "#0f172a" }}>
                x = <b>{fmt(domainX, 1)}</b>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: domainStatus.ok ? "#86efac" : "#fecaca",
                  background: domainStatus.ok ? "#ecfdf5" : "#fef2f2",
                  color: domainStatus.ok ? "#047857" : "#b91c1c",
                }}
              >
                {domainStatus.ok ? "Allowed" : "Not allowed"}
              </span>
              <div style={{ fontSize: 13, color: "#64748b" }}>{domainStatus.reason}</div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 14, borderRadius: 14, border: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Select all values NOT in the domain</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DOMAIN_VALUES.map((opt) => {
                const picked = domainSelected.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleValue(opt.value)}
                    style={{
                      borderRadius: 999,
                      border: "1px solid",
                      borderColor: picked ? "#111827" : "#d1d5db",
                      background: picked ? "#111827" : "#fff",
                      color: picked ? "#fff" : "#111827",
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: domainCorrect ? "#047857" : "#64748b" }}>
              {domainCorrect ? "Correct set selected." : "Pick the values that violate x != -0.6 or x <= 1.2."}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.domain ? "#047857" : "#64748b" }}>
            {completed.domain ? "Completed: domain restrictions." : "Select the invalid values to complete this step."}
          </div>
        </>
      );
    }

    if (id === "transform") {
      const X_MIN = -4;
      const X_MAX = 4;
      const Y_MIN = -3;
      const Y_MAX = 11;
      const W = 720;
      const H = 360;
      const toSvgX = (x) => ((x - X_MIN) / (X_MAX - X_MIN)) * W;
      const toSvgY = (y) => H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * H;
      const fromSvgX = (sx) => X_MIN + (sx / W) * (X_MAX - X_MIN);
      const fromSvgY = (sy) => Y_MIN + ((H - sy) / H) * (Y_MAX - Y_MIN);

      const points = (fn) => {
        const pts = [];
        for (let x = X_MIN; x <= X_MAX + 1e-9; x += 0.08) {
          const y = fn(x);
          pts.push(`${toSvgX(x)},${toSvgY(y)}`);
        }
        return pts.join(" ");
      };

      const f = (x) => x * x;
      const g = (x) => (x - h) * (x - h) + k;

      const handleSvgPick = (event) => {
        const rect = svgRef.current?.getBoundingClientRect?.();
        if (!rect) return;
        const sx = ((event.clientX - rect.left) / rect.width) * W;
        const sy = ((event.clientY - rect.top) / rect.height) * H;
        setVertexGuess({ x: fromSvgX(sx), y: fromSvgY(sy) });
        setShowVertexAnswer(false);
      };

      const markerPos = vertexGuess || (showVertexAnswer ? vertexAnswer : null);
      const markerX = markerPos ? toSvgX(markerPos.x) : null;
      const markerY = markerPos ? toSvgY(markerPos.y) : null;

      const beginMarkerDrag = (e) => {
        if (!markerPos) return;
        e.stopPropagation();
        setVertexDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      };

      const dragMarker = (e) => {
        if (!vertexDragging) return;
        const rect = svgRef.current?.getBoundingClientRect?.();
        if (!rect) return;
        const sx = ((e.clientX - rect.left) / rect.width) * W;
        const sy = ((e.clientY - rect.top) / rect.height) * H;
        setVertexGuess({ x: fromSvgX(sx), y: fromSvgY(sy) });
      };

      const endMarkerDrag = (e) => {
        if (!vertexDragging) return;
        setVertexDragging(false);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
      };

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Transformations with Decimals</h3>
          <p style={{ color: "#475569" }}>
            For f(x)=x^2, the transformation g(x)=f(x-h)+k shifts the vertex to (h, k).
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Horizontal shift (h)</div>
                <input type="range" min={-2} max={2} step={0.1} value={h} onChange={(e) => setH(Number(e.target.value))} style={{ width: "100%" }} />
                <div style={{ marginTop: 6, color: "#0f172a" }}>
                  h = <b>{fmt(h, 1)}</b> (g shifts right when g(x)=f(x-h))
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Vertical shift (k)</div>
                <input type="range" min={-2} max={2} step={0.1} value={k} onChange={(e) => setK(Number(e.target.value))} style={{ width: "100%" }} />
                <div style={{ marginTop: 6, color: "#0f172a" }}>
                  k = <b>{fmt(k, 1)}</b> (positive k shifts up)
                </div>
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Model</div>
              <div style={{ fontSize: 14, marginTop: 6, color: "#334155" }}>
                f(x)=x^2, and g(x)=f(x-{fmt(h, 1)})+{fmt(k, 1)} = (x-{fmt(h, 1)})^2+{fmt(k, 1)}
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>
                Task: click the graph to place the vertex of g. You can drag your marker to adjust.
              </div>
            </div>

            <div style={{ borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                height="360"
                onClick={handleSvgPick}
                style={{ background: "#ffffff", touchAction: "none" }}
              >
                <line x1={toSvgX(0)} x2={toSvgX(0)} y1={0} y2={H} stroke="#e5e7eb" strokeWidth={2} />
                <line x1={0} x2={W} y1={toSvgY(0)} y2={toSvgY(0)} stroke="#e5e7eb" strokeWidth={2} />
                <polyline points={points(f)} fill="none" stroke="#94a3b8" strokeWidth={3} />
                <polyline points={points(g)} fill="none" stroke="#2563eb" strokeWidth={4} />
                <circle cx={toSvgX(vertexAnswer.x)} cy={toSvgY(vertexAnswer.y)} r={6} fill="#22c55e" opacity={0.85} />
                {markerPos && (
                  <>
                    <circle
                      cx={markerX}
                      cy={markerY}
                      r={10}
                      fill={vertexCorrect ? "#22c55e" : "#ef4444"}
                      opacity={0.85}
                      onPointerDown={beginMarkerDrag}
                      onPointerMove={dragMarker}
                      onPointerUp={endMarkerDrag}
                      onPointerCancel={endMarkerDrag}
                      style={{ cursor: "grab" }}
                    />
                    <text x={markerX + 12} y={markerY - 12} fill="#0f172a" fontSize="14" fontWeight="900">
                      ({fmt(markerPos.x, 1)}, {fmt(markerPos.y, 1)})
                    </text>
                  </>
                )}
              </svg>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Btn variant="secondary" onClick={() => setShowVertexAnswer((v) => !v)}>
                {showVertexAnswer ? "Hide answer marker" : "Show answer marker"}
              </Btn>
              <Btn variant="secondary" onClick={() => setVertexGuess(null)}>Clear guess</Btn>
              <span style={{ fontSize: 13, fontWeight: 800, color: vertexCorrect ? "#047857" : "#64748b" }}>
                {vertexGuess ? (vertexCorrect ? "Correct (within tolerance)." : "Not yet - vertex is (h, k).") : "Click to place your guess."}
              </span>
            </div>

            <div style={{ marginTop: 4, fontSize: 13, color: completed.transform ? "#047857" : "#64748b" }}>
              {completed.transform ? "Completed: transformations." : "Place the vertex correctly to complete this step."}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <h3 style={{ marginTop: 0 }}>Hard Check</h3>
        <p style={{ color: "#475569" }}>
          Answer all 3. No rounding needed.
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
  };

  return (
    <PageWrap>
      <HeaderBar title="SAT Interactive Lesson: Fundamentals" />
      <Card style={headerCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Hard - Moving + clickable practice</div>
            <h2 style={{ marginTop: 6, marginBottom: 0 }}>Fundamentals</h2>
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
