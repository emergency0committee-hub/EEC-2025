// src/pages/Account.jsx
import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";

export default function Account({ onNavigate }) {
  Account.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const LS_USERS = "cg_users_v1";
  const LS_CURRENT_USER = "cg_current_user_v1";
  const loadUsers = () => {
    try { const raw = localStorage.getItem(LS_USERS); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
  };
  const saveUsers = (arr) => { try { localStorage.setItem(LS_USERS, JSON.stringify(arr || [])); } catch {} };
  const loadCurrent = () => {
    try { const raw = localStorage.getItem(LS_CURRENT_USER); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const saveCurrent = (u) => { try { localStorage.setItem(LS_CURRENT_USER, JSON.stringify(u)); } catch {} };

  const users = useMemo(loadUsers, []);
  const current = useMemo(loadCurrent, []);
  const [form, setForm] = useState({
    name: current?.name || "",
    username: current?.username || "",
    email: current?.email || "",
    password: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (!current) {
    return (
      <PageWrap>
        <HeaderBar title="Account" right={null} />
        <Card>
          <p style={{ color: "#6b7280" }}>You are not signed in.</p>
          <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
        </Card>
      </PageWrap>
    );
  }

  const handleChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onSave = () => {
    const errs = {};
    const name = (form.name || "").trim();
    const username = (form.username || "").trim();
    const email = (form.email || "").trim();
    if (!name) errs.name = "Name is required";
    if (!username) errs.username = "Username is required";
    // enforce unique username (case-insensitive)
    const takenUser = users.find((u) => u.username && u.username.toLowerCase() === username.toLowerCase() && u.email !== current.email);
    if (takenUser) errs.username = "Username already taken";
    // Optional password change
    if (form.newPassword || form.confirmNewPassword) {
      if (!form.password) errs.password = "Current password required";
      else {
        const rec = users.find((u) => u.email === current.email);
        if (!rec || rec.password !== form.password) errs.password = "Current password incorrect";
      }
      if (!form.newPassword || form.newPassword.length < 6) errs.newPassword = "New password must be at least 6 characters";
      if (form.newPassword !== form.confirmNewPassword) errs.confirmNewPassword = "Passwords do not match";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const updatedUsers = users.map((u) => {
        if (u.email !== current.email) return u;
        const next = { ...u, name, username };
        if (form.newPassword) next.password = form.newPassword;
        return next;
      });
      saveUsers(updatedUsers);
      const updatedCurrent = { ...current, name, username };
      saveCurrent(updatedCurrent);
      onNavigate("home");
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = () => {
    try {
      localStorage.removeItem(LS_CURRENT_USER);
      localStorage.removeItem("cg_admin_ok_v1");
    } catch {}
    onNavigate("home");
  };

  return (
    <PageWrap>
      <HeaderBar title="Account" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>Profile</h3>
        <Field label="Full Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
        {errors.name && <p style={{ color: "#dc2626", fontSize: 14 }}>{errors.name}</p>}
        <Field label="Username" value={form.username} onChange={(e) => handleChange("username", e.target.value)} />
        {errors.username && <p style={{ color: "#dc2626", fontSize: 14 }}>{errors.username}</p>}
        <Field label="Email" value={form.email} onChange={() => {}} />
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: -6 }}>Email cannot be changed in local mode.</p>
      </Card>
      <Card>
        <h3 style={{ marginTop: 0 }}>Change Password (optional)</h3>
        <Field label="Current Password" value={form.password} onChange={(e) => handleChange("password", e.target.value)} />
        {errors.password && <p style={{ color: "#dc2626", fontSize: 14 }}>{errors.password}</p>}
        <Field label="New Password" value={form.newPassword} onChange={(e) => handleChange("newPassword", e.target.value)} />
        {errors.newPassword && <p style={{ color: "#dc2626", fontSize: 14 }}>{errors.newPassword}</p>}
        <Field label="Confirm New Password" value={form.confirmNewPassword} onChange={(e) => handleChange("confirmNewPassword", e.target.value)} />
        {errors.confirmNewPassword && <p style={{ color: "#dc2626", fontSize: 14 }}>{errors.confirmNewPassword}</p>}
      </Card>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={() => onNavigate("home")}>Cancel</Btn>
        <Btn variant="primary" onClick={onSave} disabled={saving}>Save Changes</Btn>
        <Btn variant="back" onClick={onSignOut}>Sign out</Btn>
      </div>
    </PageWrap>
  );
}

