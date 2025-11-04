// src/pages/Home.jsx
import React from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import UserMenu from "../components/UserMenu.jsx";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import { LANGS, STR } from "../i18n/strings.js";

const HOME_CARDS = {
  EN: {
    career: {
      title: "Career Assessments",
      desc: "Explore your interests and aptitudes with a scenario-based RIASEC test and curated role matches.",
      cta: "Open",
    },
    satDiagnostic: {
      title: "SAT Diagnostic Test",
      desc: "Simulates the Digital SAT with timed modules and a full results report.",
      cta: "Open",
    },
    satTraining: {
      title: "SAT Training",
      desc: "Practice Reading & Writing and Math by skill with untimed sets.",
      cta: "Open",
    },
    aiEducator: {
      title: "AI Educator",
      desc: "Adaptive lessons, instant feedback, and personalized study plans.",
      cta: "Open",
      locked: "Request Access",
      lockedMessage: "Limited to approved educators.",
    },
    certificate: {
      title: "Verify Certificate",
      desc: "Authenticate an official EEC certificate using its unique ID.",
      cta: "Verify",
    },
  },
  AR: {
    career: {
      title: "\u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u064a\u0648\u0644 \u0627\u0644\u0645\u0647\u0646\u064a\u0629",
      desc: "\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0647\u062a\u0645\u0627\u062a\u0643 \u0648\u0642\u062f\u0631\u0627\u062a\u0643 \u0639\u0628\u0631 \u0627\u062e\u062a\u0628\u0627\u0631 RIASEC \u062a\u0641\u0627\u0639\u0644\u064a \u0648\u062a\u0648\u0635\u064a\u0627\u062a \u0648\u0638\u0627\u0626\u0641 \u0645\u062e\u0635\u0635\u0629.",
      cta: "\u0627\u0641\u062a\u062d",
    },
    satDiagnostic: {
      title: "\u0627\u062e\u062a\u0628\u0627\u0631 SAT \u062a\u0634\u062e\u064a\u0635\u064a",
      desc: "\u064a\u062d\u0627\u0643\u064a SAT \u0627\u0644\u0631\u0642\u0645\u064a \u0645\u0639 \u0623\u0642\u0633\u0627\u0645 \u0645\u0648\u0642\u0651\u062a\u0629 \u0648\u062a\u0642\u0631\u064a\u0631 \u0646\u062a\u0627\u0626\u062c \u0634\u0627\u0645\u0644.",
      cta: "\u0627\u0641\u062a\u062d",
    },
    satTraining: {
      title: "\u062a\u062f\u0631\u064a\u0628 SAT",
      desc: "\u062a\u062f\u0631\u0651\u0628 \u0639\u0644\u0649 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0648\u0627\u0644\u0643\u062a\u0627\u0628\u0629 \u0648\u0627\u0644\u0631\u064a\u0627\u0636\u064a\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u0645\u0647\u0627\u0631\u0629 \u0645\u0646 \u062f\u0648\u0646 \u062a\u0648\u0642\u064a\u062a.",
      cta: "\u0627\u0641\u062a\u062d",
    },
    aiEducator: {
      title: "\u0627\u0644\u0645\u062f\u0631\u0651\u0633 \u0627\u0644\u0630\u0643\u064a",
      desc: "\u062f\u0631\u0648\u0633 \u0645\u062a\u0643\u064a\u0641\u0629\u060c \u062a\u063a\u0630\u064a\u0629 \u0631\u0627\u062c\u0639\u0629 \u0641\u0648\u0631\u064a\u0629\u060c \u0648\u062e\u0637\u0637 \u062f\u0631\u0627\u0633\u0629 \u0634\u062e\u0635\u064a\u0629.",
      cta: "\u0627\u0641\u062a\u062d",
      locked: "\u0627\u0637\u0644\u0628 \u0635\u0644\u0627\u062d\u064a\u0629",
      lockedMessage: "\u0645\u062a\u0627\u062d \u0641\u0642\u0637 \u0644\u0644\u0645\u0639\u0644\u0651\u0645\u064a\u0646 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u064a\u0646.",
    },
    certificate: {
      title: "\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0634\u0647\u0627\u062f\u0629",
      desc: "\u062a\u0623\u0643\u062f \u0645\u0646 \u0635\u062d\u0629 \u0634\u0647\u0627\u062f\u0629 EEC \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0631\u0642\u0645\u0647\u0627 \u0627\u0644\u0645\u0645\u064a\u0632.",
      cta: "\u062a\u062d\u0642\u0642 \u0627\u0644\u0622\u0646",
    },
  },
  FR: {
    career: {
      title: "\u00c9valuations de carri\u00e8re",
      desc: "Explorez vos int\u00e9r\u00eats et aptitudes gr\u00e2ce au mod\u00e8le RIASEC et \u00e0 des sc\u00e9narios immersifs.",
      cta: "Ouvrir",
    },
    satDiagnostic: {
      title: "Test diagnostique SAT",
      desc: "Simule le SAT num\u00e9rique avec des modules chronom\u00e9tr\u00e9s et un rapport complet.",
      cta: "Ouvrir",
    },
    satTraining: {
      title: "Entra\u00eenement SAT",
      desc: "Travaillez Lecture & \u00c9criture et Math\u00e9matiques par comp\u00e9tence sans minuterie.",
      cta: "Ouvrir",
    },
    aiEducator: {
      title: "Enseignant IA",
      desc: "Le\u00e7ons adaptatives, retours instantan\u00e9s et plans d'\u00e9tude personnalis\u00e9s.",
      cta: "Ouvrir",
      locked: "Demander l'acc\u00e8s",
      lockedMessage: "R\u00e9serv\u00e9 aux enseignants approuv\u00e9s.",
    },
    certificate: {
      title: "V\u00e9rifier un certificat",
      desc: "Confirmez l'authenticit\u00e9 d'un certificat EEC gr\u00e2ce \u00e0 son identifiant unique.",
      cta: "V\u00e9rifier",
    },
  },
};


