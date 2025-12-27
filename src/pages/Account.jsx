// src/pages/Account.jsx
import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card, Field } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { supabase } from "../lib/supabase.js";
import { makeQrDataUrl } from "../lib/qrCode.js";

export default function Account({ onNavigate }) {
  Account.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const navTo = (route, data = null) => (event) => onNavigate(route, data, event);

  const LS_CURRENT_USER = "cg_current_user_v1";
  const saveCurrent = (updates) => {
    try {
      const raw = localStorage.getItem(LS_CURRENT_USER);
      const existing = raw ? JSON.parse(raw) : {};
      const merged = { ...existing, ...updates };
      delete merged.position;
      localStorage.setItem(LS_CURRENT_USER, JSON.stringify(merged));
    } catch {}
  };

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // supabase auth user
  const [profile, setProfile] = useState(null); // profiles row
  const [form, setForm] = useState({
  name: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  newPassword: "",
  confirmNewPassword: "",
});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isAdmin = (() => { try { return localStorage.getItem("cg_admin_ok_v1") === "1"; } catch { return false; } })();

  // Access code generator (manual refresh)
  const [refreshingCodes, setRefreshingCodes] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codesLoading, setCodesLoading] = useState(true);
  const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const CODE_LENGTH = 12;
  const makeCode = () => {
    let raw = "";
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const buf = new Uint32Array(CODE_LENGTH);
      crypto.getRandomValues(buf);
      raw = Array.from(buf, (val) => CODE_ALPHABET[val % CODE_ALPHABET.length]).join("");
    } else {
      raw = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
    }
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  };
  const [codes, setCodes] = useState({ sat: "—", cg: "—", reading: "—" });
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const fetchCodes = useCallback(async () => {
    setCodesLoading(true);
    try {
      const { data, error } = await supabase
        .from("access_codes")
        .select("purpose, code")
        .in("purpose", ["sat", "career", "reading_competition"]);
      if (error) throw error;
      const next = { sat: "—", cg: "—", reading: "—" };
      (data || []).forEach((row) => {
        const value = (row.code || "").trim();
        if (row.purpose === "sat") next.sat = value || "—";
        if (row.purpose === "career") next.cg = value || "—";
        if (row.purpose === "reading_competition") next.reading = value || "—";
      });
      setCodes(next);
      setCodeError("");
    } catch (err) {
      console.error("load access codes", err);
      setCodeError((prev) => prev || "Unable to load current codes. Please try again.");
    } finally {
      setCodesLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);
  const handleRefreshCodes = async () => {
    setCodeError("");
    setRefreshingCodes(true);
    const rows = [
      { purpose: "sat", code: makeCode(), updated_by: user?.id || null },
      { purpose: "career", code: makeCode(), updated_by: user?.id || null },
      { purpose: "reading_competition", code: makeCode(), updated_by: user?.id || null },
    ];
    try {
      const { error } = await supabase.from("access_codes").upsert(rows);
      if (error) throw error;
      await fetchCodes();
    } catch (err) {
      console.error("refresh access codes", err);
      setCodeError(err?.message || "Unable to refresh codes. Please try again.");
    } finally {
      setRefreshingCodes(false);
    }
  };

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
          phone: prof?.phone || user.user_metadata?.phone || "",
        }));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setQrDataUrl("");
      setQrError("");
      return undefined;
    }
    setQrLoading(true);
    makeQrDataUrl(user.id, 180)
      .then((url) => {
        if (!active) return;
        setQrDataUrl(url);
        setQrError("");
      })
      .catch(() => {
        if (!active) return;
        setQrError("Unable to generate QR code.");
        setQrDataUrl("");
      })
      .finally(() => {
        if (active) setQrLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

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
          <Btn variant="primary" to="login" onClick={navTo("login")}>Go to Login</Btn>
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
          data: { name: (username || name), username, phone },
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
      const { error: updErr } = await supabase.from("profiles").update({ name, username, email, phone }).eq("id", user.id);
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
      setProfile((prev) => ({ ...(prev || {}), name, username, email, phone }));
      // Update local session copy for UI
      const role = profile?.role || (localStorage.getItem("cg_admin_ok_v1") === "1" ? "admin" : "user");
      saveCurrent({ id: user.id, email, name, username, phone, role });
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
      <HeaderBar
        title="Account"
        right={
          <Btn variant="back" onClick={() => onNavigate("home")}>
            Back to Home
          </Btn>
        }
      />
      {isAdmin && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Access Codes</h3>
            <Btn variant="secondary" onClick={handleRefreshCodes} disabled={refreshingCodes || codesLoading}>
              {refreshingCodes ? "Refreshing..." : "Refresh"}
            </Btn>
          </div>
          {codeError && (
            <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{codeError}</p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>SAT Diagnostic</div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 20 }}>{codesLoading ? "…" : codes.sat}</div>
              <Btn
                variant="secondary"
                onClick={() => { if (!codesLoading) navigator.clipboard?.writeText(codes.sat); }}
                disabled={codesLoading}
                style={{ marginTop: 8 }}
              >
                Copy
              </Btn>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>SAT Reading Competition</div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 20 }}>{codesLoading ? "…" : codes.reading}</div>
              <Btn
                variant="secondary"
                onClick={() => { if (!codesLoading) navigator.clipboard?.writeText(codes.reading); }}
                disabled={codesLoading}
                style={{ marginTop: 8 }}
              >
                Copy
              </Btn>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Career Guidance</div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 20 }}>{codesLoading ? "…" : codes.cg}</div>
              <Btn
                variant="secondary"
                onClick={() => { if (!codesLoading) navigator.clipboard?.writeText(codes.cg); }}
                disabled={codesLoading}
                style={{ marginTop: 8 }}
              >
                Copy
              </Btn>
            </div>
          </div>
          <p style={{ color: "#6b7280", marginTop: 8, fontSize: 12 }}>
            Click refresh whenever you need a new set of codes to share.
          </p>
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
        <Field label="Phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
        {errors.phone && <p style={{ color: "#dc2626", fontSize: 14 }}>{errors.phone}</p>}
      </Card>
      <Card>
        <h3 style={{ marginTop: 0 }}>Competition QR</h3>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Show this QR code to staff during the SAT Reading Competition check-in.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Competition QR code" style={{ width: 160, height: 160 }} />
          ) : (
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 12,
                border: "1px dashed #cbd5f5",
                display: "grid",
                placeItems: "center",
                color: "#64748b",
                background: "#f8fafc",
              }}
            >
              QR unavailable
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, color: "#111827" }}>User ID</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>{user.id}</div>
            {qrLoading && <div style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>Generating...</div>}
            {qrError && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{qrError}</div>}
          </div>
        </div>
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
        <Btn variant="secondary" to="home" onClick={navTo("home")}>Cancel</Btn>
        <Btn variant="primary" onClick={onSave} disabled={saving}>Save Changes</Btn>
        <Btn variant="back" onClick={onSignOut}>Sign out</Btn>
      </div>
    </PageWrap>
  );
}








