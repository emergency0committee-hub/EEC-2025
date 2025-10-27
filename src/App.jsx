// src/App.jsx
import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import Home from "./pages/Home.jsx";
import Blogs from "./pages/Blogs.jsx";
import About from "./pages/About.jsx";
import Career from "./pages/Career.jsx";
import Test from "./pages/Test.jsx";
import Results from "./pages/Results.jsx";
import SelectResults from "./pages/SelectResults.jsx";
import Login from "./pages/Login.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import SATAdmin from "./pages/admin/SATDashboard.jsx";
import SATResults from "./pages/sat/SATResults.jsx";
import SATTrainingAdmin from "./pages/admin/SATTrainingDashboard.jsx";
import Thanks from "./pages/Thanks.jsx";
import Account from "./pages/Account.jsx";
import SATIntro from "./pages/sat/SATIntro.jsx";
import SATExam from "./pages/sat/SATExam.jsx";
import SATTraining from "./pages/sat/SATTraining.jsx";
import { PageWrap, HeaderBar, Card } from "./components/Layout.jsx";
import AIEducator from "./pages/AIEducator.jsx";
import Btn from "./components/Btn.jsx";
// import { testSupabaseConnection } from "./lib/supabase.js";

function SatPlaceholder() { return null; }

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

  // Enable browser back/forward navigation by listening to popstate
  useEffect(() => {
    const onPop = () => {
      const base = import.meta.env.BASE_URL || "/";
      let path = window.location.pathname || "/";
      if (path.startsWith(base)) path = path.slice(base.length);
      const normalized = String(path).replace(/^\/+/, "").trim() || "home";
      setRoute(normalized);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const onNavigate = (to, data = null) => {
    const normalized = String(to || "").replace(/^\/+/, "").trim();
    if (data) setResultsPayload(data);
    setRoute(normalized);
    window.scrollTo(0, 0);
    // Update URL for navigation
    const base = import.meta.env.BASE_URL || "/";
    const newUrl = normalized === "home" ? base : `${base}${normalized}`;
    window.history.pushState(null, "", newUrl);
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
  if (route === "blogs")  return <Blogs onNavigate={onNavigate} />;
  if (route === "about")  return <About onNavigate={onNavigate} />;
  if (route === "sat")    return <SATIntro onNavigate={onNavigate} />;
  if (route === "sat-exam") return <SATExam onNavigate={onNavigate} {...(resultsPayload || {})} />;
  if (route === "sat-training") return <SATTraining onNavigate={onNavigate} />;
  if (route === "ai-educator") return <AIEducator onNavigate={onNavigate} />;
  if (route === "test")   return <Test onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "thanks") return <Thanks onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "admin-dashboard") return <AdminDashboard onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "admin-sat") return <SATAdmin onNavigate={onNavigate} />;
  if (route === "login")  return <Login onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "account") return <Account onNavigate={onNavigate} />;
  if (route === "select-results") return <SelectResults onNavigate={onNavigate} />;

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
  if (route === "sat-results") {
    if (!canViewResults) {
      return (
        <PageWrap>
          <HeaderBar title="Not Authorized" right={null} />
          <Card>
            <p style={{ color: "#6b7280" }}>
              SAT results are visible to administrators only.
            </p>
            <Btn variant="primary" onClick={() => onNavigate("home")}>Back to Home</Btn>
          </Card>
        </PageWrap>
      );
    }
    return <SATResults onNavigate={onNavigate} {...(resultsPayload || {})} />;
  }
  if (route === "admin-sat-training") return <SATTrainingAdmin onNavigate={onNavigate} />;

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
