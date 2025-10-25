// src/pages/Career.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import { STR, LANGS } from "../i18n/strings.js";

export default function Career({ onNavigate, lang = "EN", setLang }) {
  Career.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
  };
  const t = STR[lang] || STR.EN;
  const [showRules, setShowRules] = useState(false);
  const [agree, setAgree] = useState(false);

  const openRules = () => {
    setAgree(false);
    setShowRules(true);
  };
  const start = () => {
    if (!agree) return;
    setShowRules(false);
    onNavigate?.("test");
  };

  return (
    <PageWrap>
      <HeaderBar
        // Left: Logo + Title
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/logo.png" // put your logo in /public/logo.png
              alt="Logo"
              style={{ height: 40, width: "auto" }}
            />
            <span style={{ fontWeight: 600, fontSize: 18 }}>
              {t.portalTitle}
            </span>
          </div>
        }
        // Right: Language button + Admin button
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />
            <Btn
              variant="secondary"
              onClick={() => {
                localStorage.setItem("cg_admin_ok_v1", "1");
                onNavigate("select-results");
              }}
              title={t.adminLogin}
              style={{ padding: "8px 14px" }}
            >
              {t.adminLogin}
            </Btn>
          </div>
        }
      />

      {/* Hero */}
      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 28 }}>
              {t.heroLine1}{" "}
              <span style={{ fontWeight: 400, color: "#374151" }}>
                {t.heroLine2}
              </span>
            </h1>
            <p style={{ margin: "8px 0 0", color: "#4b5563", fontSize: 16 }}>
              {t.heroDesc}
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <Btn
                variant="primary"
                onClick={openRules}
                style={{ padding: "12px 18px" }}
              >
                {t.takeTest}
              </Btn>
              <Btn
                variant="secondary"
                onClick={() => {
                  localStorage.setItem("cg_admin_ok_v1", "1");
                  onNavigate("select-results");
                }}
                style={{ padding: "12px 18px" }}
              >
                {t.adminLogin}
              </Btn>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#fff",
              padding: 16,
            }}
          >
            <h3 style={{ margin: "0 0 10px", color: "#111827" }}>
              {t.overviewTitle}
            </h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                color: "#374151",
              }}
            >
              <li style={rowStyle}>
                <span style={dot("#3b82f6")} />
                <span>
                  <b>{t.duration}:</b> {t.durationVal}
                </span>
              </li>
              <li style={rowStyle}>
                <span style={dot("#10b981")} />
                <span>
                  <b>{t.sections}:</b> {t.sectionsVal}
                </span>
              </li>
              <li style={rowStyle}>
                <span style={dot("#f59e0b")} />
                <span>
                  <b>{t.qTypes}:</b> {t.qTypesVal}
                </span>
              </li>
              <li style={rowStyle}>
                <span style={dot("#8b5cf6")} />
                <span>
                  <b>{t.resultsPolicy}:</b> {t.resultsPolicyVal}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* How it works / reminders */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}
      >
        <Card>
          <h3 style={{ marginTop: 0, color: "#111827" }}>{t.step1Title}</h3>
          <p style={{ color: "#374151", marginTop: 8 }}>{t.step1Text}</p>
        </Card>
        <Card>
          <h3 style={{ marginTop: 0, color: "#111827" }}>{t.step2Title}</h3>
          <p style={{ color: "#374151", marginTop: 8 }}>{t.step2Text}</p>
        </Card>
        <Card>
          <h3 style={{ marginTop: 0, color: "#111827" }}>{t.step3Title}</h3>
          <p style={{ color: "#374151", marginTop: 8 }}>{t.step3Text}</p>
        </Card>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          color: "#6b7280",
          marginTop: 18,
          fontSize: 13,
        }}
      >
        {t.footer(new Date().getFullYear())}
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setShowRules(false)}
        >
          <div
            style={{
              width: "min(720px, 96vw)",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: 0, color: "#111827" }}>{t.rulesTitle}</h2>
            <p style={{ color: "#374151", marginTop: 6 }}>{t.rulesLead}</p>
            <ul style={{ margin: "8px 0 0 18px", color: "#374151" }}>
              <li>{t.rule1}</li>
              <li>{t.rule2}</li>
              <li>{t.rule3}</li>
              <li>{t.rule4}</li>
            </ul>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 12,
                color: "#111827",
              }}
            >
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>{t.agree}</span>
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 14,
              }}
            >
              <Btn variant="secondary" onClick={() => setShowRules(false)}>
                {t.cancel}
              </Btn>
              <Btn
                variant="primary"
                onClick={start}
                disabled={!agree}
                title={!agree ? t.agree : undefined}
              >
                {t.agreeBegin}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </PageWrap>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: "6px 0",
};
const dot = (c) => ({
  width: 10,
  height: 10,
  borderRadius: 999,
  background: c,
  border: "1px solid rgba(0,0,0,0.06)",
});
