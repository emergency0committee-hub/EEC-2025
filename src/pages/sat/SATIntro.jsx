// src/pages/sat/SATIntro.jsx
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import { supabase } from "../../lib/supabase.js";

export default function SATIntro({ onNavigate }) {
  SATIntro.propTypes = { onNavigate: PropTypes.func.isRequired };

  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const { data: { user } } = await supabase.auth.getUser(); if (alive) setAuthUser(user || null); }
      finally { if (alive) setAuthLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (!authLoading && !authUser) {
    return (
      <PageWrap>
        <HeaderBar title="SAT Diagnostic" />
        <Card>
          <p style={{ color: "#6b7280" }}>Please sign in to start the SAT diagnostic.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={() => onNavigate("login")}>Go to Login</Btn>
            <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
          </div>
        </Card>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <HeaderBar title="SAT Diagnostic" />
      <Card>
        <h3 style={{ marginTop: 0 }}>Overview</h3>
        <p style={{ color: "#6b7280" }}>
          This diagnostic simulates the new Digital SAT structure with two modules for Reading & Writing and two modules for Math. It uses strict timers, a question palette, and basic scoring. Your submission will be saved.
        </p>
        <ul style={{ color: "#374151" }}>
          <li>Reading & Writing: 2 modules × 32 minutes each</li>
          <li>Math: 2 modules × 35 minutes each</li>
          <li>Answer navigation via a palette; timer per module</li>
        </ul>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn variant="primary" onClick={() => onNavigate("sat-exam")}>Start Diagnostic</Btn>
          <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
        </div>
      </Card>
    </PageWrap>
  );
}

