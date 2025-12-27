// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import UserMenu from "../components/UserMenu.jsx";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import { LANGS_EN as LANGS, STR } from "../i18n/strings.js";
import { supabase } from "../lib/supabase.js";

const HOME_CARDS = {
  EN: {
    career: {
      title: "Career Guidance",
      desc: "Explore your interests and aptitudes with a scenario-based RIASEC test and curated role matches.",
      cta: "Open",
    },
    satDiagnostic: {
      title: "SAT Testing",
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
      desc: "Explorez vos int\u00e9r\u00eats et aptitudes gr\u00e2ce au mod\u00e8le RIASEC et ? des sc\u00e9narios immersifs.",
      cta: "Ouvrir",
    },
    satDiagnostic: {
      title: "Test SAT",
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
      desc: "Confirmez l'authenticit\u00e9 d'un certificat EEC gr\u00e2ce ? son identifiant unique.",
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
  const [satTestingPickerOpen, setSatTestingPickerOpen] = useState(false);
  const isSchoolAccount = (currentUser?.role || "").toLowerCase() === "school";

  const t = STR[lang] || STR.EN;
  const home = HOME_CARDS[lang] || HOME_CARDS.EN;

  const navTo = (nextRoute, data = null) => (event) => onNavigate(nextRoute, data, event);

  const SAT_TESTING_COPY = {
    EN: {
      title: "SAT Testing",
      subtitle: "Choose an option to continue.",
      diagnosticTitle: "Digital SAT Diagnostic Test",
      diagnosticDesc: "Timed, full-length diagnostic with Reading & Writing + Math.",
      readingTitle: "SAT Reading Competition",
      readingDesc: "Reading & Writing only (competition mode).",
      cancel: "Cancel",
    },
    FR: {
      title: "Test SAT",
      subtitle: "Choisissez une option pour continuer.",
      diagnosticTitle: "Diagnostic SAT num\u00e9rique",
      diagnosticDesc: "Diagnostic chronom\u00e9tr\u00e9 avec Lecture & \u00c9criture + Math\u00e9matiques.",
      readingTitle: "Comp\u00e9tition de lecture SAT",
      readingDesc: "Lecture & \u00c9criture uniquement (mode comp\u00e9tition).",
      cancel: "Annuler",
    },
  };
  const satPickerCopy = SAT_TESTING_COPY[lang] || SAT_TESTING_COPY.EN;

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
    if (isSchoolAccount) {
      event?.preventDefault?.();
      return onNavigate("career-dashboard", { school: currentUser?.school || "" }, event);
    }
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

  const handleSatDiagClick = async (event) => {
    // If not logged in, go straight to SAT diagnostic start
    if (!currentUser?.email) {
      return onNavigate("sat", null, event);
    }
    event?.preventDefault?.();
    setCheckingResult(true);
    try {
      const table = import.meta.env.VITE_SAT_RESULTS_TABLE || "sat_diagnostic_submissions";
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_email", currentUser.email)
        .order("ts", { ascending: false })
        .limit(25);
      if (error || !data || !Array.isArray(data)) {
        return onNavigate("sat", null, event);
      }
      const latestDiagnostic = data.find((row) => {
        const type =
          (row?.participant?.test_type || row?.participant?.testType || row?.participant?.sat_test_type || "")
            .toString()
            .trim()
            .toLowerCase();
        return !type || type === "diagnostic";
      });
      if (!latestDiagnostic) {
        return onNavigate("sat", null, event);
      }
      onNavigate("sat-results", { submission: latestDiagnostic });
    } catch (e) {
      console.warn("Failed to check existing SAT result", e);
      onNavigate("sat", null, event);
    } finally {
      setCheckingResult(false);
    }
  };

  const handleSatReadingCompetitionClick = (event) => {
    event?.preventDefault?.();
    setSatTestingPickerOpen(false);
    onNavigate("sat-reading-competition", null, event);
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

      {satTestingPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={satPickerCopy.title}
          onClick={() => setSatTestingPickerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(15, 23, 42, 0.45)",
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 92vw)" }}>
            <Card style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0, marginBottom: 6, color: "#111827" }}>{satPickerCopy.title}</h3>
              <p style={{ marginTop: 0, color: "#6b7280" }}>{satPickerCopy.subtitle}</p>

              <div style={{ display: "grid", gap: 12 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    setSatTestingPickerOpen(false);
                    handleSatDiagClick(e);
                  }}
                  style={{
                    textAlign: "left",
                    border: "1px solid #d1d5db",
                    borderRadius: 12,
                    padding: "14px 16px",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#111827" }}>{satPickerCopy.diagnosticTitle}</div>
                  <div style={{ marginTop: 4, color: "#6b7280", fontSize: 13 }}>{satPickerCopy.diagnosticDesc}</div>
                </button>
                <button
                  type="button"
                  onClick={handleSatReadingCompetitionClick}
                  style={{
                    textAlign: "left",
                    border: "1px solid #d1d5db",
                    borderRadius: 12,
                    padding: "14px 16px",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#111827" }}>{satPickerCopy.readingTitle}</div>
                  <div style={{ marginTop: 4, color: "#6b7280", fontSize: 13 }}>{satPickerCopy.readingDesc}</div>
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <Btn variant="secondary" onClick={() => setSatTestingPickerOpen(false)}>
                  {satPickerCopy.cancel}
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      )}

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
            onClick: (event) => {
              event?.preventDefault?.();
              setSatTestingPickerOpen(true);
            },
            variant: "primary",
            extra: checkingResult ? (
              <small style={{ color: "#9ca3af", fontSize: 12 }}>Checking for existing result...</small>
            ) : null,
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
