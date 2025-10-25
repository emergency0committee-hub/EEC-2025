import React, { useState } from "react";
import PropTypes from "prop-types";

export default function LanguageButton({ lang, setLang, langs }) {
  LanguageButton.propTypes = {
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
    langs: PropTypes.array.isRequired,
  };

  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const selectLang = (code) => {
    setLang(code);
    setIsOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={toggleDropdown}
        style={{
          background: "none",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          padding: "12px 20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 14,
          fontWeight: 600,
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
          transition: "all 0.2s ease",
        }}
      >
        🌍 {lang}
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            zIndex: 1000,
            minWidth: 120,
          }}
        >
          {langs.map((langObj) => (
            <button
              key={langObj.code}
              onClick={() => selectLang(langObj.code)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {langObj.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
