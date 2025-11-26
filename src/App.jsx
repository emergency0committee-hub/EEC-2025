// src/App.jsx
import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import Blogs from "./pages/Blogs.jsx";
import About from "./pages/About.jsx";
import Home from "./pages/Home.jsx";
import Test from "./pages/Test.jsx";
import Results from "./pages/Results.jsx";
import SelectResults from "./pages/SelectResults.jsx";
import Login from "./pages/Login.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminQuestionBank from "./pages/admin/AdminQuestionBank.jsx";
import AdminManageUsers from "./pages/admin/AdminManageUsers.jsx";
import AdminCertificates from "./pages/admin/AdminCertificates.jsx";
import SATAdmin from "./pages/admin/SATDashboard.jsx";
import SATResults from "./pages/sat/SATResults.jsx";
import SATTrainingAdmin from "./pages/admin/SATTrainingDashboard.jsx";
import Thanks from "./pages/Thanks.jsx";
import Account from "./pages/Account.jsx";
import SATIntro from "./pages/sat/SATIntro.jsx";
import SATExam from "./pages/sat/SATExam.jsx";
import SATAssignment from "./pages/sat/SATAssignment.jsx";
import SATTraining from "./pages/sat/training/SATTraining.jsx";
import { PageWrap, HeaderBar, Card } from "./components/Layout.jsx";
import AIEducator from "./pages/AIEducator.jsx";
import VerifyCertificate from "./pages/VerifyCertificate.jsx";
import Btn from "./components/Btn.jsx";
import { normalizeRoute, routeHref, isModifiedEvent } from "./lib/routes.js";
// import { testSupabaseConnection } from "./lib/supabase.js";
import { supabase } from "./lib/supabase.js";

function SatPlaceholder() { return null; }

