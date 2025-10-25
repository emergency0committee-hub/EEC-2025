// src/pages/Account.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { supabase } from "../lib/supabase.js";
import { hashPassword } from "../lib/hash.js";

export default function Account({ onNavigate }) {
  Account.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const LS_CURRENT_USER = "cg_current_user_v1";
  const loadCurrent = () => {
    try { const raw = localStorage.getItem(LS_CURRENT_USER); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const saveCurrent = (u) => { try { localStorage.setItem(LS_CURRENT_USER, JSON.stringify(u)); } catch {} };
  const current = loadCurrent();
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

  const onSave = async () => {
    const errs = {};
    const name = (form.name || "").trim();
    const username = (form.username || "").trim();
    const email = (form.email || "").trim();
    if (!name) errs.name = "Name is required";
    if (!username) errs.username = "Username is required";
    // enforce unique username (case-insensitive) in Supabase
    try {
      const table = import.meta.env.VITE_USERS_TABLE || "app_users";
      const { data: exists } = await supabase
        .from(table)
        .select("email")
        .ilike("username", username)
        .limit(1);
      if (exists && exists.length && exists[0].email.toLowerCase() !== email.toLowerCase()) {
        errs.username = "Username already taken";
      }
    } catch {}
    // Optional password change
    if (form.newPassword || form.confirmNewPassword) {
      if (!form.password) errs.password = "Current password required";
      // verify against Supabase stored hash
    if (!form.newPassword || form.newPassword.length < 6) errs.newPassword = "New password must be at least 6 characters";
    if (form.newPassword !== form.confirmNewPassword) errs.confirmNewPassword = "Passwords do not match";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const table = import.meta.env.VITE_USERS_TABLE || "app_users";
      // Fetch current row
      const { data: rows, error: selErr } = await supabase
        .from(table)
        .select("*")
        .ilike("email", email)
        .limit(1);
      if (selErr) throw selErr;
      const row = rows && rows[0];
      if (!row) throw new Error("Account not found.");
      // verify current password if changing
      if (form.newPassword) {
        const candidate = await hashPassword(form.password || "");
        if (!row.password_hash || row.password_hash !== candidate) {
          setErrors((e) => ({ ...e, password: "Current password incorrect" }));
          setSaving(false);
          return;
        }
      }
      const patch = { name, username };
      if (form.newPassword) patch.password_hash = await hashPassword(form.newPassword);
      const { error: updErr } = await supabase.from(table).update(patch).eq("email", email);
      if (updErr) throw updErr;
      // Update local session
      saveCurrent({ ...current, name, username });
      onNavigate("home");
    } catch (e) {
      console.error(e);
      alert("Failed to save changes. Please try again.");
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
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: -6 }}>Email cannot be changed.</p>
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
