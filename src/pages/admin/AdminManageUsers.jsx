// src/pages/admin/AdminManageUsers.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import UserMenu from "../../components/UserMenu.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";
import { makeQrDataUrl } from "../../lib/qrCode.js";

const COPY = {
  EN: {
    title: "Manage Users",
    subtitle: "Search for a user, adjust their role, or reset their password.",
    searchLabel: "Select School",
    searchPlaceholder: "Choose a school",
    roleLabel: "Role",
    roleHint: "Users with the Admin role can access the question bank.",
    aiAccessLabel: "AI Educator Access",
    aiAccessHint: "Grant access to the AI Educator experience for approved educators only.",
    aiAccessButton: "Save AI Access",
    aiAccessSaved: "AI access updated.",
    passwordLabel: "New Password",
    passwordPlaceholder: "Enter new password",
    passwordButton: "Update Password",
    roleButton: "Save Role",
    loading: "Loading users...",
    empty: "No users found.",
    error: "Failed to load users.",
    roleSaved: "Role updated.",
    passwordSaved: "Password updated.",
    refresh: "Refresh",
    searchClear: "Clear selection",
    adminOnly: "Administrators only.",
  },
  AR: {
    title: "????? ??????????",
    subtitle: "???? ?? ????????? ???? ???? ?? ??? ????? ???? ??????.",
    searchLabel: "?????? ??????",
    searchPlaceholder: "???? ???????",
    roleLabel: "?????",
    roleHint: "?????????? ???? Admin ?????? ?????? ??? ??? ???????.",
    aiAccessLabel: "?????? AI Educator",
    aiAccessHint: "???? ????? ??????? ??????? ???????? ???? ???? ???????.",
    aiAccessButton: "????? ?????? AI",
    aiAccessSaved: "?? ????? ?????? AI.",
    passwordLabel: "???? ???? ?????",
    passwordPlaceholder: "???? ???? ???? ?????",
    passwordButton: "????? ???? ??????",
    roleButton: "??? ?????",
    loading: "???? ????? ??????????...",
    empty: "?? ???? ????????.",
    error: "????? ????? ??????????.",
    roleSaved: "?? ????? ?????.",
    passwordSaved: "?? ????? ???? ??????.",
    refresh: "?????",
    searchClear: "??? ????????",
    adminOnly: "????? ??? ?????????.",
  },
  FR: {
    title: "Gérer les utilisateurs",
    subtitle: "Recherchez un utilisateur, ajustez son rôle ou réinitialisez son mot de passe.",
    aiAccessLabel: "Acc?s AI Educator",
    aiAccessHint: "Autorisez cet enseignant ? utiliser l'espace AI Educator.",
    aiAccessButton: "Enregistrer l'acc?s AI",
    aiAccessSaved: "Acc?s AI mis ? jour.",
    searchLabel: "Sélectionner une école",
    searchPlaceholder: "Choisissez une école",
    roleLabel: "Rôle",
    roleHint: "Les utilisateurs avec le rôle Admin accèdent à la banque de questions.",
    passwordLabel: "Nouveau mot de passe",
    passwordPlaceholder: "Saisissez un nouveau mot de passe",
    passwordButton: "Mettre à jour le mot de passe",
    roleButton: "Enregistrer le rôle",
    loading: "Chargement des utilisateurs...",
    empty: "Aucun utilisateur trouvé.",
    error: "Impossible de charger les utilisateurs.",
    roleSaved: "Rôle mis à jour.",
    passwordSaved: "Mot de passe mis à jour.",
    refresh: "Actualiser",
    searchClear: "Effacer la sélection",
    adminOnly: "Réservé aux administrateurs.",
  },
};

const ROLE_OPTIONS = [
  { value: "", label: { EN: "", AR: "", FR: "" } },
  { value: "admin", label: { EN: "Admin", AR: "????", FR: "Admin" } },
  { value: "educator", label: { EN: "Educator", AR: "????", FR: "Enseignant" } },
  { value: "staff", label: { EN: "Staff", AR: "????", FR: "Personnel" } },
  { value: "student", label: { EN: "Student", AR: "????", FR: "Étudiant" } },
  { value: "user", label: { EN: "User", AR: "??????", FR: "Utilisateur" } },
];

