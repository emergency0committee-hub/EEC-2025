// src/pages/admin/AdminManageUsers.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import LanguageButton from "../../components/LanguageButton.jsx";
import UserMenu from "../../components/UserMenu.jsx";
import Btn from "../../components/Btn.jsx";
import { LANGS } from "../../i18n/strings.js";
import { supabase } from "../../lib/supabase.js";
import { hashPassword } from "../../lib/hash.js";

const COPY = {
  EN: {
    title: "Manage Users",
    subtitle: "Search for a user, adjust their role, or reset their password.",
    searchLabel: "Select User",
    searchPlaceholder: "Type name, email, or username",
    roleLabel: "Role",
    roleHint: "Users with the Admin role can access the question bank.",
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
    title: "إدارة المستخدمين",
    subtitle: "ابحث عن المستخدم، حدّد دوره أو أعد تعيين كلمة المرور.",
    searchLabel: "اختيار المستخدم",
    searchPlaceholder: "اكتب الاسم أو البريد أو اسم المستخدم",
    roleLabel: "الدور",
    roleHint: "المستخدمون بدور Admin يمكنهم الوصول إلى بنك الأسئلة.",
    passwordLabel: "كلمة مرور جديدة",
    passwordPlaceholder: "أدخل كلمة مرور جديدة",
    passwordButton: "تحديث كلمة المرور",
    roleButton: "حفظ الدور",
    loading: "جارٍ تحميل المستخدمين...",
    empty: "لا يوجد مستخدمون.",
    error: "تعذّر تحميل المستخدمين.",
    roleSaved: "تم تحديث الدور.",
    passwordSaved: "تم تحديث كلمة المرور.",
    refresh: "تحديث",
    searchClear: "مسح الاختيار",
    adminOnly: "مقتصر على المسؤولين.",
  },
  FR: {
    title: "Gérer les utilisateurs",
    subtitle: "Recherchez un utilisateur, ajustez son rôle ou réinitialisez son mot de passe.",
    searchLabel: "Sélectionner un utilisateur",
    searchPlaceholder: "Tapez nom, e-mail ou identifiant",
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
  { value: "", label: { EN: "—", AR: "—", FR: "—" } },
  { value: "admin", label: { EN: "Admin", AR: "مشرف", FR: "Admin" } },
  { value: "educator", label: { EN: "Educator", AR: "معلم", FR: "Enseignant" } },
  { value: "staff", label: { EN: "Staff", AR: "طاقم", FR: "Personnel" } },
  { value: "student", label: { EN: "Student", AR: "طالب", FR: "Étudiant" } },
  { value: "user", label: { EN: "User", AR: "مستخدم", FR: "Utilisateur" } },
];

const formatUserLabel = (user) => {
  if (!user) return "";
  const parts = [
    user.name || user.username || user.email || "—",
    user.email ? `· ${user.email}` : null,
    user.username ? `(@${user.username})` : null,
  ].filter(Boolean);
  return parts.join(" ");
};

export default function AdminManageUsers({ onNavigate, lang = "EN", setLang }) {
  AdminManageUsers.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string,
    setLang: PropTypes.func,
  };

  const copy = COPY[lang] || COPY.EN;
  const handleSetLang = setLang || (() => {});
  const [usersLoading, setUsersLoading] = useState(true);
  const [userError, setUserError] = useState("");
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [roleDraft, setRoleDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
        if (focusUser) {
          setSearchTerm(focus.label || formatUserLabel(focusUser));
        } else {
          setSearchTerm("");
        }
      } else {
        setSelectedUserId(null);
        setRoleDraft("");
        setPasswordDraft("");
        setSearchTerm("");
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

  const optionList = useMemo(() => {
    return (users || []).map((user) => {
      const label = formatUserLabel(user);
      return {
        id: user.id,
        label,
        searchIndex: label.toLowerCase(),
      };
    });
  }, [users]);

  useEffect(() => {
    if (!searchTerm) {
      setSelectedUserId(null);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const matches = optionList.filter((opt) => opt.searchIndex.includes(lower));
    if (matches.length === 1) {
      setSelectedUserId(matches[0].id);
      const matchUser = users.find((u) => u.id === matches[0].id);
      setRoleDraft(matchUser?.role || "");
    }
  }, [searchTerm, optionList, users]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (selectedUser) {
      setRoleDraft(selectedUser.role || "");
      setPasswordDraft("");
      setSuccessMessage("");
    }
  }, [selectedUser]);

  const handleSelectByLabel = (label) => {
    const match = optionList.find((opt) => opt.label === label);
    if (match) {
      setSelectedUserId(match.id);
      const matchUser = users.find((u) => u.id === match.id);
      setRoleDraft(matchUser?.role || "");
    }
  };

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

  const doResetPassword = async () => {
    if (!selectedUser) return;
    const trimmed = (passwordDraft || "").trim();
    if (trimmed.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    const table = import.meta.env.VITE_USERS_TABLE || "profiles";
    setSavingPassword(true);
    setSuccessMessage("");
    try {
      const hashed = await hashPassword(trimmed);
      const { error } = await supabase
        .from(table)
        .update({ password_hash: hashed })
        .eq("id", selectedUser.id);
      if (error) throw error;
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
      <LanguageButton lang={lang} setLang={handleSetLang} langs={LANGS} />
      <UserMenu lang={lang} onNavigate={onNavigate} />
    </div>
  );

  return (
    <PageWrap>
      <HeaderBar lang={lang} title={copy.title} right={headerRight} />
      <Card>
        <p style={{ marginTop: 0, color: "#6b7280" }}>{copy.subtitle}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 240 }}>
            <span style={{ fontWeight: 600 }}>{copy.searchLabel}</span>
            <input
              list="manage-users-options"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSelectByLabel(e.target.value);
              }}
              placeholder={copy.searchPlaceholder}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            />
            <datalist id="manage-users-options">
              {optionList.map((opt) => (
                <option key={opt.id} value={opt.label} />
              ))}
            </datalist>
          </label>
          <Btn variant="secondary" onClick={() => setSearchTerm("")}>
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
        ) : selectedUser ? (
          <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{selectedUser.name || selectedUser.username || selectedUser.email}</div>
              <div style={{ color: "#6b7280", fontSize: 14 }}>{formatUserLabel(selectedUser)}</div>
            </div>

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
                    {opt.label[lang] || opt.label.EN}
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

            {successMessage && <p style={{ color: "#047857", fontWeight: 600 }}>{successMessage}</p>}
          </div>
        ) : (
          <p style={{ color: "#6b7280" }}>{copy.adminOnly}</p>
        )}
      </Card>
    </PageWrap>
  );
}
