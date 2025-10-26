// src/pages/Account.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import PhoneInput from "../components/PhoneInput.jsx";
import Btn from "../components/Btn.jsx";
import { supabase } from "../lib/supabase.js";

export default function Account({ onNavigate }) {
  Account.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const LS_CURRENT_USER = "cg_current_user_v1";
  const saveCurrent = (u) => { try { localStorage.setItem(LS_CURRENT_USER, JSON.stringify(u)); } catch {} };

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // supabase auth user
  const [profile, setProfile] = useState(null); // profiles row
  const [form, setForm] = useState({
  name: "",
  username: "",
  email: "",
  phone: "",
  region: "",
  password: "",
  newPassword: "",
  confirmNewPassword: "",
});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isAdmin = (() => { try { return localStorage.getItem("cg_admin_ok_v1") === "1"; } catch { return false; } })();

  // Access code generator (changes every 30 minutes)
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const windowMs = 30 * 60 * 1000;
  const windowIdx = Math.floor(now / windowMs);
  const msLeft = windowMs - (now % windowMs);
  const mm = Math.floor(msLeft / 60000).toString().padStart(2, "0");
  const ss = Math.floor((msLeft % 60000) / 1000).toString().padStart(2, "0");
  const seed = (import.meta.env.VITE_ACCESS_CODE_SEED || "EEC-SEED").trim();
  function genCode(label) {
    const s = `${seed}|${label}|${windowIdx}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); }
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 1/0/I/O
    let out = ""; let v = Math.abs(h);
    for (let i = 0; i < 6; i++) { out += alphabet[v % alphabet.length]; v = Math.floor(v / alphabet.length) ^ (v << 1); }
    return out;
  }
  const satCode = genCode("SAT");
  const cgCode = genCode("CG");

  // Helpers for flag + dialing code display
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

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUser(user);
        const { data: rows } = await supabase.from("profiles").select("*").eq("id", user.id).limit(1);
        const prof = rows && rows[0];
        setProfile(prof || null);
        setForm((f) => ({
          ...f,
          name: prof?.name || user.user_metadata?.name || "",
          username: prof?.username || user.user_metadata?.username || (user.email ? user.email.split("@")[0] : ""),
          email: user.email || "",
          phone: user.user_metadata?.phone || "",
          region: user.user_metadata?.region || "",
        }));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <PageWrap>
        <HeaderBar title="Account" right={null} />
        <Card><p style={{ color: "#6b7280" }}>Loading account…</p></Card>
      </PageWrap>
    );
  }

  if (!user) {
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
    const phone = (form.phone || "").trim();
    if (!name) errs.name = "Name is required";
    if (!username) errs.username = "Username is required";
    if (!email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Please enter a valid email";
    if (phone && phone.length < 6) errs.phone = "Please enter a valid phone";
    // Optional password change
    if (form.newPassword || form.confirmNewPassword) {
      if (!form.password) errs.password = "Current password required";
      if (!form.newPassword || form.newPassword.length < 6) errs.newPassword = "New password must be at least 6 characters";
      if (form.newPassword !== form.confirmNewPassword) errs.confirmNewPassword = "Passwords do not match";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      // If changing password, verify current by attempting a sign-in
      if (form.newPassword) {
        const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: form.password });
        if (verifyErr) {
          setErrors((e) => ({ ...e, password: "Current password incorrect" }));
          setSaving(false);
          return;
        }
        const { error: updPwErr } = await supabase.auth.updateUser({ password: form.newPassword });
        if (updPwErr) throw updPwErr;
      }

      // Update user metadata (display name from username; store phone)
      {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: { name: (username || name), username, phone, region },
        });
        if (metaErr) throw metaErr;
      }

      // Update email (if changed)
      if (email && email !== (user.email || "")) {
        const { error: updEmailErr } = await supabase.auth.updateUser({ email });
        if (updEmailErr) {
          setErrors((e) => ({ ...e, email: updEmailErr.message || "Could not update email" }));
          setSaving(false);
          return;
        }
      }

      // Update profile (RLS allows own row)
      const { error: updErr } = await supabase.from("profiles").update({ name, username, email }).eq("id", user.id);
      if (updErr) {
        // Unique constraint violation fallback message
        const msg = updErr.message || "";
        if (/unique/i.test(msg) || /duplicate key/i.test(msg)) {
          setErrors((e) => ({ ...e, username: "Username already taken" }));
          setSaving(false);
          return;
        }
        throw updErr;
      }
      // Update local session copy for UI
      const role = profile?.role || (localStorage.getItem("cg_admin_ok_v1") === "1" ? "admin" : "user");
      saveCurrent({ email, name, username, role });
      onNavigate("home");
    } catch (e) {
      console.error(e);
      alert((e && e.message) ? e.message : "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = () => {
    try {
      supabase.auth.signOut();
      localStorage.removeItem(LS_CURRENT_USER);
      localStorage.removeItem("cg_admin_ok_v1");
    } catch {}
    onNavigate("home");
  };

  return (
    <PageWrap>
      <HeaderBar title="Account" right={null} />
      {isAdmin && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Access Codes (auto-rotate every 30 min)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>SAT Diagnostic</div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 20 }}>{satCode}</div>
              <Btn variant="secondary" onClick={() => { navigator.clipboard?.writeText(satCode); }}>Copy</Btn>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Career Guidance</div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 20 }}>{cgCode}</div>
              <Btn variant="secondary" onClick={() => { navigator.clipboard?.writeText(cgCode); }}>Copy</Btn>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Next refresh in</div>
              <div style={{ fontWeight: 700 }}>{mm}:{ss}</div>
            </div>
          </div>
          <p style={{ color: "#6b7280", marginTop: 8, fontSize: 12 }}>Configure seed with VITE_ACCESS_CODE_SEED. Codes are valid within the current 30‑min window.</p>
        </Card>
      )}
      <Card>
        <h3 style={{ marginTop: 0 }}>Profile</h3>
        <Field label="Full Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
        {errors.name && <p style={{ color: "#dc2626", fontSize: 14 }}>{errors.name}</p>}
        <Field label="Username" value={form.username} onChange={(e) => handleChange("username", e.target.value)} />
        {errors.username && <p style={{ color: "#dc2626", fontSize: 14 }}>{errors.username}</p>}
        <Field label="Email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
        {errors.email && <p style={{ color: "#dc2626", fontSize: 14 }}>{errors.email}</p>}
        <PhoneInput
          region={form.region}
          phone={form.phone}
          onChange={({ region, phone }) => setForm((f) => ({ ...f, region, phone }))}
          error={errors.phone}
        />
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






