import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Btn from "./Btn.jsx";
import { supabase } from "../lib/supabase.js";
import { routeHref, isModifiedEvent } from "../lib/routes.js";
import { STR } from "../i18n/strings.js";

export default function UserMenu({ onNavigate, lang = "EN" }) {
  UserMenu.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string,
  };

  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

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

  useEffect(() => {
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

  const navTo = (route, data = null) => (event) => onNavigate(route, data, event);

  const strings = STR[lang] || STR.EN;
  const loginLabel = strings.signIn || "Login";
  const menuLabels = {
    profile: strings.menuProfile || "Profile",
    careerDashboard: strings.menuCareerDashboard || "Career Dashboard",
    satDashboard: strings.menuSatDashboard || "SAT Dashboard",
    liveMonitor: strings.menuLiveMonitor || "Live Monitor",
    manageUsers: strings.menuManageUsers || "Manage Users",
    questions: strings.menuQuestions || "Question Bank",
    certificates: strings.menuCertificates || "Certificates",
    signOut: strings.menuSignOut || strings.signOut || "Sign Out",
    title: strings.menuTitle || "Account menu",
  };

  if (!currentUser) {
    return (
      <Btn variant="primary" to="login" onClick={navTo("login")}>
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
    setOpen(false);
    onNavigate("home");
  };

  return (
    <div style={{ position: "relative" }}>
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
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="#374151" strokeWidth="1.6"/>
          <path d="M20 12a8.001 8.001 0 0 1-.25 2l2.02 1.54-2 3.46-2.46-.63a8.07 8.07 0 0 1-1.73 1l-.38 2.53H9.8l-.38-2.53a8.07 8.07 0 0 1-1.73-1l-2.46.63-2-3.46L5.25 14A8.001 8.001 0 0 1 5 12c0-.68.09-1.34.25-2L3.23 8.46l2-3.46 2.46.63c.53-.41 1.11-.76 1.73-1L9.8 2.1h4.4l.38 2.53c.62.24 1.2.59 1.73 1l2.46-.63 2 3.46L19.75 10c.16.66.25 1.32.25 2Z" stroke="#374151" strokeWidth="1.6" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            marginTop: 8,
            minWidth: 180,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "#fff",
            boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
            padding: 8,
            zIndex: 50,
          }}
        >
          <MenuItem
            to="account"
            onSelect={(event) => {
              setOpen(false);
              onNavigate("account", null, event);
            }}
          >
            {menuLabels.profile}
          </MenuItem>
          {isAdmin && (
            <>
              <MenuItem
                to="admin-manage-users"
                onSelect={(event) => {
                  setOpen(false);
                  onNavigate("admin-manage-users", null, event);
                }}
              >
                {menuLabels.manageUsers}
              </MenuItem>
              <MenuItem
                to="career-dashboard"
                onSelect={(event) => {
                  setOpen(false);
                  onNavigate("career-dashboard", null, event);
                }}
              >
                {menuLabels.careerDashboard}
              </MenuItem>
              <MenuItem
                to="admin-live-monitor"
                onSelect={(event) => {
                  setOpen(false);
                  onNavigate("admin-live-monitor", null, event);
                }}
              >
                {menuLabels.liveMonitor}
              </MenuItem>
              <MenuItem
                to="admin-sat"
                onSelect={(event) => {
                  setOpen(false);
                  onNavigate("admin-sat", null, event);
                }}
              >
                {menuLabels.satDashboard}
              </MenuItem>
              <MenuItem
                to="admin-certificates"
                onSelect={(event) => {
                  setOpen(false);
                  onNavigate("admin-certificates", null, event);
                }}
              >
                {menuLabels.certificates}
              </MenuItem>
            </>
          )}
          {canAccessQuestionBank && (
            <MenuItem
              to="admin-question-bank"
              onSelect={(event) => {
                setOpen(false);
                onNavigate("admin-question-bank", null, event);
              }}
            >
              {menuLabels.questions}
            </MenuItem>
          )}
          <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
          <MenuItem onClick={signOut}>{menuLabels.signOut}</MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, to, onSelect, onClick }) {
  MenuItem.propTypes = {
    children: PropTypes.node.isRequired,
    to: PropTypes.string,
    onSelect: PropTypes.func,
    onClick: PropTypes.func,
  };

  const href = to ? routeHref(to) : undefined;
  const baseStyle = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#374151",
    cursor: "pointer",
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
        onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={handleClick}
      style={baseStyle}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
