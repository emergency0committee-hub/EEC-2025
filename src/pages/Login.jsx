import React, { useState } from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import { LANGS, STR } from "../i18n/strings.js";
// Local-only auth for now (later: wire to Supabase)

export default function Login({ onNavigate, lang = "EN", setLang }) {
  Login.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
  };
  const t = STR[lang] || STR.EN;

  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    loginId: "",      // username or email (for sign-in)
    email: "",        // email (for sign-up)
    username: "",     // username (for sign-up)
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [errors, setErrors] = useState({});
  const [showDirectAccess, setShowDirectAccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    const loginId = formData.loginId.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;
    const name = formData.name.trim();
    const username = formData.username.trim();
    // Sign-in requires loginId (username or email)
    if (!isSignUp) {
      if (!loginId) newErrors.loginId = "Username or Email is required";
    }

    // Sign-up requires email, username, password, confirm, name
    if (isSignUp) {
      if (!email) newErrors.email = t.emailRequired;
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t.emailInvalid;
      if (!username) newErrors.username = "Username is required";
      else if (!/^[a-zA-Z0-9_\-\.]{3,30}$/.test(username)) newErrors.username = "3–30 chars, letters/digits/_-.";
    }

    if (!password) newErrors.password = t.passwordRequired;
    else if (password.length < 6) newErrors.password = t.passwordTooShort;
    if (isSignUp) {
      if (!name) newErrors.name = t.nameRequired;
      if (!confirmPassword) newErrors.confirmPassword = t.confirmPasswordRequired;
      else if (password !== confirmPassword) newErrors.confirmPassword = t.passwordsDontMatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = validateForm();
    if (!ok) return;
    setLoading(true);
    const loginId = formData.loginId.trim();
    const email = formData.email.trim();
    const username = formData.username.trim();
    const password = formData.password;
    const name = formData.name.trim();
    try {
      let isAdminUser = false;
      if (isSignUp) {
        // Local uniqueness checks
        const users = loadUsers();
        const emailTaken = users.some((u) => (u.email || "").toLowerCase() === email.toLowerCase());
        if (emailTaken) throw new Error("Email already registered");
        const usernameTaken = users.some((u) => (u.username || "").toLowerCase() === username.toLowerCase());
        if (usernameTaken) throw new Error("Username already taken");

        const role = email.toLowerCase() === "anasitani186@gmail.com" ? "admin" : "user";
        const newUser = {
          id: Date.now(),
          email,
          username,
          name,
          role,
          password, // storing plaintext locally; replace with hash when moving to server
          created_at: new Date().toISOString(),
        };
        saveUsers([...users, newUser]);
        saveCurrent({ email, username, name, role });
        isAdminUser = role === "admin";
      } else {
        // Local sign-in using username OR email
        const users = loadUsers();
        const finder = (u) => {
          const lid = loginId.toLowerCase();
          return (u.email || "").toLowerCase() === lid || (u.username || "").toLowerCase() === lid;
        };
        const u = users.find(finder);
        if (!u || u.password !== password) throw new Error("Invalid username or password");
        saveCurrent({ email: u.email, username: u.username, name: u.name, role: u.role });
        if (u.role === "admin") {
          localStorage.setItem("cg_admin_ok_v1", "1");
          isAdminUser = true;
        } else {
          isAdminUser = false;
        }
      }
      // Navigate based on role
      onNavigate(isAdminUser ? "admin-dashboard" : "home");
    } catch (err) {
      const msg = err?.message || String(err);
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setLoading(false);
    }
  };

  // no email confirmation flow

  const HeaderActions = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <LanguageButton lang={lang} setLang={setLang} langs={LANGS} />
    </div>
  );

  return (
    <PageWrap>
      <HeaderBar title={isSignUp ? t.signUpTitle : t.signInTitle} right={HeaderActions} />

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, color: "#111827", textAlign: "center" }}>
              {isSignUp ? t.createAccount : t.welcomeBack}
            </h2>
            <p style={{ margin: "8px 0 0", color: "#6b7280", textAlign: "center" }}>
              {isSignUp ? t.signUpSubtitle : t.signInSubtitle}
            </p>
      </div>

      {/* no confirmation card */}

          {isSignUp && (
            <>
              <Field
                label={t.fullName}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder={t.enterFullName}
                invalid={!!errors.name}
                autoComplete="name"
              />
              {errors.name && (
                <p style={{ color: "#dc2626", fontSize: 14, margin: "4px 0 0" }}>{errors.name}</p>
              )}
              <Field
                label="Username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Choose a username"
                invalid={!!errors.username}
                autoComplete="username"
              />
              {errors.username && (
                <p style={{ color: "#dc2626", fontSize: 14, margin: "4px 0 0" }}>{errors.username}</p>
              )}
            </>
          )}
          {!isSignUp ? (
            <>
              <Field
                label="Username or Email"
                value={formData.loginId}
                onChange={(e) => handleInputChange("loginId", e.target.value)}
                placeholder="Enter your username or email"
                invalid={!!errors.loginId}
                autoComplete="username"
              />
              {errors.loginId && (
                <p style={{ color: "#dc2626", fontSize: 14, margin: "4px 0 0" }}>{errors.loginId}</p>
              )}
            </>
          ) : (
            <>
              <Field
                label={t.email}
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder={t.enterEmail}
                invalid={!!errors.email}
                type="email"
                autoComplete="email"
              />
              {errors.email && (
                <p style={{ color: "#dc2626", fontSize: 14, margin: "4px 0 0" }}>{errors.email}</p>
              )}
            </>
          )}

          <Field
            label={t.password}
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            placeholder={t.enterPassword}
            invalid={!!errors.password}
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
          {errors.password && (
            <p style={{ color: "#dc2626", fontSize: 14, margin: "4px 0 0" }}>{errors.password}</p>
          )}

          {isSignUp && (
            <>
              <Field
                label={t.confirmPassword}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                placeholder={t.confirmYourPassword}
                invalid={!!errors.confirmPassword}
                type="password"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p style={{ color: "#dc2626", fontSize: 14, margin: "4px 0 0" }}>
                  {errors.confirmPassword}
                </p>
              )}
            </>
          )}

          {errors.submit && (
            <p style={{ color: "#dc2626", fontSize: 14, margin: "8px 0 0" }}>{errors.submit}</p>
          )}

          <div style={{ marginTop: 24 }}>
            <Btn
              variant="primary"
              type="submit"
              style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? (isSignUp ? t.signingUp || "Signing up..." : t.signingIn || "Signing in...") : (isSignUp ? t.signUp : t.signIn)}
            </Btn>
          </div>

          <div style={{ marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => onNavigate("home")} style={{ width: "100%" }}>
              {t.backToHome}
            </Btn>
          </div>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: "#4f46e5",
                cursor: "pointer",
                fontSize: 14,
                textDecoration: "underline",
              }}
            >
              {isSignUp ? t.alreadyHaveAccount : t.dontHaveAccount}
            </button>
          </div>
        </form>
      </Card>



      {/* Local-only auth; later wire to Supabase */}
    </PageWrap>
  );
}
  // Local storage helpers
  const LS_USERS = "cg_users_v1";
  const LS_CURRENT_USER = "cg_current_user_v1";
  const loadUsers = () => {
    try {
      const raw = localStorage.getItem(LS_USERS);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };
  const saveUsers = (arr) => {
    try { localStorage.setItem(LS_USERS, JSON.stringify(arr || [])); } catch {}
  };
  const saveCurrent = (u) => { try { localStorage.setItem(LS_CURRENT_USER, JSON.stringify(u)); } catch {} };
