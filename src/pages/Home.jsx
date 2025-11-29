// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import UserMenu from "../components/UserMenu.jsx";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import { LANGS, STR } from "../i18n/strings.js";
import { supabase } from "../lib/supabase.js";

const HOME_CARDS = {
  EN: {
    career: {
      title: "Career Guidance",
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
    schoolTraining: {
      title: "School Training",
      desc: "Dedicated portal for school programs to organize sessions and track progress.",
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
  FR: {
    career: {
      title: "Orientation professionnelle",
      desc: "Explorez vos int\u00e9r\u00eats et aptitudes gr\u00e2ce au mod\u00e8le RIASEC et à des sc\u00e9narios immersifs.",
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
    schoolTraining: {
      title: "Formation scolaire",
      desc: "Portail d\u00e9di\u00e9 aux programmes avec les \u00e9tablissements pour organiser et suivre les s\u00e9ances.",
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
      desc: "Confirmez l'authenticit\u00e9 d'un certificat EEC gr\u00e2ce à son identifiant unique.",
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

  const [currentUser, setCurrentUser] = useState(null);
  const [checkingResult, setCheckingResult] = useState(false);

  const t = STR[lang] || STR.EN;
  const home = HOME_CARDS[lang] || HOME_CARDS.EN;

  const navTo = (nextRoute, data = null) => (event) => onNavigate(nextRoute, data, event);

  const lockedLabelMap = {
    EN: { label: "Request Access", message: "Limited to approved educators." },
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email) setCurrentUser(parsed);
      }
    } catch (e) {
      console.warn("Failed to read current user", e);
    }
  }, []);

  const handleCareerClick = async (event) => {
    // If no user info, just go to test
    if (!currentUser?.email) {
      return onNavigate("career", null, event);
    }
    event?.preventDefault?.();
    setCheckingResult(true);
    try {
      const { data, error } = await supabase
        .from("cg_results")
        .select("*")
        .eq("user_email", currentUser.email)
        .order("ts", { ascending: false })
        .limit(1)
        .single();
      if (error || !data) {
        return onNavigate("career", null, event);
      }
      onNavigate("results", { resultId: data.id, submission: data });
    } catch (e) {
      console.warn("Failed to check existing result", e);
      onNavigate("career", null, event);
    } finally {
      setCheckingResult(false);
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
              EEC
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
        {[
          {
            key: "career",
            title: home.career.title,
            desc: home.career.desc,
            cta: home.career.cta,
            onClick: handleCareerClick,
            variant: "primary",
            extra: checkingResult ? (
              <small style={{ color: "#9ca3af", fontSize: 12 }}>Checking for existing result...</small>
            ) : null,
          },
          {
            key: "satDiag",
            title: home.satDiagnostic.title,
            desc: home.satDiagnostic.desc,
            cta: home.satDiagnostic.cta,
            onClick: navTo("sat"),
            variant: "primary",
            extra: null,
          },
          {
            key: "satTraining",
            title: home.satTraining.title,
            desc: home.satTraining.desc,
            cta: home.satTraining.cta,
            onClick: navTo("sat-training"),
            variant: "primary",
            extra: null,
          },
          {
            key: "schoolTraining",
            title: (home.schoolTraining && home.schoolTraining.title) || "School Training",
            desc: home.schoolTraining && home.schoolTraining.desc,
            cta: (home.schoolTraining && home.schoolTraining.cta) || home.satTraining.cta,
            onClick: navTo("school-training"),
            variant: "primary",
            extra: null,
          },
          {
            key: "aiEducator",
            title: home.aiEducator.title,
            desc: home.aiEducator.desc,
            cta: canAccessAIEducator ? home.aiEducator.cta : aiLockedLabel,
            onClick: handleAiEducatorClick,
            variant: "primary",
            disabled: !canAccessAIEducator,
            extra: !canAccessAIEducator ? (
              <small style={{ color: "#9ca3af", fontSize: 12 }}>{aiLockedMessage}</small>
            ) : null,
          },
          {
            key: "verify",
            title: home.certificate.title,
            desc: home.certificate.desc,
            cta: home.certificate.cta,
            onClick: navTo("verify-certificate"),
            variant: "primary",
            extra: null,
          },
        ].map((card) => (
          <Card key={card.key}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ marginTop: 0, color: "#111827" }}>{card.title}</h3>
              {card.desc && (
                <p style={{ margin: 0, color: "#6b7280", fontSize: 14, lineHeight: 1.4 }}>
                  {card.desc}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Btn
                  variant={card.variant}
                  onClick={card.onClick}
                  disabled={card.disabled}
                >
                  {card.cta}
                </Btn>
                {card.extra}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
        {t.footer(new Date().getFullYear())}
      </div>
    </PageWrap>
  );
}

