// src/pages/Home.jsx
import React from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import UserMenu from "../components/UserMenu.jsx";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import { LANGS, STR } from "../i18n/strings.js";

export default function Home({ onNavigate, lang = "EN", setLang }) {
  Home.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
  };
  const t = STR[lang] || STR.EN;

  const navTo = (route, data = null) => (event) => onNavigate(route, data, event);

  return (
    <PageWrap>
      <HeaderBar
        lang={lang}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/EEC_Logo.png"
              alt="Logo"
              style={{ height: 40, width: "auto" }}
            />
            <span style={{ fontWeight: 600, fontSize: 18 }}>EEC</span>
          </div>
        }
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Btn variant="link" to="home" onClick={(e) => onNavigate("home", null, e)}>
                {t.navHome}
              </Btn>
              <Btn variant="link" to="about" onClick={(e) => onNavigate("about", null, e)}>
                {t.navAbout}
              </Btn>
              <Btn variant="link" to="blogs" onClick={(e) => onNavigate("blogs", null, e)}>
                {t.navBlogs}
              </Btn>
            </nav>
            <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />
            <UserMenu onNavigate={onNavigate} lang={lang} />
          </div>
        }
      />

      {/* Hero / Intro */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src="/EEC_Logo.png"
            alt="Logo"
            style={{ width: 56, height: 56, borderRadius: 8, objectFit: "contain" }}
          />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>{t.careerTitle}</h3>
            <p style={{ color: "#6b7280" }}>{t.careerDesc}</p>
            <div style={{ marginTop: "auto" }}>
              <Btn variant="primary" to="career" onClick={navTo("career")}>Open</Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>SAT Diagnostic Test</h3>
            <p style={{ color: "#6b7280" }}>
              Simulates the Digital SAT with timed modules and a full results report.
            </p>
            <div style={{ marginTop: "auto" }}>
              <Btn variant="primary" to="sat" onClick={navTo("sat")}>Open</Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>SAT Training</h3>
            <p style={{ color: "#6b7280" }}>
              Practice Reading & Writing and Math by skill with untimed sets.
            </p>
            <div style={{ marginTop: "auto" }}>
              <Btn variant="secondary" to="sat-training" onClick={navTo("sat-training")}>Open</Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>AI Educator</h3>
            <p style={{ color: "#6b7280" }}>
              Adaptive lessons, instant feedback, and personalized study plans.
            </p>
            <div style={{ marginTop: "auto" }}>
              <Btn variant="secondary" to="ai-educator" onClick={navTo("ai-educator")}>Open</Btn>
            </div>
          </div>
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
