import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Btn from "./Btn.jsx";
import { useAppSettings } from "./AppProviders.jsx";
import { supabase } from "../lib/supabase.js";
import { routeHref, isModifiedEvent } from "../lib/routes.js";
import { STR } from "../i18n/strings.js";

export default function UserMenu({ onNavigate, lang = "EN", variant = "icon", style = {}, iconColor }) {
  UserMenu.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string,
    variant: PropTypes.oneOf(["icon", "drawer"]),
    style: PropTypes.object,
    iconColor: PropTypes.string,
  };

  const isDrawer = variant === "drawer";
  const [open, setOpen] = useState(false);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const {
    animationsEnabled,
    setAnimationsEnabled,
    settingsLoading,
    settingsSaving,
    settingsError,
  } = useAppSettings();

  const currentUser = (() => {
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const role = (currentUser?.role || "").toLowerCase();
  const isAdmin = localStorage.getItem("cg_admin_ok_v1") === "1" || role === "admin" || role === "administrator";
  const canAccessQuestionBank = isAdmin || role === "staff";
  const displayName = (currentUser?.name || currentUser?.username || currentUser?.email || "Account").trim();
  const displayEmail = (currentUser?.email || "").trim();
  const avatarUrl = currentUser?.avatar_url || "";
  const iconStroke = iconColor || "#0f172a";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "";

  useEffect(() => {
    if (isDrawer) return undefined;
    const onDoc = (e) => {
      if (!open) return;
      const t = e.target;
      if (btnRef.current && btnRef.current.contains(t)) return;
      if (menuRef.current && menuRef.current.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open && !isDrawer) {
      setGlobalSettingsOpen(false);
    }
  }, [open, isDrawer]);

  useEffect(() => {
    if (isDrawer) return undefined;
    if (!open) {
      setMenuPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      const anchor = document.getElementById("home-welcome-card");
      const btn = btnRef.current;
      if (!anchor || !btn) {
        setMenuPosition(null);
        return;
      }
      const anchorRect = anchor.getBoundingClientRect();
      const top = Math.max(8, anchorRect.top);
      const right = Math.max(8, window.innerWidth - anchorRect.right);
      setMenuPosition({ top, right });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const navTo = (route, data = null) => (event) => onNavigate(route, data, event);
  const handleMenuSelect = (route) => (event) => {
    if (!isDrawer) setOpen(false);
    onNavigate(route, null, event);
  };

  const strings = STR[lang] || STR.EN;
  const loginLabel = strings.signIn || "Login";
  const menuLabels = {
    profile: strings.menuProfile || "Profile",
    careerDashboard: strings.menuCareerDashboard || "Career Dashboard",
    satDashboard: strings.menuSatDashboard || "SAT Dashboard",
    competitionMode: strings.menuCompetitionMode || "Competition Mode",
    liveMonitor: strings.menuLiveMonitor || "Live Monitor",
    manageUsers: strings.menuManageUsers || "Manage Users",
    questions: strings.menuQuestions || "Question Bank",
    certificates: strings.menuCertificates || "Certificates",
    globalSettings: strings.menuGlobalSettings || "Global Settings",
    animations: strings.menuAnimations || "Animations",
    toggleOn: strings.menuToggleOn || "On",
    toggleOff: strings.menuToggleOff || "Off",
    signOut: strings.menuSignOut || strings.signOut || "Sign Out",
    title: strings.menuTitle || "Account menu",
  };
  const settingsBusy = settingsLoading || settingsSaving;
  const animationsLabel = animationsEnabled ? menuLabels.toggleOn : menuLabels.toggleOff;

  if (!currentUser) {
    return (
      <Btn
        variant="primary"
        to="login"
        onClick={navTo("login")}
        style={isDrawer ? { width: "100%" } : undefined}
      >
        {loginLabel}
      </Btn>
    );
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("cg_current_user_v1");
      localStorage.removeItem("cg_admin_ok_v1");
    } catch {}
    if (!isDrawer) setOpen(false);
    onNavigate("home");
  };

  const menuHeader = (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: isDrawer ? "0 6px 12px" : "6px 6px 10px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
        marginBottom: isDrawer ? 10 : 6,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            objectFit: "cover",
            border: "1px solid rgba(255, 255, 255, 0.6)",
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#0f172a",
            background: "rgba(255, 255, 255, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
          }}
        >
          {initials || "?"}
        </div>
      )}
      <div style={{ display: "grid" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{displayName}</span>
        {displayEmail && (
          <span style={{ fontSize: 11, color: "#475569" }}>{displayEmail}</span>
        )}
        {roleLabel && (
          <span style={{ fontSize: 11, color: "#64748b" }}>{roleLabel}</span>
        )}
      </div>
    </div>
  );

  const menuContent = (
    <>
      {menuHeader}
      <MenuItem to="account" onSelect={handleMenuSelect("account")}>
        {menuLabels.profile}
      </MenuItem>
      {isAdmin && (
        <>
          <MenuItem onClick={() => setGlobalSettingsOpen((prev) => !prev)}>
            {menuLabels.globalSettings}
          </MenuItem>
          {globalSettingsOpen && (
            <div style={{ display: "grid", gap: 6, padding: "0 6px 6px" }}>
              <button
                type="button"
                onClick={() => {
                  if (settingsBusy) return;
                  setAnimationsEnabled(!animationsEnabled);
                }}
                disabled={settingsBusy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "#0f172a",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: settingsBusy ? "not-allowed" : "pointer",
                  opacity: settingsBusy ? 0.6 : 1,
                }}
              >
                <span>{menuLabels.animations}</span>
                <span>{animationsLabel}</span>
              </button>
              {settingsError && (
                <div style={{ color: "#b91c1c", fontSize: 12 }}>
                  {settingsError}
                </div>
              )}
            </div>
          )}
          <MenuItem to="admin-manage-users" onSelect={handleMenuSelect("admin-manage-users")}>
            {menuLabels.manageUsers}
          </MenuItem>
          <MenuItem to="career-dashboard" onSelect={handleMenuSelect("career-dashboard")}>
            {menuLabels.careerDashboard}
          </MenuItem>
          <MenuItem to="admin-live-monitor" onSelect={handleMenuSelect("admin-live-monitor")}>
            {menuLabels.liveMonitor}
          </MenuItem>
          <MenuItem to="admin-sat" onSelect={handleMenuSelect("admin-sat")}>
            {menuLabels.satDashboard}
          </MenuItem>
          <MenuItem to="sat-reading-competition-mode" onSelect={handleMenuSelect("sat-reading-competition-mode")}>
            {menuLabels.competitionMode}
          </MenuItem>
          <MenuItem to="admin-certificates" onSelect={handleMenuSelect("admin-certificates")}>
            {menuLabels.certificates}
          </MenuItem>
        </>
      )}
      {canAccessQuestionBank && (
        <MenuItem to="admin-question-bank" onSelect={handleMenuSelect("admin-question-bank")}>
          {menuLabels.questions}
        </MenuItem>
      )}
      <div style={{ height: 1, background: "rgba(255, 255, 255, 0.35)", margin: "6px 0" }} />
      <MenuItem onClick={signOut}>{menuLabels.signOut}</MenuItem>
    </>
  );

  if (isDrawer) {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "stretch",
          ...style,
        }}
      >
        {menuContent}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", ...style }}>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup
        aria-expanded={open}
        title={menuLabels.title}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          boxShadow: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          cursor: "pointer",
        }}
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke={iconStroke} strokeWidth="1.6"/>
          <path d="M20 12a8.001 8.001 0 0 1-.25 2l2.02 1.54-2 3.46-2.46-.63a8.07 8.07 0 0 1-1.73 1l-.38 2.53H9.8l-.38-2.53a8.07 8.07 0 0 1-1.73-1l-2.46.63-2-3.46L5.25 14A8.001 8.001 0 0 1 5 12c0-.68.09-1.34.25-2L3.23 8.46l2-3.46 2.46.63c.53-.41 1.11-.76 1.73-1L9.8 2.1h4.4l.38 2.53c.62.24 1.2.59 1.73 1l2.46-.63 2 3.46L19.75 10c.16.66.25 1.32.25 2Z" stroke={iconStroke} strokeWidth="1.6" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: menuPosition ? "fixed" : "absolute",
            top: menuPosition ? menuPosition.top : undefined,
            right: menuPosition ? menuPosition.right : 0,
            marginTop: menuPosition ? 0 : 10,
            minWidth: 220,
            border: "1px solid rgba(255, 255, 255, 0.35)",
            borderRadius: 14,
            backgroundColor: "rgba(255, 255, 255, 0.18)",
            backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.08))",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.25)",
            padding: 10,
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          {menuContent}
        </div>
      )}
    </div>
  );
}

