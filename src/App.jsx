// src/App.jsx
import React, { useState, useMemo, useEffect } from "react";
import Home from "./pages/Home.jsx";
import Career from "./pages/Career.jsx";
import Test from "./pages/Test.jsx";
import Results from "./pages/Results.jsx";
import Admin from "./pages/Admin.jsx";
import Thanks from "./pages/Thanks.jsx";
import { PageWrap, HeaderBar, Card } from "./components/Layout.jsx";
import Btn from "./components/Btn.jsx";
import { testSupabaseConnection } from "./lib/testSupabase.js";

function SatPlaceholder({ onNavigate }) {
  return (
    <PageWrap>
      <HeaderBar title="SAT Practice" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>SAT Module (Coming Soon)</h3>
        <p style={{ color: "#6b7280" }}>
          This is a placeholder for the SAT practice experience. You can wire sections with timers and palettes just like the Career Guidance test.
        </p>
        <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
      </Card>
    </PageWrap>
  );
}

export default function App() {
  const [route, setRoute] = useState("home");
  const [resultsPayload, setResultsPayload] = useState(null);

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const onNavigate = (to, data = null) => {
    if (to === "results" && data) setResultsPayload(data);
    setRoute(to);
    window.scrollTo(0, 0);
  };

  const canViewResults = useMemo(() => {
    try {
      return localStorage.getItem("cg_admin_ok_v1") === "1";
    } catch {
      return false;
    }
  }, [route]);

  if (route === "home")   return <Home onNavigate={onNavigate} />;
  if (route === "career") return <Career onNavigate={onNavigate} />;
  if (route === "sat")    return <SatPlaceholder onNavigate={onNavigate} />;
  if (route === "test")   return <Test onNavigate={onNavigate} />;
  if (route === "thanks") return <Thanks onNavigate={onNavigate} />;
  if (route === "admin")  return <Admin onNavigate={onNavigate} />;

  if (route === "results") {
    if (!canViewResults) {
      return (
        <PageWrap>
          <HeaderBar title="Not Authorized" right={null} />
          <Card>
            <p style={{ color: "#6b7280" }}>
              Results are visible to administrators only.
            </p>
            <Btn variant="primary" onClick={() => onNavigate("home")}>Back to Home</Btn>
          </Card>
        </PageWrap>
      );
    }
    return <Results onNavigate={onNavigate} {...(resultsPayload || {})} />;
  }

  // 404
  return (
    <PageWrap>
      <HeaderBar title="Not Found" right={null} />
      <Card>
        <p>Page not found.</p>
        <Btn variant="primary" onClick={() => onNavigate("home")}>Back Home</Btn>
      </Card>
    </PageWrap>
  );
}
