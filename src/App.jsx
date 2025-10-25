// src/App.jsx
import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import Home from "./pages/Home.jsx";
import Career from "./pages/Career.jsx";
import Test from "./pages/Test.jsx";
import Results from "./pages/Results.jsx";
import Admin from "./pages/Admin.jsx";
import Thanks from "./pages/Thanks.jsx";
import { PageWrap, HeaderBar, Card } from "./components/Layout.jsx";
import Btn from "./components/Btn.jsx";
// import { testSupabaseConnection } from "./lib/supabase.js";

function SatPlaceholder({ onNavigate, lang, setLang }) {
  SatPlaceholder.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
  };
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
  // Route state with localStorage persistence
  const [route, setRoute] = useState(() => {
    // Check for redirected path from 404.html
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('/');
    if (path) {
      const route = path.startsWith('/') ? path.slice(1) : path;
      // Clear the URL
      window.history.replaceState(null, null, window.location.pathname);
      return route || "home";
    }
    try {
      const savedRoute = localStorage.getItem("cg_current_route");
      // Don't persist test or results routes for security/UX reasons
      if (savedRoute && !["test", "results"].includes(savedRoute)) {
        return savedRoute;
      }
      return "home";
    } catch {
      return "home";
    }
  });
  
  const [resultsPayload, setResultsPayload] = useState(null);

  // Global language state with localStorage persistence
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("cg_lang") || "EN";
    } catch {
      return "EN";
    }
  });

  // Persist language preference and set document direction
  useEffect(() => {
    try {
      localStorage.setItem("cg_lang", lang);
      // Set document direction for RTL support
      document.documentElement.dir = lang === "AR" ? "rtl" : "ltr";
      document.documentElement.lang = lang.toLowerCase();
    } catch (e) {
      console.warn("Failed to save language preference:", e);
    }
  }, [lang]);

  // Persist current route
  useEffect(() => {
    try {
      // Don't persist test or results routes
      if (!["test", "results"].includes(route)) {
        localStorage.setItem("cg_current_route", route);
      }
    } catch (e) {
      console.warn("Failed to save route:", e);
    }
  }, [route]);

  // useEffect(() => {
  //   testSupabaseConnection();
  // }, []);

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

  if (route === "home")   return <Home onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "career") return <Career onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "sat")    return <SatPlaceholder onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "test")   return <Test onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "thanks") return <Thanks onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "admin")  return <Admin onNavigate={onNavigate} lang={lang} setLang={setLang} />;

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
