// src/pages/sat/lessons/WordProblemsInteractive.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../../components/Layout.jsx";
import Btn from "../../../components/Btn.jsx";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const fmt = (value, digits = 2) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? "");
  const rounded = Math.round(num * 10 ** digits) / 10 ** digits;
  return String(rounded);
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

export default function WordProblemsInteractive({ onNavigate }) {
  WordProblemsInteractive.propTypes = { onNavigate: PropTypes.func.isRequired };

  const steps = useMemo(
    () => [
      { id: "rules", label: "Interactive Rules" },
      { id: "translate", label: "Translate" },
      { id: "rates", label: "Rates" },
      { id: "percent", label: "Percent" },
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
  const [rulesPrice, setRulesPrice] = useState(12);
  const [rulesQty, setRulesQty] = useState(4);
  const rulesTotal = useMemo(() => Number(rulesPrice) * Number(rulesQty), [rulesPrice, rulesQty]);

  const [rulesSpeed, setRulesSpeed] = useState(60);
  const [rulesTime, setRulesTime] = useState(1.5);
  const rulesDistance = useMemo(() => Number(rulesSpeed) * Number(rulesTime), [rulesSpeed, rulesTime]);

  const [rulesOriginal, setRulesOriginal] = useState(120);
  const [rulesDiscount, setRulesDiscount] = useState(15);
  const rulesNewPrice = useMemo(
    () => Number(rulesOriginal) * (1 - Number(rulesDiscount) / 100),
    [rulesOriginal, rulesDiscount]
  );

  const [rulesSlope, setRulesSlope] = useState(2);
  const [rulesIntercept, setRulesIntercept] = useState(3);
  const [rulesX, setRulesX] = useState(5);
  const rulesY = useMemo(() => Number(rulesSlope) * Number(rulesX) + Number(rulesIntercept), [rulesSlope, rulesX, rulesIntercept]);

  // Translate step
  const TRANSLATE = useMemo(
    () => ({
      story: "A taxi charges a base fee of $3 plus $2 per mile. Write C in terms of m.",
      slots: ["", ""], // [slope, intercept]
      correct: ["2", "3"],
      chips: ["2", "3", "5", "1", "4", "10"],
    }),
    []
  );
  const [translateSlots, setTranslateSlots] = useState(() => ["", ""]);
  const translateCorrect = useMemo(() => translateSlots.join("|") === TRANSLATE.correct.join("|"), [translateSlots, TRANSLATE.correct]);

  // Rates step
  const RATE = useMemo(
    () => ({ distance: 90, targetTime: 1.5 }),
    []
  );
  const [rateSpeed, setRateSpeed] = useState(45);
  const rateTime = useMemo(() => RATE.distance / Number(rateSpeed || 1), [RATE.distance, rateSpeed]);
  const rateSolved = useMemo(() => Math.abs(rateTime - RATE.targetTime) <= 1e-9, [rateTime, RATE.targetTime]);

  // Percent step
  const PERCENT = useMemo(
    () => ({ original: 120, targetDiscount: 15 }),
    []
  );
  const [percentDiscount, setPercentDiscount] = useState(10);
  const percentNew = useMemo(
    () => PERCENT.original * (1 - Number(percentDiscount) / 100),
    [PERCENT.original, percentDiscount]
  );
  const percentSolved = useMemo(() => Number(percentDiscount) === PERCENT.targetDiscount, [percentDiscount, PERCENT.targetDiscount]);

  // Challenge
  const CHALLENGE = useMemo(
    () => [
      {
        id: "q1",
        prompt: "A gym charges a $25 sign-up fee plus $10 per month. What is the expression for cost after m months?",
        choices: ["10m + 25", "25m + 10", "10 + 25m", "m + 35"],
        answer: "10m + 25",
        explain: "Monthly cost is the slope (10). Sign-up fee is the intercept (25).",
      },
      {
        id: "q2",
        prompt: "A car travels 50 mph for 2.4 hours. How far does it go?",
        choices: ["120", "100", "52.4", "20.8"],
        answer: "120",
        explain: "Distance = rate * time = 50 * 2.4 = 120.",
      },
      {
        id: "q3",
        prompt: "A price of $80 is increased by 25%. What is the new price?",
        choices: ["100", "90", "60", "105"],
        answer: "100",
        explain: "Increase by 25%: 80 * 1.25 = 100.",
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
    const rulesComplete = ["variables", "rate", "percent", "linear"].every((k) => Boolean(rulesTouched?.[k]));
    return {
      rules: rulesComplete,
      translate: translateCorrect,
      rates: rateSolved,
      percent: percentSolved,
      challenge: challengeCorrect,
    };
  }, [rulesTouched, translateCorrect, rateSolved, percentSolved, challengeCorrect]);

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
    setRulesPrice(12);
    setRulesQty(4);
    setRulesSpeed(60);
    setRulesTime(1.5);
    setRulesOriginal(120);
    setRulesDiscount(15);
    setRulesSlope(2);
    setRulesIntercept(3);
    setRulesX(5);
    setTranslateSlots(["", ""]);
    setRateSpeed(45);
    setPercentDiscount(10);
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
        recap: "Translate words into equations: total = rate * time, percent change, and linear models y = mx + b.",
        hints: [
          "Identify fixed costs (intercepts) and per-unit rates (slopes).",
          "Use percent as a multiplier: new = original * (1 - discount/100).",
          "Track units to keep the equation consistent.",
        ],
        answers: [
          "Cost = base fee + (rate * miles).",
          "Distance = speed * time.",
        ],
        pacing: "3 min. Walk through one example per rule.",
      },
      translate: {
        recap: "Express the relationship with a slope and intercept.",
        hints: ["Base fee is the intercept.", "Cost per mile is the slope."],
        answers: ["C = 2m + 3"],
        pacing: "2 min. Fill the two slots.",
      },
      rates: {
        recap: "Distance equals rate times time.",
        hints: ["Solve for the missing variable by dividing.", "Use unit rate to check."],
        answers: ["Speed is 60 mph for 90 miles in 1.5 hours."],
        pacing: "2 min. Adjust the slider to the target time.",
      },
      percent: {
        recap: "Percent change uses a multiplier.",
        hints: ["Discount means subtract percent from 100 first.", "15 percent discount means multiply by 0.85."],
        answers: ["Discount rate is 15 percent.", "New price for 120 is 102."],
        pacing: "2 min. Set the discount to 15 percent.",
      },
      challenge: {
        recap: "Apply linear models, rate times time, and percent increase.",
        hints: ["For linear models, slope is per month, intercept is sign up fee."],
        answers: ["Q1: 10m + 25", "Q2: 120", "Q3: 100"],
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
      const rulesSlideCount = 4;
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
      const ruleCard = {
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 14,
        background: "#ffffff",
        boxSizing: "border-box",
        width: "100%",
        minWidth: "100%",
        scrollSnapAlign: "center",
        flex: "0 0 100%",
      };
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Interactive Rules (Word Problems)</h3>
          <p style={{ color: "#475569" }}>
            Word problems become easy when you map words to variables, keep units consistent, and write a clean equation.
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
              <div style={{ fontWeight: 900, color: "#0f172a" }}>1) Variables and equation</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                Total cost equals price per item times number of items.
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>Price ($)</div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{rulesPrice}</div>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={25}
                    step={1}
                    value={rulesPrice}
                    onChange={(e) => {
                      touchRules("variables");
                      setRulesPrice(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="Price slider"
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>Quantity</div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{rulesQty}</div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={rulesQty}
                    onChange={(e) => {
                      touchRules("variables");
                      setRulesQty(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="Quantity slider"
                  />

                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                    <div>
                      Equation: <b>Total = price * quantity</b>
                    </div>
                    <div>
                      Total = <b>{rulesPrice}</b> * <b>{rulesQty}</b> = <b>{fmt(rulesTotal, 2)}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={ruleCard}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>2) Rates (distance = rate * time)</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                Keep the units consistent. If rate is miles/hour and time is hours, distance is miles.
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>Rate (mph)</div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{rulesSpeed}</div>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={80}
                    step={5}
                    value={rulesSpeed}
                    onChange={(e) => {
                      touchRules("rate");
                      setRulesSpeed(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="Rate slider"
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>Time (hours)</div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{rulesTime}</div>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={3.0}
                    step={0.5}
                    value={rulesTime}
                    onChange={(e) => {
                      touchRules("rate");
                      setRulesTime(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="Time slider"
                  />

                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                    <div>
                      d = r * t = <b>{rulesSpeed}</b> * <b>{rulesTime}</b> = <b>{fmt(rulesDistance, 2)}</b> miles
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={ruleCard}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>3) Percent change</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                New = original * (1 - discount/100) for discounts.
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>Original ($)</div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{rulesOriginal}</div>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={5}
                    value={rulesOriginal}
                    onChange={(e) => {
                      touchRules("percent");
                      setRulesOriginal(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="Original price slider"
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>Discount (%)</div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{rulesDiscount}</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={rulesDiscount}
                    onChange={(e) => {
                      touchRules("percent");
                      setRulesDiscount(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="Discount slider"
                  />

                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                    <div>
                      New = {rulesOriginal} * (1 - {rulesDiscount}/100) = <b>{fmt(rulesNewPrice, 2)}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={ruleCard}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>4) Linear model (y = mx + b)</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                Many word problems boil down to a line: slope is the per-unit rate, intercept is the starting amount.
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>m</div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{rulesSlope}</div>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={1}
                    value={rulesSlope}
                    onChange={(e) => {
                      touchRules("linear");
                      setRulesSlope(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="Slope slider"
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>b</div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{rulesIntercept}</div>
                  </div>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={1}
                    value={rulesIntercept}
                    onChange={(e) => {
                      touchRules("linear");
                      setRulesIntercept(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="Intercept slider"
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>x</div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{rulesX}</div>
                  </div>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={1}
                    value={rulesX}
                    onChange={(e) => {
                      touchRules("linear");
                      setRulesX(Number(e.target.value));
                    }}
                    style={{ width: "100%" }}
                    aria-label="x slider"
                  />

                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                    <div>
                      y = {rulesSlope}x {rulesIntercept >= 0 ? "+" : "-"} {Math.abs(rulesIntercept)}
                    </div>
                    <div>
                      y({rulesX}) = <b>{fmt(rulesY, 2)}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.rules ? "#047857" : "#64748b" }}>
            {completed.rules ? "Completed: you interacted with every rule demo." : "Interact with all 4 rule cards to complete this step."}
          </div>
        </>
      );
    }

    if (id === "translate") {
      const firstEmpty = translateSlots.findIndex((v) => !v);
      const place = (value) => {
        const idx = firstEmpty === -1 ? 0 : firstEmpty;
        setTranslateSlots((prev) => prev.map((v, i) => (i === idx ? String(value) : v)));
      };
      const clearSlot = (idx) => setTranslateSlots((prev) => prev.map((v, i) => (i === idx ? "" : v)));

      return (
        <>
          <h3 style={{ marginTop: 0 }}>Translate (Practice)</h3>
          <p style={{ color: "#475569" }}>
            Turn the story into an equation. Identify the per-unit rate (slope) and the starting amount (intercept).
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Story</div>
            <div style={{ marginTop: 6, color: "#334155", fontSize: 13, lineHeight: 1.7 }}>{TRANSLATE.story}</div>

            <div style={{ marginTop: 12, fontWeight: 900, color: "#0f172a" }}>Build the equation</div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontWeight: 900, color: "#0f172a" }}>
              <span>C =</span>
              <button
                type="button"
                onClick={() => clearSlot(0)}
                style={{
                  minWidth: 64,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid",
                  borderColor: translateSlots[0] ? "#111827" : "#cbd5e1",
                  background: translateSlots[0] ? "#111827" : "#ffffff",
                  color: translateSlots[0] ? "#ffffff" : "#94a3b8",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
                title={translateSlots[0] ? "Click to clear" : "Click a chip to fill"}
              >
                {translateSlots[0] || "?"}
              </button>
              <span>m</span>
              <span>+</span>
              <button
                type="button"
                onClick={() => clearSlot(1)}
                style={{
                  minWidth: 64,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid",
                  borderColor: translateSlots[1] ? "#111827" : "#cbd5e1",
                  background: translateSlots[1] ? "#111827" : "#ffffff",
                  color: translateSlots[1] ? "#ffffff" : "#94a3b8",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
                title={translateSlots[1] ? "Click to clear" : "Click a chip to fill"}
              >
                {translateSlots[1] || "?"}
              </button>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontWeight: 900, color: "#0f172a" }}>
              <span style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>Equation:</span>
              <span>
                C = <b>{translateSlots[0] || "?"}</b>m + <b>{translateSlots[1] || "?"}</b>
              </span>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {TRANSLATE.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => place(chip)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    color: "#111827",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  {chip}
                </button>
              ))}
              <Btn variant="secondary" onClick={() => setTranslateSlots(["", ""])}>Clear</Btn>
              <Btn variant="secondary" onClick={() => setTranslateSlots(TRANSLATE.correct)}>Show answer</Btn>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 900, color: translateCorrect ? "#047857" : "#64748b" }}>
              {translateCorrect ? "Correct: C = 2m + 3." : "Tip: per mile is slope, base fee is intercept."}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.translate ? "#047857" : "#64748b" }}>
            {completed.translate ? "Completed: translation." : "Build the correct equation to complete this step."}
          </div>
        </>
      );
    }

    if (id === "rates") {
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Rates (Practice)</h3>
          <p style={{ color: "#475569" }}>
            Use time = distance / rate. Move the slider to make the time equal <b>1.5 hours</b> for a 90 mile trip.
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Scenario</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>
              Distance = <b>{RATE.distance}</b> miles. Choose a rate (mph).
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Rate</div>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>{rateSpeed} mph</div>
              </div>
              <input
                type="range"
                min={30}
                max={90}
                step={5}
                value={rateSpeed}
                onChange={(e) => setRateSpeed(Number(e.target.value))}
                style={{ width: "100%", marginTop: 8 }}
                aria-label="Rate slider"
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
              <div>
                time = distance / rate = {RATE.distance} / {rateSpeed} = <b>{fmt(rateTime, 2)}</b> hours
              </div>
              <div style={{ marginTop: 8, fontWeight: 900, color: rateSolved ? "#047857" : "#64748b" }}>
                {rateSolved ? "Completed: correct rate found (time is 1.5)." : "Goal: make time equal 1.5 hours."}
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[30, 45, 60, 75, 90].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRateSpeed(v)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: rateSpeed === v ? "#111827" : "#d1d5db",
                    background: rateSpeed === v ? "#111827" : "#fff",
                    color: rateSpeed === v ? "#fff" : "#111827",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.rates ? "#047857" : "#64748b" }}>
            {completed.rates ? "Completed: rates." : "Set the slider so the time equals 1.5 hours."}
          </div>
        </>
      );
    }

    if (id === "percent") {
      return (
        <>
          <h3 style={{ marginTop: 0 }}>Percent (Practice)</h3>
          <p style={{ color: "#475569" }}>
            New price = original * (1 - discount/100). Move the slider to set the discount to <b>15%</b> on $120.
          </p>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Scenario</div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>
              Original price = <b>${PERCENT.original}</b>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Discount</div>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>{percentDiscount}%</div>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={percentDiscount}
                onChange={(e) => setPercentDiscount(Number(e.target.value))}
                style={{ width: "100%", marginTop: 8 }}
                aria-label="Discount slider"
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
              <div>
                New = {PERCENT.original} * (1 - {percentDiscount}/100) = <b>${fmt(percentNew, 2)}</b>
              </div>
              <div style={{ marginTop: 8, fontWeight: 900, color: percentSolved ? "#047857" : "#64748b" }}>
                {percentSolved ? "Completed: discount is 15%." : "Goal: set discount to 15%."}
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[5, 10, 15, 20, 25].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPercentDiscount(v)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: percentDiscount === v ? "#111827" : "#d1d5db",
                    background: percentDiscount === v ? "#111827" : "#fff",
                    color: percentDiscount === v ? "#fff" : "#111827",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: completed.percent ? "#047857" : "#64748b" }}>
            {completed.percent ? "Completed: percent." : "Set discount to 15% to complete this step."}
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
      <HeaderBar title="SAT Interactive Lesson: Word Problems" />
      <Card style={headerCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Hard - Moving + clickable explanation</div>
            <h2 style={{ marginTop: 6, marginBottom: 0 }}>Word Problems</h2>
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
