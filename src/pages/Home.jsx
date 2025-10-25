// src/pages/Home.jsx
import React from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import { LANGS, STR } from "../i18n/strings.js";
import logoUrl from "../assets/logo.png"; // optional

export default function Home({ onNavigate, lang = "EN", setLang }) {
  Home.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
  };
  const t = STR[lang] || STR.EN;

  const HeaderActions = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* Language Button */}
      <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />

      {/* Login (you can route to a dedicated login page, or admin) */}
      <Btn variant="primary" onClick={() => {
        localStorage.setItem("cg_admin_ok_v1", "1");
        onNavigate("select-results");
      }}>
        {t.adminLogin}
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
            <span>{t.homeTitle}</span>
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
            <h2 style={{ margin: 0, color: "#111827" }}>{t.homeWelcome}</h2>
            <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
              {t.homeSubtitle}
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
          <h3 style={{ marginTop: 0, color: "#111827" }}>{t.careerTitle}</h3>
          <p style={{ color: "#6b7280" }}>
            {t.careerDesc}
          </p>
          <Btn variant="primary" onClick={() => onNavigate("career")}>{t.goToCareer}</Btn>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0, color: "#111827" }}>{t.satTitle}</h3>
          <p style={{ color: "#6b7280" }}>
            {t.satDesc}
          </p>
          <Btn variant="secondary" onClick={() => onNavigate("sat")}>{t.goToSAT}</Btn>
        </Card>
      </div>

      {/* Optional: keep your NewsFeed here if you added it previously */}
      {/* <NewsFeed items={newsItems} title="News & Updates" max={6} /> */}



      <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
        {t.footer(new Date().getFullYear())}
      </div>
    </PageWrap>
  );
}
