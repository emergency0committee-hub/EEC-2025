import React, { useState } from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import LanguageButton from "../components/LanguageButton.jsx";
import { LANGS, STR } from "../i18n/strings.js";

export default function Login({ onNavigate, lang = "EN", setLang }) {
  Login.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
  };
  const t = STR[lang] || STR.EN;

  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;
    const name = formData.name.trim();

    if (!email) newErrors.email = t.emailRequired;
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t.emailInvalid;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    // trim some fields before validating/submitting
    setFormData((prev) => ({
      ...prev,
      email: prev.email.trim(),
      name: prev.name.trim(),
    }));

    // Check for admin password first
    if (formData.password === "careeradmin123") {
      localStorage.setItem("cg_admin_ok_v1", "1");
      onNavigate("admin");
      return;
    }

    if (validateForm()) {
      setErrors({ password: "Invalid password" });
    }
  };

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
            </>
          )}

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

          <div style={{ marginTop: 24 }}>
            <Btn variant="primary" type="submit" style={{ width: "100%" }}>
              {isSignUp ? t.signUp : t.signIn}
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

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Btn variant="secondary" onClick={() => onNavigate("home")}>
          {t.backToHome}
        </Btn>
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={() => {
            localStorage.setItem("cg_admin_ok_v1", "1");
            onNavigate("admin");
          }}
          style={{
            background: "none",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: 14,
            color: "#6b7280",
          }}
        >
          Access Admin Directly (for testing)
        </button>
      </div>
    </PageWrap>
  );
}
