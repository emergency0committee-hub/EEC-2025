// src/pages/About.jsx
import React from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import UserMenu from "../components/UserMenu.jsx";
import { STR, LANGS } from "../i18n/strings.js";

export default function About({ onNavigate, lang = "EN", setLang }) {
  About.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string,
    setLang: PropTypes.func,
  };

  const navTo = (route, data = null) => (event) => onNavigate(route, data, event);
  const t = STR[lang] || STR.EN;

  const TEAM_MEMBERS = [
    {
      name: "Add Team Member Name",
      role: { EN: "Role / Title", FR: "Rôle / Titre" },
      bio: {
        EN: "Short bio (1–2 lines) about this person and what they do at EEC.",
        FR: "Courte bio (1–2 lignes) sur cette personne et son rôle à l’EEC.",
      },
      email: "",
      photo: "",
    },
    {
      name: "Add Team Member Name",
      role: { EN: "Role / Title", FR: "Rôle / Titre" },
      bio: {
        EN: "Short bio (1–2 lines) about this person and what they do at EEC.",
        FR: "Courte bio (1–2 lignes) sur cette personne et son rôle à l’EEC.",
      },
      email: "",
      photo: "",
    },
    {
      name: "Add Team Member Name",
      role: { EN: "Role / Title", FR: "Rôle / Titre" },
      bio: {
        EN: "Short bio (1–2 lines) about this person and what they do at EEC.",
        FR: "Courte bio (1–2 lignes) sur cette personne et son rôle à l’EEC.",
      },
      email: "",
      photo: "",
    },
  ];

  const LOCATIONS = [
    {
      name: { EN: "EEC Office", FR: "Bureau EEC" },
      addressLines: {
        EN: ["Coordinates: 34.44532, 35.82705"],
        FR: ["Coordonnées : 34.44532, 35.82705"],
      },
      hours: { EN: "Mon–Fri, 9:00–17:00", FR: "Lun–Ven, 9:00–17:00" },
      phone: "",
      email: "",
      coords: { lat: 34.44532, lng: 35.82705 },
      mapHref: "https://www.google.com/maps/search/?api=1&query=34.44532%2C35.82705",
    },
  ];

  const initialsFromName = (value) => {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase() || "?";
  };

  const googleEmbedSrcFromCoords = ({ lat, lng }) => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return "";
    const q = `${latNum},${lngNum}`;
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
  };

  const copy = {
    EN: {
      heroTitle: "About Us",
      heroSubtitle:
        "Economic Emergency Committee (EEC) supports schools and learners through assessment and guidance initiatives.",
      missionTitle: "Our Mission",
      missionBody:
        "Add a short mission statement here (2–3 lines) describing EEC’s purpose and impact.",
      peopleTitle: "Our People",
      peopleSubtitle: "Meet the team behind EEC’s programs and tools.",
      locationTitle: "Our Location",
      locationSubtitle: "Find us and get in touch.",
      contactTitle: "Contact",
      websiteLabel: "Website",
      backHome: "Back Home",
      openMap: "Open Map",
    },
    FR: {
      heroTitle: "À propos de nous",
      heroSubtitle:
        "Economic Emergency Committee (EEC) soutient les écoles et les apprenants grâce à des initiatives d’évaluation et d’orientation.",
      missionTitle: "Notre mission",
      missionBody:
        "Ajoutez ici une courte mission (2–3 lignes) décrivant l’objectif et l’impact de l’EEC.",
      peopleTitle: "Notre équipe",
      peopleSubtitle: "Découvrez l’équipe derrière les programmes et outils de l’EEC.",
      locationTitle: "Notre localisation",
      locationSubtitle: "Où nous trouver et comment nous contacter.",
      contactTitle: "Contact",
      websiteLabel: "Site web",
      backHome: "Retour à l’accueil",
      openMap: "Ouvrir la carte",
    },
  };
  const ui = copy[String(lang || "EN").toUpperCase()] || copy.EN;

  return (
    <PageWrap>
      <HeaderBar
        lang={lang}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/EEC_Logo.png" alt="Logo" style={{ height: 40, width: "auto" }} />
            <span style={{ fontWeight: 600, fontSize: 18 }}>EEC</span>
          </div>
        }
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Btn variant="link" to="home" onClick={navTo("home")}>
                {t.navHome}
              </Btn>
              <Btn variant="link" to="about" onClick={navTo("about")}>
                {t.navAbout}
              </Btn>
              <Btn variant="link" to="blogs" onClick={navTo("blogs")}>
                {t.navBlogs}
              </Btn>
            </nav>
            {typeof setLang === "function" ? (
              <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />
            ) : null}
            <UserMenu onNavigate={onNavigate} lang={lang} />
          </div>
        }
      />

      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 28 }}>{ui.heroTitle}</h1>
            <p style={{ margin: "10px 0 0", color: "#4b5563", fontSize: 16 }}>{ui.heroSubtitle}</p>
          </div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #f8fafc 100%)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>{ui.missionTitle}</div>
            <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5 }}>{ui.missionBody}</div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="back" onClick={navTo("home")}>
            {ui.backHome}
          </Btn>
          <Btn variant="secondary" href="https://www.eecommittee.org/" target="_blank" rel="noreferrer">
            {ui.websiteLabel}
          </Btn>
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <h3 style={{ margin: "0 0 6px", color: "#111827", fontSize: 18 }}>{ui.peopleTitle}</h3>
        <div style={{ color: "#4b5563", fontSize: 14, marginBottom: 14 }}>{ui.peopleSubtitle}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {TEAM_MEMBERS.map((m, idx) => {
            const roleText = m?.role?.[String(lang || "EN").toUpperCase()] || m?.role?.EN || "";
            const bioText = m?.bio?.[String(lang || "EN").toUpperCase()] || m?.bio?.EN || "";
            const hasPhoto = Boolean(String(m.photo || "").trim());
            return (
              <div
                key={`${m.name}-${idx}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  background: "#ffffff",
                  display: "grid",
                  gridTemplateColumns: "44px 1fr",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: "#e0f2fe",
                    color: "#0c4a6e",
                    fontWeight: 800,
                    display: "grid",
                    placeItems: "center",
                    overflow: "hidden",
                    border: "1px solid #bae6fd",
                  }}
                >
                  {hasPhoto ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    initialsFromName(m.name)
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>{m.name}</div>
                  <div style={{ color: "#475569", fontSize: 13, marginTop: 2 }}>{roleText}</div>
                  <div style={{ color: "#4b5563", fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>{bioText}</div>
                  {m.email ? (
                    <div style={{ marginTop: 10 }}>
                      <Btn variant="link" href={`mailto:${m.email}`} style={{ padding: 0 }}>
                        {m.email}
                      </Btn>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <h3 style={{ margin: "0 0 6px", color: "#111827", fontSize: 18 }}>{ui.locationTitle}</h3>
        <div style={{ color: "#4b5563", fontSize: 14, marginBottom: 14 }}>{ui.locationSubtitle}</div>
        <div style={{ display: "grid", gap: 12 }}>
          {LOCATIONS.map((loc, idx) => {
            const locName = loc?.name?.[String(lang || "EN").toUpperCase()] || loc?.name?.EN || "";
            const lines =
              loc?.addressLines?.[String(lang || "EN").toUpperCase()] || loc?.addressLines?.EN || [];
            const hours = loc?.hours?.[String(lang || "EN").toUpperCase()] || loc?.hours?.EN || "";
            const hasMap = Boolean(String(loc?.mapHref || "").trim());
            const embedSrc = loc?.coords ? googleEmbedSrcFromCoords(loc.coords) : "";
            return (
              <div
                key={`${locName}-${idx}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  background: "#ffffff",
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: "#111827", marginBottom: 8 }}>{locName}</div>
                  <div style={{ color: "#4b5563", fontSize: 14, lineHeight: 1.6 }}>
                    {Array.isArray(lines) ? lines.map((l) => <div key={l}>{l}</div>) : null}
                  </div>
                  {hours ? (
                    <div style={{ marginTop: 10, color: "#475569", fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>Hours:</span> {hours}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    {loc.phone ? (
                      <div style={{ color: "#374151", fontSize: 14 }}>
                        <span style={{ fontWeight: 700 }}>Phone:</span>{" "}
                        <Btn variant="link" href={`tel:${loc.phone}`} style={{ padding: 0 }}>
                          {loc.phone}
                        </Btn>
                      </div>
                    ) : null}
                    {loc.email ? (
                      <div style={{ color: "#374151", fontSize: 14 }}>
                        <span style={{ fontWeight: 700 }}>Email:</span>{" "}
                        <Btn variant="link" href={`mailto:${loc.email}`} style={{ padding: 0 }}>
                          {loc.email}
                        </Btn>
                      </div>
                    ) : null}
                  </div>
                  {hasMap ? (
                    <Btn variant="secondary" href={loc.mapHref} target="_blank" rel="noreferrer">
                      {ui.openMap}
                    </Btn>
                  ) : null}
                </div>
                {embedSrc ? (
                  <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
                    <div
                      style={{
                        width: "100%",
                        height: 260,
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                        background: "#f8fafc",
                      }}
                    >
                      <iframe
                        title={`${locName} map`}
                        src={embedSrc}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", border: 0 }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </PageWrap>
  );
}
