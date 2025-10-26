import React, { useState } from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import { LANGS, STR } from "../i18n/strings.js";
import { supabase } from "../lib/supabase.js";
import PhoneInput from "../components/PhoneInput.jsx";

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
    phone: "",        // phone (for sign-up, stored in auth metadata)
    region: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Minimal flag placeholder (solid color) + dialing code mapping
  function FlagSVG({ r }) {
    const fill = (
      r === "US" ? "#b91c1c" :
      r === "CA" ? "#dc2626" :
      r === "UK" ? "#1e3a8a" :
      r === "EG" ? "#111827" :
      r === "SA" ? "#16a34a" :
      r === "AE" ? "#0ea5e9" :
      r === "JO" ? "#ef4444" :
      r === "LB" ? "#ef4444" : "#9ca3af"
    );
    return (
      <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden>
        <rect x="0" y="0" width="16" height="12" rx="2" fill={fill} />
      </svg>
    );
  }

  const dialCode = (r) => (
    r === "US" || r === "CA" ? "+1" :
    r === "UK" ? "+44" :
    r === "EG" ? "+20" :
    r === "SA" ? "+966" :
    r === "AE" ? "+971" :
    r === "JO" ? "+962" :
    r === "LB" ? "+961" : "+"
  );

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
    const phone = (formData.phone || "").trim();
    const region = (formData.region || "").trim();
    const username = formData.username.trim();
    // Sign-in requires email (works across devices with Supabase Auth)
    if (!isSignUp) {
      if (!loginId) newErrors.loginId = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(loginId)) newErrors.loginId = "Please enter a valid email";
    }

    // Sign-up requires email, username, password, confirm, name
    if (isSignUp) {
      if (!email) newErrors.email = t.emailRequired;
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t.emailInvalid;
      if (!username) newErrors.username = "Username is required";
      if (phone && phone.length < 6) newErrors.phone = "Please enter a valid phone";
      else if (!/^[a-zA-Z0-9_\-\.]{3,30}$/.test(username)) newErrors.username = "3–30 chars, letters/digits/_-.";
    }

    // Normalize username validation message (override any garbled text)
    if (isSignUp) {
      if (!/^[a-zA-Z0-9_\-\.]{3,30}$/.test(username)) {
        newErrors.username = "3–30 chars, letters/digits/_-.";
      }
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
    const phone = (formData.phone || "").trim();
    const region = (formData.region || "").trim();
    const password = formData.password;
    const name = formData.name.trim();
    try {
      let isAdminUser = false;
      if (isSignUp) {
        // Supabase Auth: sign up with email/password
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: (username || name), username, phone, region } },
        });
        if (error) throw error;

        const user = data.user;
        const session = data.session;
        // If confirmations are enabled, session may be null
        if (!session || !user) {
          setErrors((prev) => ({ ...prev, submit: "Check your email to confirm your account, then sign in." }));
          setLoading(false);
          return;
        }
        // Upsert profile with default role
        const role = email.toLowerCase() === "anasitani186@gmail.com" ? "admin" : "user";
        await supabase.from("profiles").upsert({ id: user.id, email, username, name: (username || name), role });
        const current = { email, username, name: (username || name), role };
        try { localStorage.setItem("cg_current_user_v1", JSON.stringify(current)); } catch {}
        if (role === "admin") try { localStorage.setItem("cg_admin_ok_v1", "1"); } catch {}
        isAdminUser = role === "admin";
      } else {
        // Supabase Auth: sign in using email/password
        const { data, error } = await supabase.auth.signInWithPassword({ email: loginId, password });
        if (error) throw new Error("Invalid email or password");
        const user = data.user;
        // Get or create profile
        let profile = null;
        const { data: profRows } = await supabase.from("profiles").select("*").eq("id", user.id).limit(1);
        profile = profRows && profRows[0];
        if (!profile) {
          const role = user.email?.toLowerCase() === "anasitani186@gmail.com" ? "admin" : "user";
          const uname = user.user_metadata?.username || (user.email ? user.email.split("@")[0] : "");
          const nm = user.user_metadata?.name || "";
          await supabase.from("profiles").insert({ id: user.id, email: user.email, username: uname, name: uname, role });
          profile = { email: user.email, username: uname, name: uname, role };
        }
        const current = { email: profile.email, username: profile.username, name: profile.name, role: profile.role };
        try { localStorage.setItem("cg_current_user_v1", JSON.stringify(current)); } catch {}
        if (profile.role === "admin") try { localStorage.setItem("cg_admin_ok_v1", "1"); } catch {}
        isAdminUser = profile.role === "admin";
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
                autoComplete="username" />
              <PhoneInput
                region={formData.region}
                phone={formData.phone}
                onChange={({ region, phone }) => setFormData((s) => ({ ...s, region, phone }))}
                error={errors.phone}
              />
              {errors.username && (
                <p style={{ color: "#dc2626", fontSize: 14, margin: "4px 0 0" }}>{errors.username}</p>
              )}
            </>
          )}
          {!isSignUp ? (
            <>
              <Field
                label="Email"
                value={formData.loginId}
                onChange={(e) => handleInputChange("loginId", e.target.value)}
                placeholder="Enter your email"
                invalid={!!errors.loginId}
                type="email"
                autoComplete="email"
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



      {/* Using Supabase table (no auth) */}
    </PageWrap>
  );
}