export default function Home({ onNavigate, lang = "EN", setLang, canAccessAIEducator = false }) {
  Home.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
    canAccessAIEducator: PropTypes.bool,
  };

  const t = STR[lang] || STR.EN;
  const home = HOME_CARDS[lang] || HOME_CARDS.EN;

  const navTo = (nextRoute, data = null) => (event) => onNavigate(nextRoute, data, event);

  const lockedLabelMap = {
    EN: { label: "Request Access", message: "Limited to approved educators." },
    AR: { label: "\u0627\u0637\u0644\u0628 \u0635\u0644\u0627\u062d\u064a\u0629", message: "\u0645\u062a\u0627\u062d \u0641\u0642\u0637 \u0644\u0644\u0645\u0639\u0644\u0645\u064a\u0646 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u064a\u0646." },
    FR: { label: "Demander l'acc\u00e8s", message: "R\u00e9serv\u00e9 aux enseignants approuv\u00e9s." },
  };
  const lockedCopy = lockedLabelMap[lang] || lockedLabelMap.EN;
  const aiLockedLabel = home.aiEducator.locked || lockedCopy.label;
  const aiLockedMessage = home.aiEducator.lockedMessage || lockedCopy.message;

  const handleAiEducatorClick = canAccessAIEducator
    ? navTo("ai-educator")
    : (event) => {
        event?.preventDefault?.();
        if (typeof window !== "undefined" && typeof window.alert === "function") {
          window.alert(aiLockedMessage);
        }
      };

  return (
    <PageWrap>
      <HeaderBar
        lang={lang}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/EEC_Logo.png" alt="Logo" style={{ height: 40, width: "auto" }} />
            <span style={{ fontWeight: 600, fontSize: 18 }}>
              {lang === "AR" ? "\u0627\u0644\u0644\u062c\u0646\u0629 \u0627\u0644\u0627\u0642\u062a\u0635\u0627\u062f\u064a\u0629 \u0644\u0644\u0637\u0627\u0642\u0629" : "EEC"}
            </span>
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

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src="/EEC_Logo.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "contain" }} />
          <div>
            <h2 style={{ margin: 0, color: "#111827" }}>{t.homeWelcome}</h2>
            <p style={{ margin: "6px 0 0", color: "#6b7280" }}>{t.homeSubtitle}</p>
          </div>
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>{home.career.title}</h3>
            <p style={{ color: "#6b7280" }}>{home.career.desc}</p>
            <div style={{ marginTop: "auto" }}>
              <Btn variant="primary" to="career" onClick={navTo("career")}>
                {home.career.cta}
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>{home.satDiagnostic.title}</h3>
            <p style={{ color: "#6b7280" }}>{home.satDiagnostic.desc}</p>
            <div style={{ marginTop: "auto" }}>
              <Btn variant="primary" to="sat" onClick={navTo("sat")}>
                {home.satDiagnostic.cta}
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>{home.satTraining.title}</h3>
            <p style={{ color: "#6b7280" }}>{home.satTraining.desc}</p>
            <div style={{ marginTop: "auto" }}>
              <Btn variant="secondary" to="sat-training" onClick={navTo("sat-training")}>
                {home.satTraining.cta}
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>{home.aiEducator.title}</h3>
            <p style={{ color: "#6b7280" }}>{home.aiEducator.desc}</p>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <Btn
                variant="secondary"
                onClick={handleAiEducatorClick}
                disabled={!canAccessAIEducator}
                style={!canAccessAIEducator ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
              >
                {canAccessAIEducator ? home.aiEducator.cta : aiLockedLabel}
              </Btn>
              {!canAccessAIEducator && (
                <small style={{ color: "#9ca3af", fontSize: 12 }}>{aiLockedMessage}</small>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 180 }}>
            <h3 style={{ marginTop: 0, color: "#111827" }}>{home.certificate.title}</h3>
            <p style={{ color: "#6b7280" }}>{home.certificate.desc}</p>
            <div style={{ marginTop: "auto" }}>
              <Btn variant="primary" to="verify-certificate" onClick={navTo("verify-certificate")}>
                {home.certificate.cta}
              </Btn>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
        {t.footer(new Date().getFullYear())}
      </div>
    </PageWrap>
  );
}
