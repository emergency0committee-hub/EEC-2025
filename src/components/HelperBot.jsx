import React, { useState, useMemo, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import Btn from "./Btn.jsx";
import robotPng from "../assets/robot.png";

const ROUTE_HINTS = [
  { label: "Career Guidance", route: "career" },
  { label: "SAT Diagnostic", route: "sat" },
  { label: "SAT Training", route: "sat-training" },
  { label: "Career Dashboard", route: "admin-dashboard" },
  { label: "SAT Dashboard", route: "admin-sat" },
  { label: "Question Bank", route: "admin-question-bank" },
  { label: "Manage Users", route: "admin-manage-users" },
  { label: "Certificates", route: "admin-certificates" },
  { label: "Home", route: "home" },
];

const SUGGESTIONS = [
  "Go to Career Guidance",
  "Open SAT Training",
  "Show Career Dashboard",
  "Open SAT Dashboard",
  "Open Question Bank",
];

export default function HelperBot({ currentRoute, onNavigate, recentRoutes = [] }) {
  HelperBot.propTypes = {
    currentRoute: PropTypes.string.isRequired,
    onNavigate: PropTypes.func.isRequired,
    recentRoutes: PropTypes.arrayOf(PropTypes.string),
  };

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const contextTips = useMemo(() => {
    if (currentRoute.startsWith("admin")) {
      return "You can jump to dashboards, manage users, or open the question bank.";
    }
    if (currentRoute.includes("sat")) {
      return "You can go to SAT Diagnostic or SAT Training, or back to Home.";
    }
    return "Navigate to Career Guidance, SAT, or admin tools if you have access.";
  }, [currentRoute]);

  const handleGo = (route) => {
    setOpen(false);
    onNavigate(route);
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const text = input.toLowerCase();
    const match = ROUTE_HINTS.find(
      (r) => text.includes(r.label.toLowerCase()) || text.includes(r.route.toLowerCase())
    );
    if (match) {
      handleGo(match.route);
      return;
    }
    alert("Sorry, I didn't recognize that. Try: Career Guidance, SAT Training, Career Dashboard, etc.");
  };

  return (
    <>
      <style>
        {`
          @keyframes bot-bob {
            0% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
            100% { transform: translateY(0); }
          }
        `}
      </style>

      <button
        aria-label={open ? "Close helper bot" : "Open helper bot"}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          width: 72,
          height: 72,
          borderRadius: 16,
          border: "none",
          background: "transparent",
          boxShadow: "none",
          cursor: "pointer",
          zIndex: 1502,
          animation: "bot-bob 2.4s ease-in-out infinite",
          padding: 0,
          overflow: "hidden",
        }}
      >
        <img
          src={robotPng}
          alt="Helper bot"
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            alignItems: "end",
            justifyItems: "end",
            padding: 12,
            zIndex: 1501,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ display: "flex", gap: 10, alignItems: "flex-end", paddingRight: 90 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={panelRef}
              style={{
                width: "min(360px, 95vw)",
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
                padding: 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>Need a hand?</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{contextTips}</div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Ask to navigate</label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., Go to Career Dashboard"
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 10,
                  }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Btn variant="secondary" type="button" onClick={() => setInput("")}>
                    Clear
                  </Btn>
                  <Btn variant="primary" type="submit">
                    Go
                  </Btn>
                </div>
              </form>

              {!!recentRoutes.length && (
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Recent pages</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {recentRoutes.slice(-4).map((r) => (
                      <Btn key={r} variant="secondary" onClick={() => handleGo(r)} style={{ fontSize: 12 }}>
                        {r}
                      </Btn>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Tips: Try “Open SAT Training”, “Go to Career Dashboard”, or use the search above.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
