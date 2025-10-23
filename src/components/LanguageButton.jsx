// src/components/LanguageButton.jsx
import React, { useState, useRef, useEffect } from "react";

const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
  fontSize: 14,
};

export default function LanguageButton({
  lang = "EN",
  setLang = () => {},
  langs = [{ code: "EN", label: "English" }, { code: "AR", label: "العربية" }],
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change language"
        style={btnBase}
      >
        {/* Globe icon (SVG) */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20Z" stroke="#111827" />
          <path d="M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20" stroke="#111827" />
        </svg>
        <span style={{ fontWeight: 600 }}>{lang}</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 160,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#fff",
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            zIndex: 30,
            overflow: "hidden",
          }}
        >
          {langs.map((l) => {
            const selected = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: selected ? "#eff6ff" : "#fff",
                  color: "#111827",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                }}
                role="menuitem"
              >
                {l.label} {selected ? "✓" : ""}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
