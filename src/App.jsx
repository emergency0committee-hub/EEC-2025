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
import { testSupabaseConnection } from "./lib/supabase.js";

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

  const headerRight = useMemo(() => (
    <div className="no-print" style={{ display: "flex", gap: 8 }}>
      <Btn variant="secondary" onClick={() => onNavigate("home")}>Home</Btn>
    </div>
  ), []);

  let content;
  switch (route) {
    case "home":
      content = <Home onNavigate={onNavigate} />;
      break;
    case "career":
      content = <Career onNavigate={onNavigate} />;
      break;
    case "test":
      content = <Test onNavigate={onNavigate} />;
      break;
    case "results":
      content = <Results onNavigate={onNavigate} payload={resultsPayload} />;
      break;
    case "admin":
      content = <Admin onNavigate={onNavigate} />;
      break;
    case "thanks":
      content = <Thanks onNavigate={onNavigate} />;
      break;
    default:
      content = <Home onNavigate={onNavigate} />;
  }

  return (
    <PageWrap>
      <HeaderBar title="Career Guidance Test" right={headerRight} />
      {content}
    </PageWrap>
  );
}
