// src/pages/FeatureIntro.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { useTheme } from "../components/AppProviders.jsx";

const INTRO_COPY = {
  EN: {
    career: {
      title: "Career Guidance",
      subtitle: "Discover your interests and strengths with a short scenario-based assessment.",
      bullets: [
        "RIASEC profile with clear explanations",
        "Top career matches with practical next steps",
        "Downloadable results and shareable summaries",
      ],
      cta: "Start Career Guidance",
      route: "career",
    },
    satTesting: {
      title: "SAT Testing",
      subtitle: "Preview the Digital SAT experience before you begin.",
      bullets: [
        "Timed modules that mirror the official format",
        "Immediate scoring and section breakdowns",
        "Track progress across sessions",
      ],
      cta: "Open SAT Testing",
      route: "sat",
    },
    satTraining: {
      title: "SAT Training",
      subtitle: "Practice skills at your own pace with targeted sets.",
      bullets: [
        "Pick Reading & Writing or Math",
        "Skill-based practice without timers",
        "Review what to study next",
      ],
      cta: "Open SAT Training",
      route: "sat-training",
    },
    schoolTraining: {
      title: "School Training",
      subtitle: "Organize school programs and monitor progress in one place.",
      bullets: [
        "Manage classes and sessions",
        "Track student participation",
        "Keep results organized by school",
      ],
      cta: "Open School Training",
      route: "school-training",
    },
    aiEducator: {
      title: "AI Educator",
      subtitle: "Create interactive lessons and support students with smart feedback.",
      bullets: [
        "Build adaptive learning paths",
        "Analyze student performance quickly",
        "Launch new lessons in minutes",
      ],
      cta: "Continue to AI Educator",
      route: "ai-educator",
    },
    verify: {
      title: "Verify Certificate",
      subtitle: "Confirm EEC certificates using a secure ID check.",
      bullets: [
        "Instant verification results",
        "See program and issue details",
        "Safe for external sharing",
      ],
      cta: "Verify Certificate",
      route: "verify-certificate",
    },
  },
  FR: {
    career: {
      title: "Orientation professionnelle",
      subtitle: "Decouvrez vos interets et forces avec une evaluation courte.",
      bullets: [
        "Profil RIASEC avec explications",
        "Correspondances de carrieres claires",
        "Resultats partageables",
      ],
      cta: "Demarrer l orientation",
      route: "career",
    },
    satTesting: {
      title: "Test SAT",
      subtitle: "Decouvrez le format du SAT numerique avant de commencer.",
      bullets: [
        "Modules chronometres",
        "Score et analyse par section",
        "Suivi de progression",
      ],
      cta: "Ouvrir le test SAT",
      route: "sat",
    },
    satTraining: {
      title: "Entrainement SAT",
      subtitle: "Travaillez les competences a votre rythme.",
      bullets: [
        "Lecture et ecriture ou Math",
        "Exercices sans minuterie",
        "Conseils de revision",
      ],
      cta: "Ouvrir l entrainement",
      route: "sat-training",
    },
    schoolTraining: {
      title: "Formation scolaire",
      subtitle: "Organisez les programmes scolaires et suivez les resultats.",
      bullets: [
        "Gestion des classes",
        "Suivi des participants",
        "Resultats par ecole",
      ],
      cta: "Ouvrir la formation",
      route: "school-training",
    },
    aiEducator: {
      title: "Enseignant IA",
      subtitle: "Creez des lecons interactives avec des retours rapides.",
      bullets: [
        "Parcours adaptes",
        "Analyse des resultats",
        "Nouvelles lecons rapides",
      ],
      cta: "Continuer",
      route: "ai-educator",
    },
    verify: {
      title: "Verifier un certificat",
      subtitle: "Confirmez un certificat EEC avec un identifiant unique.",
      bullets: [
        "Verification instantanee",
        "Details du programme",
        "Partage securise",
      ],
      cta: "Verifier un certificat",
      route: "verify-certificate",
    },
  },
};

export default function FeatureIntro({ onNavigate, feature = "career" }) {
  FeatureIntro.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    feature: PropTypes.string.isRequired,
  };

  const { theme } = useTheme();
  const copySet = INTRO_COPY.EN;
  const entry = copySet[feature] || copySet.career;
  const isDark = theme === "dark";
  const cardStyle = useMemo(
    () => ({
      background: isDark ? "rgba(15, 23, 42, 0.65)" : "#ffffff",
      borderColor: isDark ? "rgba(148, 163, 184, 0.35)" : "#e5e7eb",
    }),
    [isDark]
  );

  return (
    <PageWrap>
      <HeaderBar title={entry.title} right={null} />
      <Card style={cardStyle}>
        <p style={{ marginTop: 0, color: isDark ? "#cbd5f5" : "#4b5563" }}>{entry.subtitle}</p>
        <ul style={{ margin: "0 0 18px", paddingLeft: 18, color: isDark ? "#d1d5db" : "#374151" }}>
          {entry.bullets.map((item) => (
            <li key={item} style={{ marginBottom: 6 }}>{item}</li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="primary" onClick={(e) => onNavigate(entry.route, null, e)}>
            {entry.cta}
          </Btn>
          <Btn variant="secondary" onClick={(e) => onNavigate("home", null, e)}>
            Back to Home
          </Btn>
        </div>
      </Card>
    </PageWrap>
  );
}