const formatUserLabel = (user) => {
  if (!user) return "";
  const parts = [
    user.name || user.username || user.email || "",
    user.email ? `· ${user.email}` : null,
    user.username ? `(@${user.username})` : null,
  ].filter(Boolean);
  return parts.join(" ");
};

export default function AdminManageUsers({ onNavigate }) {
  AdminManageUsers.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const copy = COPY.EN;
  const [usersLoading, setUsersLoading] = useState(true);
  const [userError, setUserError] = useState("");
  const [users, setUsers] = useState([]);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [roleDraft, setRoleDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [aiAccessDraft, setAiAccessDraft] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    email: "",
    school: "",
    username: "",
    class_name: "",
    phone: "",
  });
  const [savingRole, setSavingRole] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingAiAccess, setSavingAiAccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedQrUrl, setSelectedQrUrl] = useState("");
  const [selectedQrError, setSelectedQrError] = useState("");
  const [selectedQrLoading, setSelectedQrLoading] = useState(false);

  const loadUsers = async (focus = null) => {
    setUsersLoading(true);
    setUserError("");
    try {
      const table = import.meta.env.VITE_USERS_TABLE || "profiles";
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = data || [];
      setUsers(list);

      if (focus && focus.id) {
        const focusUser = list.find((u) => u.id === focus.id) || null;
        setSelectedUserId(focusUser ? focusUser.id : null);
        setRoleDraft(focusUser?.role || "");
        setPasswordDraft("");
        setSchoolFilter("");
      } else {
        setSelectedUserId(null);
        setRoleDraft("");
        setPasswordDraft("");
        setSchoolFilter("");
      }
    } catch (err) {
      console.error("manage-users load", err);
      setUserError(err?.message || copy.error);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!categoryFilter) return [];
    const filter = categoryFilter.toLowerCase();
    return (users || []).filter((user) => {
      const role = (user.role || "").toLowerCase();
      if (filter === "other") return role && !["student", "educator", "admin"].includes(role);
      return role === filter;
    });
  }, [users, categoryFilter]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const visibleUsers = useMemo(() => {
    let list = filteredUsers;
    if (schoolFilter) {
      const lower = schoolFilter.toLowerCase();
      list = list.filter((user) => (user.school || "").toLowerCase() === lower);
    }
    return list;
  }, [filteredUsers, schoolFilter]);

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleUsers.slice(start, start + PAGE_SIZE);
  }, [visibleUsers, page]);

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE));

  useEffect(() => {
    setSchoolFilter("");
    setSelectedUserId(null);
    setPage(1);
  }, [categoryFilter]);

  const handleSelectUser = (user) => {
    setSelectedUserId(user.id);
    setRoleDraft(user.role || "");
    setAiAccessDraft(Boolean(user.ai_access));
    setSuccessMessage("");
  };

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (selectedUser) {
      setRoleDraft(selectedUser.role || "");
      setPasswordDraft("");
      setAiAccessDraft(Boolean(selectedUser.ai_access));
      setProfileDraft({
        name: selectedUser.name || "",
        email: selectedUser.email || "",
        school: selectedUser.school || "",
        username: selectedUser.username || "",
        class_name: selectedUser.class_name || "",
        phone: selectedUser.phone || "",
      });
      setSuccessMessage("");
    }
  }, [selectedUser]);

  useEffect(() => {
    let active = true;
    if (!selectedUser?.id) {
      setSelectedQrUrl("");
      setSelectedQrError("");
      return undefined;
    }
    setSelectedQrLoading(true);
    makeQrDataUrl(selectedUser.id, 140)
      .then((url) => {
        if (!active) return;
        setSelectedQrUrl(url);
        setSelectedQrError("");
      })
      .catch(() => {
        if (!active) return;
        setSelectedQrError("Unable to generate QR code.");
        setSelectedQrUrl("");
      })
      .finally(() => {
        if (active) setSelectedQrLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedUser?.id]);

  const doSaveRole = async () => {
    if (!selectedUser) return;
    const nextValue = (roleDraft || "").trim();
    if ((selectedUser.role || "") === nextValue) return;
    const table = import.meta.env.VITE_USERS_TABLE || "profiles";
    setSavingRole(true);
    setSuccessMessage("");
    try {
      const { error } = await supabase
        .from(table)
        .update({ role: nextValue || null })
        .eq("id", selectedUser.id);
      if (error) throw error;

      await loadUsers({ id: selectedUser.id, label: formatUserLabel({ ...selectedUser, role: nextValue }) });

      try {
        const raw = localStorage.getItem("cg_current_user_v1");
        const current = raw ? JSON.parse(raw) : null;
        const isCurrentUser =
          current &&
          (current.id === selectedUser.id ||
            (!current.id && current.email && current.email === (selectedUser.email || current.email)));
        if (isCurrentUser) {
          localStorage.setItem(
            "cg_current_user_v1",
            JSON.stringify({ ...current, role: nextValue || "" })
          );
          if (nextValue === "admin") {
            localStorage.setItem("cg_admin_ok_v1", "1");
          } else {
            localStorage.removeItem("cg_admin_ok_v1");
          }
        }
      } catch {}

      setSuccessMessage(copy.roleSaved);
    } catch (err) {
      console.error("manage-users role", err);
      alert(err?.message || copy.error);
    } finally {
      setSavingRole(false);
    }
  };

  const doSaveProfile = async () => {
    if (!selectedUser) return;
    const table = import.meta.env.VITE_USERS_TABLE || "profiles";
    const payload = {
      name: (profileDraft.name || "").trim(),
      email: (profileDraft.email || "").trim(),
      school: (profileDraft.school || "").trim(),
      username: (profileDraft.username || "").trim(),
      class_name: (profileDraft.class_name || "").trim(),
      phone: (profileDraft.phone || "").trim(),
    };
    setSavingProfile(true);
    setSuccessMessage("");
    try {
      const { error } = await supabase.from(table).update(payload).eq("id", selectedUser.id);
      if (error) throw error;
      await loadUsers({ id: selectedUser.id, label: formatUserLabel({ ...selectedUser, ...payload }) });
      setSuccessMessage("Profile updated.");
    } catch (err) {
      console.error("save profile", err);
      alert(err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const doSaveAiAccess = async () => {
    if (!selectedUser) return;
    const nextValue = Boolean(aiAccessDraft);
    if (Boolean(selectedUser.ai_access) === nextValue) return;
    const table = import.meta.env.VITE_USERS_TABLE || "profiles";
    setSavingAiAccess(true);
    setSuccessMessage("");
    try {
      const { error } = await supabase
        .from(table)
        .update({ ai_access: nextValue })
        .eq("id", selectedUser.id);
      if (error) throw error;

      await loadUsers({ id: selectedUser.id, label: formatUserLabel({ ...selectedUser, ai_access: nextValue }) });

      try {
        const raw = localStorage.getItem("cg_current_user_v1");
        const current = raw ? JSON.parse(raw) : null;
        const isCurrentUser =
          current &&
          (current.id === selectedUser.id ||
            (!current.id && current.email && current.email === (selectedUser.email || current.email)));
        if (isCurrentUser) {
          localStorage.setItem(
            "cg_current_user_v1",
            JSON.stringify({ ...current, ai_access: nextValue })
          );
        }
      } catch {}

      setSuccessMessage(copy.aiAccessSaved || copy.roleSaved);
    } catch (err) {
      console.error("manage-users ai access", err);
      alert(err?.message || copy.error);
    } finally {
      setSavingAiAccess(false);
    }
  };

  const doResetPassword = async () => {
    if (!selectedUser) return;
    const trimmed = (passwordDraft || "").trim();
    if (trimmed.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setSavingPassword(true);
    setSuccessMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: { userId: selectedUser.id, newPassword: trimmed },
      });
      if (error) {
        let message = error.message || copy.error;
        if (error.context) {
          try {
            const body = await error.context.json();
            if (body?.error) message = body.error;
            else if (body?.message) message = body.message;
          } catch {
            try {
              const text = await error.context.text();
              if (text) message = text;
            } catch {}
          }
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      setPasswordDraft("");
      setSuccessMessage(copy.passwordSaved);
    } catch (err) {
      console.error("manage-users password", err);
      alert(err?.message || copy.error);
    } finally {
      setSavingPassword(false);
    }
  };

  const headerRight = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <UserMenu onNavigate={onNavigate} />
    </div>
  );

  return (
    <PageWrap>
      <HeaderBar
        title={copy.title}
        right={
          <>
            <Btn variant="back" onClick={() => onNavigate("home")}>
              Back to Home
            </Btn>
            {headerRight}
          </>
        }
      />
      <Card>
        <p style={{ marginTop: 0, color: "#6b7280" }}>{copy.subtitle}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 200 }}>
            <span style={{ fontWeight: 600 }}>Select category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            >
              <option value="">Choose role category</option>
              <option value="student">Students</option>
              <option value="educator">Educators</option>
              <option value="admin">Admins</option>
              <option value="other">Other roles</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 240 }}>
            <span style={{ fontWeight: 600 }}>{copy.searchLabel}</span>
            <select
              value={schoolFilter}
              disabled={!categoryFilter}
              onChange={(e) => {
                setSchoolFilter(e.target.value);
                setSelectedUserId(null);
                setPage(1);
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            >
              <option value="">{copy.searchPlaceholder}</option>
              {SCHOOL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <Btn
            variant="secondary"
            onClick={() => {
              setSchoolFilter("");
              setSelectedUserId(null);
            }}
          >
            {copy.searchClear}
          </Btn>
          <Btn variant="secondary" onClick={() => loadUsers()}>
            {copy.refresh}
          </Btn>
        </div>

        {usersLoading ? (
          <p style={{ color: "#6b7280" }}>{copy.loading}</p>
        ) : userError ? (
          <p style={{ color: "#b91c1c" }}>{userError}</p>
        ) : users.length === 0 ? (
          <p style={{ color: "#6b7280" }}>{copy.empty}</p>
        ) : (
          <>
            {categoryFilter ? (
              visibleUsers.length ? (
                <div style={{ overflowX: "auto", marginBottom: 16 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600, fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: 8, textAlign: "left" }}>Name</th>
                        <th style={{ padding: 8, textAlign: "left" }}>Email</th>
                        <th style={{ padding: 8, textAlign: "left" }}>Role</th>
                        <th style={{ padding: 8, textAlign: "left" }}>School</th>
                        <th style={{ padding: 8, textAlign: "left" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUsers.map((user) => {
                        const active = user.id === selectedUserId;
                        return (
                          <tr
                            key={user.id}
                            style={{
                              borderBottom: "1px solid #e5e7eb",
                              background: active ? "#f0f9ff" : "transparent",
                            }}
                          >
                            <td style={{ padding: 8 }}>{user.name || user.username || user.email}</td>
                            <td style={{ padding: 8 }}>{user.email || "—"}</td>
                            <td style={{ padding: 8 }}>{user.role || "—"}</td>
                            <td style={{ padding: 8 }}>{user.school || "—"}</td>
                            <td style={{ padding: 8 }}>
                              <Btn
                                variant={active ? "primary" : "secondary"}
                                onClick={() => handleSelectUser(user)}
                              >
                                {active ? "Selected" : "Select"}
                              </Btn>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visibleUsers.length > PAGE_SIZE && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                      <Btn
                        variant="secondary"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Prev
                      </Btn>
                      <span style={{ color: "#374151", fontSize: 13 }}>
                        Page {page} of {totalPages}
                      </span>
                      <Btn
                        variant="secondary"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        Next
                      </Btn>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: "#6b7280" }}>No users found for this category or search.</p>
              )
            ) : (
              <p style={{ color: "#6b7280" }}>Choose a role category to display users.</p>
            )}

            {selectedUser ? (
          <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{selectedUser.name || selectedUser.username || selectedUser.email}</div>
              <div style={{ color: "#6b7280", fontSize: 14 }}>{formatUserLabel(selectedUser)}</div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 12,
                background: "#f9fafb",
              }}
            >
              {selectedQrUrl ? (
                <img src={selectedQrUrl} alt="Competition QR code" style={{ width: 120, height: 120 }} />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 10,
                    border: "1px dashed #cbd5f5",
                    display: "grid",
                    placeItems: "center",
                    color: "#64748b",
                    background: "#ffffff",
                    fontSize: 12,
                  }}
                >
                  QR unavailable
                </div>
              )}
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 600, color: "#111827" }}>Competition QR</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>
                  {selectedUser.id}
                </div>
                {selectedQrLoading && <div style={{ color: "#6b7280", fontSize: 12 }}>Generating...</div>}
                {selectedQrError && <div style={{ color: "#dc2626", fontSize: 12 }}>{selectedQrError}</div>}
              </div>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Name</span>
              <input
                type="text"
                value={profileDraft.name}
                onChange={(e) => {
                  setProfileDraft((prev) => ({ ...prev, name: e.target.value }));
                  setSuccessMessage("");
                }}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Email</span>
              <input
                type="email"
                value={profileDraft.email}
                onChange={(e) => {
                  setProfileDraft((prev) => ({ ...prev, email: e.target.value }));
                  setSuccessMessage("");
                }}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>School</span>
              <select
                value={profileDraft.school}
                onChange={(e) => {
                  setProfileDraft((prev) => ({ ...prev, school: e.target.value }));
                  setSuccessMessage("");
                }}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
              >
                {SCHOOL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Username</span>
              <input
                type="text"
                value={profileDraft.username}
                onChange={(e) => {
                  setProfileDraft((prev) => ({ ...prev, username: e.target.value }));
                  setSuccessMessage("");
                }}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Grade/Class</span>
              <input
                type="text"
                value={profileDraft.class_name}
                onChange={(e) => {
                  setProfileDraft((prev) => ({ ...prev, class_name: e.target.value }));
                  setSuccessMessage("");
                }}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Phone</span>
              <input
                type="text"
                value={profileDraft.phone}
                onChange={(e) => {
                  setProfileDraft((prev) => ({ ...prev, phone: e.target.value }));
                  setSuccessMessage("");
                }}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>

            <Btn
              variant="secondary"
              disabled={savingProfile}
              onClick={doSaveProfile}
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </Btn>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{copy.roleLabel}</span>
              <select
                value={roleDraft}
                onChange={(e) => {
                  setRoleDraft(e.target.value);
                  setSuccessMessage("");
                }}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label.EN}
                  </option>
                ))}
              </select>
              <small style={{ color: "#6b7280" }}>{copy.roleHint}</small>
            </label>
            <Btn
              variant="secondary"
              disabled={savingRole || (selectedUser.role || "") === (roleDraft || "")}
              onClick={doSaveRole}
            >
              {savingRole ? "Saving..." : copy.roleButton}
            </Btn>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{copy.aiAccessLabel}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={aiAccessDraft}
                  onChange={(e) => {
                    setAiAccessDraft(e.target.checked);
                    setSuccessMessage("");
                  }}
                />
                <span style={{ color: "#374151" }}>{copy.aiAccessHint}</span>
              </div>
            </label>
            <Btn
              variant="secondary"
              disabled={savingAiAccess || Boolean(selectedUser.ai_access) === Boolean(aiAccessDraft)}
              onClick={doSaveAiAccess}
            >
              {savingAiAccess ? "Saving..." : (copy.aiAccessButton || "Save AI Access")}
            </Btn>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>{copy.passwordLabel}</span>
              <input
                type="text"
                value={passwordDraft}
                onChange={(e) => {
                  setPasswordDraft(e.target.value);
                  setSuccessMessage("");
                }}
                placeholder={copy.passwordPlaceholder}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>
            <Btn
              variant="primary"
              disabled={savingPassword || passwordDraft.trim().length < 6}
              onClick={doResetPassword}
            >
              {savingPassword ? "Saving..." : copy.passwordButton}
            </Btn>

            {successMessage && <p style={{ margin: 0, color: "#047857", fontWeight: 600 }}>{successMessage}</p>}
          </div>
            ) : (
              <p style={{ color: "#6b7280" }}>Select a user from the table above to edit their details.</p>
            )}
          </>
        )}
      </Card>
    </PageWrap>
  );
}

const SCHOOL_OPTIONS = [
  { value: "", label: "Select school" },
  { value: "Al - Jinan International School", label: "Al - Jinan International School" },
  { value: "Azm school", label: "Azm school" },
  { value: "Canada Educational Center", label: "Canada Educational Center" },
  { value: "Dar En Nour - Btouratige", label: "Dar En Nour - Btouratige" },
  { value: "EEC", label: "EEC" },
  { value: "Ecole Saint Joseph - Miniara", label: "Ecole Saint Joseph - Miniara" },
  { value: "Saints Coeurs - Andket", label: "Saints Coeurs - Andket" },
  { value: "Sir El Dinniyeh Secondary Public School", label: "Sir El Dinniyeh Secondary Public School" },
];
