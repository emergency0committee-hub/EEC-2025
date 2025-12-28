// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import UserMenu from "../components/UserMenu.jsx";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import { LANGS_EN as LANGS, STR } from "../i18n/strings.js";
import { supabase } from "../lib/supabase.js";

const PROFILE_AVATAR_BUCKET = "profile-avatars";
const MAX_PROFILE_AVATAR_MB = 3;

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

const PROFILE_PROMPT_COPY = {
  EN: {
    title: "Complete your profile",
    subtitle: "Please fill the missing details to continue.",
    nameLabel: "Full name",
    phoneLabel: "Phone",
    schoolLabel: "School",
    classLabel: "Class",
    avatarLabel: "Profile photo",
    avatarHelper: "Upload a clear photo. Max {max}MB.",
    avatarInvalid: "Please choose an image file.",
    avatarTooLarge: "Image must be {max}MB or smaller.",
    required: "This field is required.",
    avatarRequired: "Profile photo is required.",
    save: "Save",
    saving: "Saving...",
    later: "Later",
  },
  FR: {
    title: "Compl\u00e9ter votre profil",
    subtitle: "Merci de renseigner les informations manquantes.",
    nameLabel: "Nom complet",
    phoneLabel: "T\u00e9l\u00e9phone",
    schoolLabel: "\u00c9tablissement",
    classLabel: "Classe",
    avatarLabel: "Photo de profil",
    avatarHelper: "T\u00e9l\u00e9versez une photo claire. Max {max} Mo.",
    avatarInvalid: "Veuillez choisir un fichier image.",
    avatarTooLarge: "L'image doit faire {max} Mo ou moins.",
    required: "Ce champ est obligatoire.",
    avatarRequired: "La photo de profil est obligatoire.",
    save: "Enregistrer",
    saving: "Enregistrement...",
    later: "Plus tard",
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
  const [profilePromptOpen, setProfilePromptOpen] = useState(false);
  const [profilePromptDismissed, setProfilePromptDismissed] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    phone: "",
    school: "",
    class_name: "",
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState("");
  const [profileAvatarError, setProfileAvatarError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const isSchoolAccount = (currentUser?.role || "").toLowerCase() === "school";

  const t = STR[lang] || STR.EN;
  const home = HOME_CARDS[lang] || HOME_CARDS.EN;
  const promptCopy = PROFILE_PROMPT_COPY[lang] || PROFILE_PROMPT_COPY.EN;
  const promptAvatarHelper = promptCopy.avatarHelper.replace("{max}", MAX_PROFILE_AVATAR_MB);
  const timeFormatter = useMemo(() => {
    const locale = lang === "FR" ? "fr-FR" : "en-US";
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  }, [lang]);
  const timeParts = useMemo(() => {
    const parts = timeFormatter.formatToParts(now);
    const hour = parts.find((part) => part.type === "hour")?.value || "";
    const minute = parts.find((part) => part.type === "minute")?.value || "";
    const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value || "";
    return { hour, minute, dayPeriod };
  }, [timeFormatter, now]);
  const showColon = now.getSeconds() % 2 === 0;

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
  const profileErrorStyle = { color: "#dc2626", fontSize: 12, margin: "4px 0 0" };
  const displayName = (currentUser?.name || currentUser?.username || "").trim();
  const welcomeText = displayName
    ? (t.homeWelcomeName || t.homeWelcome || "").replace("{name}", displayName)
    : t.homeWelcome;
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "";

  const handleAiEducatorClick = canAccessAIEducator
    ? navTo("ai-educator")
    : (event) => {
        event?.preventDefault?.();
        if (typeof window !== "undefined" && typeof window.alert === "function") {
          window.alert(aiLockedMessage);
        }
      };

  useEffect(() => {
    let active = true;
    const loadCurrentUser = async () => {
      try {
        const raw = localStorage.getItem("cg_current_user_v1");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed?.email) return;
        if (active) setCurrentUser(parsed);
        if (parsed?.id) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id,email,username,name,avatar_url,role,school,class_name,phone,ai_access")
            .eq("id", parsed.id)
            .single();
          if (!error && data && active) {
            const merged = { ...parsed, ...data };
            setCurrentUser(merged);
            try { localStorage.setItem("cg_current_user_v1", JSON.stringify(merged)); } catch {}
          }
        }
      } catch (e) {
        console.warn("Failed to read current user", e);
      }
    };
    loadCurrentUser();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setProfilePromptOpen(false);
        setProfilePromptDismissed(false);
      }
    });
    return () => {
      authSub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setProfileDraft({
      name: currentUser.name || "",
      phone: currentUser.phone || "",
      school: currentUser.school || "",
      class_name: currentUser.class_name || "",
    });
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
    };
  }, [profileAvatarPreview]);

  const normalizedRole = (currentUser?.role || "").toLowerCase();
  const needsSchool = ["student", "educator", "school"].includes(normalizedRole);
  const needsClass = normalizedRole === "student";
  const missingMap = useMemo(() => {
    return {
      avatar: !currentUser?.avatar_url,
      name: !currentUser?.name || !currentUser.name.trim(),
      phone: !currentUser?.phone || !String(currentUser.phone).trim(),
      school: needsSchool && (!currentUser?.school || !String(currentUser.school).trim()),
      class_name: needsClass && (!currentUser?.class_name || !String(currentUser.class_name).trim()),
    };
  }, [currentUser, needsSchool, needsClass]);
  const missingKeys = Object.keys(missingMap).filter((key) => missingMap[key]);
  const shouldPrompt = Boolean(currentUser?.email && missingKeys.length > 0);

  useEffect(() => {
    if (!shouldPrompt || profilePromptDismissed) return;
    setProfilePromptOpen(true);
  }, [shouldPrompt, profilePromptDismissed]);

  useEffect(() => {
    if (!shouldPrompt) setProfilePromptDismissed(false);
  }, [shouldPrompt]);

  const handleProfileDraftChange = (field, value) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) setProfileErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleProfileAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileAvatarError(promptCopy.avatarInvalid);
      setProfileErrors((prev) => ({ ...prev, avatar: promptCopy.avatarInvalid }));
      return;
    }
    if (file.size > MAX_PROFILE_AVATAR_MB * 1024 * 1024) {
      const msg = promptCopy.avatarTooLarge.replace("{max}", MAX_PROFILE_AVATAR_MB);
      setProfileAvatarError(msg);
      setProfileErrors((prev) => ({ ...prev, avatar: msg }));
      return;
    }
    setProfileAvatarError("");
    setProfileErrors((prev) => ({ ...prev, avatar: "" }));
    if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
    setProfileAvatarPreview(URL.createObjectURL(file));
    setProfileAvatarFile(file);
  };

  const handleProfileSave = async () => {
    if (!currentUser?.email) return;
    const nextErrors = {};
    if (!profileDraft.name.trim()) nextErrors.name = promptCopy.required;
    if (!profileDraft.phone.trim()) nextErrors.phone = promptCopy.required;
    if (needsSchool && !profileDraft.school.trim()) nextErrors.school = promptCopy.required;
    if (needsClass && !profileDraft.class_name.trim()) nextErrors.class_name = promptCopy.required;
    if (missingMap.avatar && !profileAvatarFile && !currentUser?.avatar_url) {
      nextErrors.avatar = promptCopy.avatarRequired;
    }
    if (profileAvatarError) nextErrors.avatar = profileAvatarError;
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setProfileSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authId = userData?.user?.id || currentUser?.id;
      if (!authId) throw new Error("Missing user session.");

      let avatarUrl = currentUser?.avatar_url || "";
      if (profileAvatarFile) {
        const path = `${authId}/avatar`;
        const { error: uploadError } = await supabase.storage
          .from(PROFILE_AVATAR_BUCKET)
          .upload(path, profileAvatarFile, {
            upsert: true,
            cacheControl: "3600",
            contentType: profileAvatarFile.type || "image/*",
          });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(path);
        avatarUrl = publicData?.publicUrl || avatarUrl;
      }

      const updatePayload = {
        name: profileDraft.name.trim(),
        phone: profileDraft.phone.trim(),
        school: needsSchool ? profileDraft.school.trim() : null,
        class_name: needsClass ? profileDraft.class_name.trim() : null,
        avatar_url: avatarUrl || null,
      };
      const { error: updateError } = await supabase.from("profiles").update(updatePayload).eq("id", authId);
      if (updateError) throw updateError;

      const updatedUser = { ...currentUser, ...updatePayload, avatar_url: avatarUrl || currentUser?.avatar_url };
      setCurrentUser(updatedUser);
      try { localStorage.setItem("cg_current_user_v1", JSON.stringify(updatedUser)); } catch {}
      setProfilePromptOpen(false);
      setProfilePromptDismissed(false);
      if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
      setProfileAvatarPreview("");
      setProfileAvatarFile(null);
    } catch (err) {
      setProfileErrors((prev) => ({ ...prev, submit: err?.message || String(err) }));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileLater = () => {
    setProfilePromptOpen(false);
    setProfilePromptDismissed(true);
    if (profileAvatarPreview) URL.revokeObjectURL(profileAvatarPreview);
    setProfileAvatarPreview("");
    setProfileAvatarFile(null);
    setProfileErrors({});
  };

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

      {profilePromptOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={promptCopy.title}
          onClick={handleProfileLater}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(15, 23, 42, 0.55)",
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px, 94vw)" }}>
            <Card style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0, marginBottom: 6, color: "#111827" }}>{promptCopy.title}</h3>
              <p style={{ marginTop: 0, color: "#6b7280" }}>{promptCopy.subtitle}</p>

              <div style={{ display: "grid", gap: 14 }}>
                {missingMap.avatar && (
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                        background: "#ffffff",
                        display: "grid",
                        placeItems: "center",
                        color: "#94a3b8",
                        fontSize: 12,
                      }}
                    >
                      {profileAvatarPreview || currentUser?.avatar_url ? (
                        <img
                          src={profileAvatarPreview || currentUser?.avatar_url}
                          alt={promptCopy.avatarLabel}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        "No photo"
                      )}
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                        {promptCopy.avatarLabel}
                      </label>
                      <input type="file" accept="image/*" onChange={handleProfileAvatarChange} />
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{promptAvatarHelper}</div>
                      {profileErrors.avatar && <p style={profileErrorStyle}>{profileErrors.avatar}</p>}
                    </div>
                  </div>
                )}

                {missingMap.name && (
                  <div>
                    <Field
                      label={promptCopy.nameLabel}
                      value={profileDraft.name}
                      onChange={(e) => handleProfileDraftChange("name", e.target.value)}
                      placeholder={promptCopy.nameLabel}
                      invalid={!!profileErrors.name}
                      name="profile-name"
                    />
                    {profileErrors.name && <p style={profileErrorStyle}>{profileErrors.name}</p>}
                  </div>
                )}

                {missingMap.phone && (
                  <div>
                    <Field
                      label={promptCopy.phoneLabel}
                      value={profileDraft.phone}
                      onChange={(e) => handleProfileDraftChange("phone", e.target.value)}
                      placeholder={promptCopy.phoneLabel}
                      invalid={!!profileErrors.phone}
                      name="profile-phone"
                    />
                    {profileErrors.phone && <p style={profileErrorStyle}>{profileErrors.phone}</p>}
                  </div>
                )}

                {missingMap.school && (
                  <div>
                    <Field
                      label={promptCopy.schoolLabel}
                      value={profileDraft.school}
                      onChange={(e) => handleProfileDraftChange("school", e.target.value)}
                      placeholder={promptCopy.schoolLabel}
                      invalid={!!profileErrors.school}
                      name="profile-school"
                    />
                    {profileErrors.school && <p style={profileErrorStyle}>{profileErrors.school}</p>}
                  </div>
                )}

                {missingMap.class_name && (
                  <div>
                    <Field
                      label={promptCopy.classLabel}
                      value={profileDraft.class_name}
                      onChange={(e) => handleProfileDraftChange("class_name", e.target.value)}
                      placeholder={promptCopy.classLabel}
                      invalid={!!profileErrors.class_name}
                      name="profile-class"
                    />
                    {profileErrors.class_name && <p style={profileErrorStyle}>{profileErrors.class_name}</p>}
                  </div>
                )}

                {profileErrors.submit && <p style={profileErrorStyle}>{profileErrors.submit}</p>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <Btn variant="secondary" onClick={handleProfileLater} disabled={profileSaving}>
                  {promptCopy.later}
                </Btn>
                <Btn variant="primary" onClick={handleProfileSave} disabled={profileSaving}>
                  {profileSaving ? promptCopy.saving : promptCopy.save}
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {currentUser?.email ? (
              currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={displayName || "Profile"}
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  aria-label="Profile"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#e2e8f0",
                    color: "#475569",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  {initials || "?"}
                </div>
              )
            ) : (
              <img src="/EEC_Logo.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "contain" }} />
            )}
            <div>
              <h2 style={{ margin: 0, color: "#111827" }}>{currentUser?.email ? welcomeText : t.homeWelcome}</h2>
            </div>
          </div>
          <div
            aria-label="Current time"
            style={{
              fontWeight: 600,
              color: "#64748b",
              fontSize: "inherit",
              letterSpacing: "normal",
              whiteSpace: "nowrap",
            }}
          >
            <span>{timeParts.hour}</span>
            <span style={{ opacity: showColon ? 1 : 0, transition: "opacity 0.2s linear" }}>:</span>
            <span>{timeParts.minute}</span>
            {timeParts.dayPeriod ? <span> {timeParts.dayPeriod}</span> : null}
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
