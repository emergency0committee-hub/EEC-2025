import React, { useState } from "react";
import PropTypes from "prop-types";

export default function LanguageButton({ lang, setLang, langs, context = "header" }) {
  LanguageButton.propTypes = {
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
    langs: PropTypes.array.isRequired,
    context: PropTypes.oneOf(["header", "drawer"]),
  };
LanguageButton.displayName = "LanguageButton";

  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const selectLang = (code) => {
    setLang(code);
    setIsOpen(false);
  };

  const isDrawer = context === "drawer";

  return (
    <div
      style={{
        position: isDrawer ? "relative" : "relative",
        width: isDrawer ? "100%" : "auto",
      }}
    >
      <button
        onClick={toggleDropdown}
        style={{
          background: isDrawer ? "#ffffff" : "transparent",
          border: isDrawer ? "1px solid #d1d5db" : "none",
          borderRadius: isDrawer ? 10 : 6,
          padding: isDrawer ? "12px 14px" : "8px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: isDrawer ? 16 : 14,
          fontWeight: 600,
          boxShadow: "none",
          transition: "opacity 0.2s ease",
          justifyContent: isDrawer ? "center" : "initial",
          width: isDrawer ? "100%" : "auto",
        }}
      >
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21c4.971 0 9-4.029 9-9s-4.029-9-9-9-9 4.029-9 9 4.029 9 9 9Z" stroke="#374151" strokeWidth="1.6"/>
          <path d="M3 12h18M12 3c-2.5 2.7-3.75 5.4-3.75 9S9.5 17.3 12 21M12 3c2.5 2.7 3.75 5.4 3.75 9S14.5 17.3 12 21" stroke="#374151" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        {lang.toUpperCase() === "AR" ? "عر" : lang}
      </button>
      {isOpen && (
        <div
          style={{
            position: isDrawer ? "relative" : "absolute",
            top: isDrawer ? "auto" : "100%",
            right: isDrawer ? "auto" : 0,
            marginTop: isDrawer ? 12 : 0,
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 10,
            boxShadow: isDrawer ? "0 6px 20px rgba(15, 23, 42, 0.12)" : "0 4px 6px rgba(0,0,0,0.1)",
            zIndex: 1000,
            minWidth: isDrawer ? "100%" : 120,
            overflow: "hidden",
          }}
        >
          {langs.map((langObj) => (
            <button
              key={langObj.code}
              onClick={() => selectLang(langObj.code)}
              style={{
                width: "100%",
                padding: isDrawer ? "12px 16px" : "8px 16px",
                border: "none",
                background: "none",
                textAlign: isDrawer ? "center" : "left",
                cursor: "pointer",
                fontSize: isDrawer ? 16 : 14,
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
