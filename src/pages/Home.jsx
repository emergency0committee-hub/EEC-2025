// src/pages/Home.jsx
import React, { useState, useRef, useEffect } from "react";
import Btn from "../components/Btn.jsx";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import logoUrl from "../assets/logo.png"; // optional

export default function Home({ onNavigate }) {
  // simple language dropdown
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const langRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  const LangButton = (
    <div ref={langRef} style={{ position: "relative" }}>
      <button
        aria-label="Language"
        onClick={() => setLangOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "#fff",
          cursor: "pointer",
        }}
        title="Language"
      >
        {/* Simple globe icon (SVG, no deps) */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#111827" strokeWidth="1.5"/>
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke="#111827" strokeWidth="1.5"/>
        </svg>
      </button>

      {langOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: 6,
            minWidth: 160,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            overflow: "hidden",
            zIndex: 30,
          }}
        >
          {[
            { k: "en", label: "English" },
            { k: "ar", label: "العربية" },
            { k: "fr", label: "Français" },
          ].map((opt) => (
            <button
              key={opt.k}
              onClick={() => {
                setLang(opt.k);
                setLangOpen(false);
                // hook your i18n switch here
                console.log("language:", opt.k);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                fontSize: 14,
                border: "none",
                background: lang === opt.k ? "#eef2ff" : "#fff",
                color: "#111827",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const HeaderActions = (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {/* Language globe */}
    {LangButton}

    {/* Login (you can route to a dedicated login page, or admin) */}
    <Btn variant="primary" onClick={() => onNavigate("admin")}>
      Login
    </Btn>
  </div>
);


  return (
    <PageWrap>
      <HeaderBar
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }}
              />
            ) : (
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#eef2ff",
                  color: "#4f46e5",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                GS
              </div>
            )}
            <span>Economic Emergency Committee</span>
          </div>
        }
        right={HeaderActions}
      />

      {/* Hero / Intro */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              style={{ width: 56, height: 56, borderRadius: 8, objectFit: "contain" }}
            />
          ) : (
            <div
              aria-hidden
              style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                background: "#eef2ff",
                color: "#4f46e5",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
            >
              GS
            </div>
          )}
          <div>
            <h2 style={{ margin: 0, color: "#111827" }}>Welcome to the Assessment Portal</h2>
            <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
              Choose a path to begin. You can always return here.
            </p>
          </div>
        </div>
      </Card>

      {/* Primary choices (kept) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Card>
          <h3 style={{ marginTop: 0, color: "#111827" }}>Career Assessments</h3>
          <p style={{ color: "#6b7280" }}>
            Explore your interests and aptitudes with a scenario-based RIASEC test and curated role matches.
          </p>
          <Btn variant="primary" onClick={() => onNavigate("career")}>Go to Career</Btn>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0, color: "#111827" }}>SAT Practice</h3>
          <p style={{ color: "#6b7280" }}>
            Timed practice with section navigation and a test-like experience.
          </p>
          <Btn variant="secondary" onClick={() => onNavigate("sat")}>Go to SAT</Btn>
        </Card>
      </div>

      {/* Optional: keep your NewsFeed here if you added it previously */}
      {/* <NewsFeed items={newsItems} title="News & Updates" max={6} /> */}

      {/* Utility */}
      <Card>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="secondary" onClick={() => onNavigate("admin")}>Admin</Btn>
          <Btn variant="secondary" onClick={() => onNavigate("thanks")}>Sample Receipt</Btn>
        </div>
      </Card>

      <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
        © {new Date().getFullYear()} Guidance Suite — All rights reserved.
      </div>
    </PageWrap>
  );
}