export default function App() {
  // Route state with localStorage persistence
  const [route, setRoute] = useState(() => {
    // Handle SPA redirect format (/?/route) produced by 404.html fallback
    const search = window.location.search || "";
    if (search.startsWith("?/")) {
      const query = search.slice(2);
      const [rawRoute, ...rest] = query.split("&");
      const decodedRoute = decodeURIComponent((rawRoute || "").replace(/~and~/g, "&"));
      const normalizedRoute = normalizeRoute(decodedRoute || "home");

      const extraQueryRaw = rest.join("&");
      const extraQuery = extraQueryRaw
        ? decodeURIComponent(extraQueryRaw.replace(/~and~/g, "&"))
        : "";
      const cleanPath = window.location.pathname.split("?")[0] || "/";
      const hash = window.location.hash || "";
      const rebuiltSearch = extraQuery ? `?${extraQuery}` : "";
      window.history.replaceState(null, "", `${cleanPath}${rebuiltSearch}${hash}`);
      return normalizedRoute || "home";
    }

    // Check for redirected path from older 404.html behaviour
    const urlParams = new URLSearchParams(window.location.search);
    const redirected = urlParams.get("/");
    if (redirected) {
      const next = redirected.startsWith("/") ? redirected.slice(1) : redirected;
      window.history.replaceState(null, "", window.location.pathname);
      return next || "home";
    }

    // Derive from current pathname (supports direct linking to nested routes)
    const base = import.meta.env.BASE_URL || "/";
    let path = window.location.pathname || "/";
    if (path.startsWith(base)) path = path.slice(base.length);
    const normalizedPath = String(path).replace(/^\/+/, "").trim();
    if (normalizedPath) return normalizedPath;

    // Fallback to saved route (excluding sensitive routes)
    try {
      const savedRoute = localStorage.getItem("cg_current_route");
      if (savedRoute && !["test", "results", "sat-exam", "sat-results", "sat-assignment"].includes(savedRoute)) {
        return savedRoute;
      }
    } catch {}

    return "home";
  });
  
  const [resultsPayload, setResultsPayload] = useState(null);
  const BASE_TITLE = "EEC";
  const SESSION_TIMEOUT_MINUTES = Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES || 60);
  const sessionTimeoutMs = Number.isFinite(SESSION_TIMEOUT_MINUTES) && SESSION_TIMEOUT_MINUTES > 0
    ? SESSION_TIMEOUT_MINUTES * 60 * 1000
    : null;
  // Global language state with localStorage persistence
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem("cg_lang");
      if (stored && ["EN", "FR"].includes(stored)) {
        return stored;
      }
    } catch {}
    return "EN";
  });

  // Persist language preference and set document direction
  useEffect(() => {
    try {
      localStorage.setItem("cg_lang", lang);
      // Set document direction (only LTR locales remain)
      document.documentElement.dir = "ltr";
      document.documentElement.lang = lang.toLowerCase();
    } catch (e) {
      console.warn("Failed to save language preference:", e);
    }
  }, [lang]);

  // Persist current route
  useEffect(() => {
    try {
      // Don't persist test or results routes
      if (!["test", "results", "sat-exam", "sat-assignment"].includes(route)) {
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
      const normalized = normalizeRoute(path) || "home";
      setRoute(normalized);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    let pageTitle = null;
    const participant =
      resultsPayload?.participant ||
      resultsPayload?.submission?.participant ||
      resultsPayload?.submission?.profile ||
      null;

    switch (route) {
      case "home":
        pageTitle = "Home";
        break;
      case "career":
        pageTitle = "Career Guidance";
        break;
      case "blogs":
        pageTitle = "Blogs";
        break;
      case "about":
        pageTitle = "About";
        break;
      case "test":
        pageTitle = "Career Guidance Test";
        break;
      case "thanks":
        pageTitle = "Thank You";
        break;
      case "login":
        pageTitle = "Sign In";
        break;
      case "account":
        pageTitle = "Account";
        break;
      case "admin-dashboard":
        pageTitle = "Career Dashboard";
        break;
      case "admin-sat":
        pageTitle = "SAT Dashboard";
        break;
      case "admin-sat-training":
        pageTitle = "SAT Training Analytics";
        break;
      case "sat":
        pageTitle = "SAT Diagnostic";
        break;
      case "sat-exam":
        pageTitle =
          resultsPayload?.practice?.title ||
          (resultsPayload?.practice?.kind
            ? `SAT ${String(resultsPayload.practice.kind).toUpperCase()}`
            : "SAT Exam");
        break;
      case "sat-training":
        pageTitle = "SAT Training";
        break;
      case "sat-results": {
        const name =
          participant?.name ||
          participant?.fullName ||
          resultsPayload?.submission?.title ||
          null;
        pageTitle = name ? `SAT Results (${name})` : "SAT Results";
        break;
      }
      case "results": {
        const name =
          participant?.name ||
          participant?.fullName ||
          resultsPayload?.submission?.title ||
          null;
        pageTitle = name ? `Career Results (${name})` : "Career Results";
        break;
      }
      case "select-results":
        pageTitle = "Results Directory";
        break;
      case "ai-educator":
        pageTitle = "AI Educator";
        break;
      case "sat-assignment":
        pageTitle = "SAT Assignment";
        break;
      default:
        pageTitle = route && route !== "home" ? route.replace(/-/g, " ") : null;
    }

    document.title = pageTitle ? `${BASE_TITLE} | ${pageTitle}` : BASE_TITLE;
  }, [route, resultsPayload]);

  const onNavigate = (to, data = null, event = null) => {
    const normalized = normalizeRoute(to);

    if (event && !event.defaultPrevented) {
      if (isModifiedEvent(event)) {
        return;
      }
      event.preventDefault?.();
    }

    setResultsPayload(data);
    setRoute(normalized);
    window.scrollTo(0, 0);
    // Update URL for navigation
    const newUrl = routeHref(normalized);
    window.history.pushState(null, "", newUrl);
  };

  useEffect(() => {
    if (!sessionTimeoutMs) return undefined;

    let timeoutId = null;

    const clearSession = async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      try {
        await supabase.auth.signOut();
      } catch {}
      try {
        localStorage.removeItem("cg_current_user_v1");
        localStorage.removeItem("cg_admin_ok_v1");
      } catch {}
      setResultsPayload(null);
      setRoute("login");
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert("You have been signed out due to inactivity. Please sign in again.");
      }
    };

    const resetTimer = () => {
      const hasUser = (() => {
        try { return Boolean(localStorage.getItem("cg_current_user_v1")); } catch { return false; }
      })();

      if (!hasUser) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        return;
      }
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(clearSession, sessionTimeoutMs);
    };

    const events = ["mousemove", "keydown", "click", "touchstart", "wheel"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      resetTimer();
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      authSub?.subscription?.unsubscribe?.();
    };
  }, [sessionTimeoutMs, setRoute, setResultsPayload]);

  const currentUser = (() => {
    try {
      const raw = localStorage.getItem("cg_current_user_v1");
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  })();
  const currentRole = (currentUser.role || "").toLowerCase();
  const currentAiAccess = Boolean(currentUser.ai_access);

  const canViewResults = useMemo(() => {
    try {
      if (localStorage.getItem("cg_admin_ok_v1") === "1") return true;
      return currentRole === "admin" || currentRole === "administrator" || currentRole === "staff";
    } catch {
      return false;
    }
  }, [route, currentRole]);

  const canAccessQuestionBank = canViewResults;
  const canAccessAIEducator = useMemo(() => {
    try {
      if (localStorage.getItem("cg_admin_ok_v1") === "1") return true;
    } catch {}
    if (currentRole === "admin" || currentRole === "administrator" || currentRole === "staff") {
      return true;
    }
    return currentRole === "educator" && currentAiAccess;
  }, [currentRole, currentAiAccess]);

  if (route === "home")   return <Home onNavigate={onNavigate} lang={lang} setLang={setLang} canAccessAIEducator={canAccessAIEducator} />;
  if (route === "career") return <Test onNavigate={onNavigate} lang={lang} setLang={setLang} {...(resultsPayload || {})} />;
  if (route === "blogs")  return <Blogs onNavigate={onNavigate} lang={lang} />;
  if (route === "about")  return <About onNavigate={onNavigate} lang={lang} />;
  if (route === "verify-certificate") return <VerifyCertificate onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "sat")    return <SATIntro onNavigate={onNavigate} />;
  if (route === "sat-exam") return <SATExam onNavigate={onNavigate} {...(resultsPayload || {})} />;
  if (route === "sat-assignment") return <SATAssignment onNavigate={onNavigate} {...(resultsPayload || {})} />;
  if (route === "sat-training") return <SATTraining onNavigate={onNavigate} {...(resultsPayload || {})} />;
  if (route === "ai-educator") {
    if (!canAccessAIEducator) {
      return (
        <PageWrap>
          <HeaderBar title="Educator Access Required" right={null} />
          <Card>
            <p style={{ color: "#6b7280" }}>
              AI Educator is limited to approved educators. Please contact an administrator if you need access.
            </p>
            <Btn variant="primary" to="home" onClick={(e) => onNavigate("home", null, e)}>
              Back to Home
            </Btn>
          </Card>
        </PageWrap>
      );
    }
    return <AIEducator onNavigate={onNavigate} />;
  }
  if (route === "test")   return <Test onNavigate={onNavigate} lang={lang} setLang={setLang} {...(resultsPayload || {})} />;
  if (route === "thanks") return <Thanks onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "admin-dashboard") return <AdminDashboard onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  if (route === "admin-manage-users") {
    if (!canViewResults) {
      return (
        <PageWrap>
          <HeaderBar title="Not Authorized" right={null} />
          <Card>
            <p style={{ color: "#6b7280" }}>
              User management is limited to administrators.
            </p>
            <Btn
              variant="primary"
              to="home"
              onClick={(e) => onNavigate("home", null, e)}
            >
              Back to Home
            </Btn>
          </Card>
        </PageWrap>
      );
    }
    return <AdminManageUsers onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  }
  if (route === "admin-question-bank") {
    if (!canAccessQuestionBank) {
      return (
        <PageWrap>
          <HeaderBar title="Not Authorized" right={null} />
          <Card>
            <p style={{ color: "#6b7280" }}>
              Question management is limited to administrators.
            </p>
            <Btn
              variant="primary"
              to="home"
              onClick={(e) => onNavigate("home", null, e)}
            >
              Back to Home
            </Btn>
          </Card>
        </PageWrap>
      );
    }
    return <AdminQuestionBank onNavigate={onNavigate} lang={lang} setLang={setLang} />;
  }
  if (route === "admin-certificates") {
    if (!canViewResults) {
      return (
        <PageWrap>
          <HeaderBar title="Not Authorized" right={null} />
          <Card>
            <p style={{ color: "#6b7280" }}>
              Certificate management is limited to administrators.
            </p>
            <Btn
              variant="primary"
              to="home"
              onClick={(e) => onNavigate("home", null, e)}
            >
              Back to Home
            </Btn>
          </Card>
        </PageWrap>
      );
    }
    return <AdminCertificates onNavigate={onNavigate} />;
  }
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
            <Btn
              variant="primary"
              to="home"
              onClick={(e) => onNavigate("home", null, e)}
            >
              Back to Home
            </Btn>
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
            <Btn
              variant="primary"
              to="home"
              onClick={(e) => onNavigate("home", null, e)}
            >
              Back to Home
            </Btn>
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
        <Btn
          variant="primary"
          to="home"
          onClick={(e) => onNavigate("home", null, e)}
        >
          Back Home
        </Btn>
      </Card>
    </PageWrap>
  );
}

