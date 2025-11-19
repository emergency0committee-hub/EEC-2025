import PropTypes from "prop-types";
import { useState } from "react";
import Btn from "../../../components/Btn.jsx";
import { formatAccessCodeInput } from "../utils/accessCodes.js";

export default function AccessCodeCard({
  code,
  error,
  strings,
  onCodeChange,
  onUnlock,
  onBackHome,
  isAdmin,
  oneTimeCodes,
  onGenerateCodes,
  currentRotatingCode,
}) {
  const ui = strings || {};
  const [generateCount, setGenerateCount] = useState("5");
  const handleGenerate = () => {
    const qty = Number(generateCount);
    if (Number.isFinite(qty) && qty > 0 && onGenerateCodes) {
      onGenerateCodes(Math.min(500, qty));
      setGenerateCount("5");
    }
  };
  return (
    <div
      className="card"
      style={{
        padding: 16,
        marginBottom: 20,
      }}
    >
      <h3 style={{ marginTop: 0 }}>{ui?.accessTitle || "Access Code Required"}</h3>
      <p style={{ color: "#6b7280" }}>{ui?.accessDesc || "Enter the code provided by your instructor to continue."}</p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 420 }}>
        <input
          type="text"
          value={code}
          onChange={(e) => onCodeChange?.(formatAccessCodeInput(e.target.value))}
          placeholder={ui?.placeholderCode || "Enter access code"}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: error ? "1px solid #dc2626" : "1px solid #d1d5db",
            borderRadius: 8,
          }}
        />
        <Btn
          variant="primary"
          disabled={!code?.trim()}
          style={!code?.trim() ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
          onClick={onUnlock}
        >
          {ui?.unlockLabel || "Unlock"}
        </Btn>
      </div>
      {error ? (
        <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</p>
      ) : (
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
          {ui?.codeFormat || "Access code must be in the format XXXX-XXXX-XXXX"}
        </p>
      )}

      {onBackHome && (
        <div style={{ marginTop: 12 }}>
          <Btn variant="back" onClick={onBackHome}>
            {ui?.backHome || "Back Home"}
          </Btn>
        </div>
      )}

      {isAdmin && (
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>One-Time Codes (Admin)</div>
          {currentRotatingCode && (
            <div
              style={{
                marginBottom: 10,
                padding: 10,
                border: "1px dashed #cbd5f5",
                borderRadius: 8,
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: 13, color: "#475569" }}>Current rotating code (auto-renews):</div>
              <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "#111827" }}>
                {currentRotatingCode}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 320 }}>
            <input
              type="number"
              min={1}
              max={100}
              value={generateCount}
              onChange={(e) => setGenerateCount(e.target.value)}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5f5" }}
            />
            <Btn
              variant="primary"
              onClick={handleGenerate}
              disabled={!Number(generateCount)}
              style={!Number(generateCount) ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              Generate
            </Btn>
          </div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
            Enter how many single-use codes to create. Codes are stored locally and removed after use.
          </div>
          <div
            style={{
              marginTop: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              maxHeight: 220,
              overflowY: "auto",
              background: "#f8fafc",
              padding: 10,
            }}
          >
            {oneTimeCodes && oneTimeCodes.length ? (
              oneTimeCodes.slice(0, 25).map((entry) => (
                <div
                  key={`${entry.code}-${entry.createdAt || 0}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontFamily: "monospace" }}>{entry.code}</span>
                  <span style={{ color: entry.used ? "#dc2626" : "#16a34a" }}>
                    {entry.used ? "Used" : "Unused"}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>No one-time codes generated.</p>
            )}
            {oneTimeCodes && oneTimeCodes.length > 25 && (
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Only showing the most recent 25 codes.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

AccessCodeCard.propTypes = {
  code: PropTypes.string.isRequired,
  error: PropTypes.string,
  strings: PropTypes.object,
  onCodeChange: PropTypes.func.isRequired,
  onUnlock: PropTypes.func.isRequired,
  onBackHome: PropTypes.func,
  isAdmin: PropTypes.bool,
  oneTimeCodes: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      used: PropTypes.bool,
      createdAt: PropTypes.number,
      usedAt: PropTypes.number,
    })
  ),
  onGenerateCodes: PropTypes.func,
  currentRotatingCode: PropTypes.string,
};

AccessCodeCard.defaultProps = {
  error: "",
  strings: {},
  onBackHome: null,
  isAdmin: false,
  oneTimeCodes: [],
  onGenerateCodes: null,
  currentRotatingCode: null,
};
