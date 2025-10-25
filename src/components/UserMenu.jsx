import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Btn from "./Btn.jsx";

export default function UserMenu({ onNavigate }) {
  UserMenu.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const currentUser = (() => {
    try { const raw = localStorage.getItem("cg_current_user_v1"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  })();
  const isAdmin = localStorage.getItem("cg_admin_ok_v1") === "1";

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

  if (!currentUser) {
    return (
      <Btn variant="primary" onClick={() => onNavigate("login")}>
        Login
      </Btn>
    );
  }

  const signOut = () => {
    try {
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
        title="Account menu"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        <span aria-hidden style={{ fontSize: 18 }}>⚙️</span>
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
          <MenuItem onClick={() => { setOpen(false); onNavigate("account"); }}>
            Profile
          </MenuItem>
          {isAdmin && (
            <MenuItem onClick={() => { setOpen(false); onNavigate("admin-dashboard"); }}>
              Admin Dashboard
            </MenuItem>
          )}
          <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
          <MenuItem onClick={signOut}>Sign out</MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick }) {
  MenuItem.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        borderRadius: 6,
        border: "none",
        background: "transparent",
        color: "#374151",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