UserMenu.displayName = "UserMenu";

function MenuItem({ children, to, onSelect, onClick }) {
  MenuItem.propTypes = {
    children: PropTypes.node.isRequired,
    to: PropTypes.string,
    onSelect: PropTypes.func,
    onClick: PropTypes.func,
  };

  const href = to ? routeHref(to) : undefined;
  const baseStyle = {
    display: "flex",
    width: "100%",
    textAlign: "left",
    alignItems: "center",
    padding: "9px 10px",
    minHeight: 36,
    borderRadius: 8,
    border: "1px solid transparent",
    background: "transparent",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxSizing: "border-box",
    textDecoration: "none",
    transition: "background 140ms ease, border 140ms ease, transform 140ms ease",
  };

  const handleClick = (event) => {
    if (href) {
      if (isModifiedEvent(event)) {
        return;
      }
      event.preventDefault();
      onSelect?.(event);
    } else {
      onClick?.(event);
    }
  };

  if (href) {
    return (
      <a
        href={href}
        onClick={handleClick}
        style={baseStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.55)";
          e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.5)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.border = "1px solid transparent";
          e.currentTarget.style.transform = "translateY(0)";
        }}
        onFocus={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.55)";
          e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.6)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.border = "1px solid transparent";
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={handleClick}
      style={baseStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.55)";
        e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.5)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.border = "1px solid transparent";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onFocus={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.55)";
        e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.6)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.border = "1px solid transparent";
      }}
    >
      {children}
    </button>
  );
}
