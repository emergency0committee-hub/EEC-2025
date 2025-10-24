import React, { useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";

export default function Admin({ onNavigate, lang, setLang }) {
  Admin.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
  };
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (password === "admin123") { // Simple password for demo
      localStorage.setItem("cg_admin_ok_v1", "1");
      onNavigate("home");
    } else {
      setError("Invalid password");
    }
  };

  return (
    <PageWrap>
      <HeaderBar title="Admin Login" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>Admin Access</h3>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <Btn variant="primary" onClick={handleLogin}>Login</Btn>
        <Btn variant="back" onClick={() => onNavigate("home")} style={{ marginLeft: 8 }}>Back</Btn>
      </Card>
    </PageWrap>
  );
}
