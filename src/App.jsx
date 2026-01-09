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
import AdminLiveMonitor from "./pages/admin/AdminLiveMonitor.jsx";
import AdminTickets from "./pages/admin/AdminTickets.jsx";
import WeeklyReports from "./pages/admin/WeeklyReports.jsx";
import InternalComms from "./pages/admin/InternalComms.jsx";
import SATAdmin from "./pages/admin/SATDashboard.jsx";
import SATResults from "./pages/sat/SATResults.jsx";
import SATTrainingAdmin from "./pages/admin/SATTrainingDashboard.jsx";
import Thanks from "./pages/Thanks.jsx";
import Account from "./pages/Account.jsx";
import SATIntro from "./pages/sat/SATIntro.jsx";
import SATReadingCompetitionIntro from "./pages/sat/SATReadingCompetitionIntro.jsx";
import SATReadingCompetitionMode from "./pages/sat/SATReadingCompetitionMode.jsx";
import SATExam from "./pages/sat/SATExam.jsx";
import SATAssignment from "./pages/sat/SATAssignment.jsx";
import SATTraining from "./pages/sat/training/SATTraining.jsx";
import FunctionsAndDecimalsInteractive from "./pages/sat/lessons/FunctionsAndDecimalsInteractive.jsx";
import PolynomialsInteractive from "./pages/sat/lessons/PolynomialsInteractive.jsx";
import SolvingEquationsInteractive from "./pages/sat/lessons/SolvingEquationsInteractive.jsx";
import QuadraticEquationsInteractive from "./pages/sat/lessons/QuadraticEquationsInteractive.jsx";
import WordProblemsInteractive from "./pages/sat/lessons/WordProblemsInteractive.jsx";
import SchoolTraining from "./pages/SchoolTraining.jsx";
import FeatureIntro from "./pages/FeatureIntro.jsx";
import OccupationScaleFull from "./pages/results/OccupationScaleFull.jsx";
import { PageWrap, HeaderBar, Card } from "./components/Layout.jsx";
import { AppProviders } from "./components/AppProviders.jsx";
import AIEducator from "./pages/AIEducator.jsx";
import AIEducatorForm from "./pages/aiEducator/AIEducatorForm.jsx";
import VerifyCertificate from "./pages/VerifyCertificate.jsx";
import Btn from "./components/Btn.jsx";
import { normalizeRoute, routeHref, isModifiedEvent } from "./lib/routes.js";
// import { testSupabaseConnection } from "./lib/supabase.js";
import { supabase } from "./lib/supabase.js";
import HelperBot from "./components/HelperBot.jsx";

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
  const [lastResultsPayload, setLastResultsPayload] = useState(() => {
    try {
      const raw = sessionStorage.getItem("cg_last_results_payload");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const BASE_TITLE = "EEC";
  const SESSION_TIMEOUT_MINUTES = Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES || 60);
  const sessionTimeoutMs = Number.isFinite(SESSION_TIMEOUT_MINUTES) && SESSION_TIMEOUT_MINUTES > 0
    ? SESSION_TIMEOUT_MINUTES * 60 * 1000
    : null;

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
      case "intro-career":
        pageTitle = "Career Guidance Intro";
        break;
      case "intro-sat-testing":
        pageTitle = "SAT Testing Intro";
        break;
      case "intro-sat-training":
        pageTitle = "SAT Training Intro";
        break;
      case "intro-school-training":
        pageTitle = "School Training Intro";
        break;
      case "intro-ai-educator":
        pageTitle = "AI Educator Intro";
        break;
      case "intro-verify-certificate":
        pageTitle = "Verify Certificate Intro";
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
      case "career-dashboard":
        pageTitle = "Career Dashboard";
        break;
      case "internal-tickets":
      case "internal-ticket":
      case "admin-tickets":
      case "tickets":
        pageTitle = "Internal Tickets";
        break;
      case "weekly-report":
      case "weekly-reports":
        pageTitle = "Weekly Report";
        break;
      case "internal-comms":
      case "internal-communications":
        pageTitle = "Internal Communication";
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
      case "sat-reading-competition":
        pageTitle = "SAT Reading Competition";
        break;
      case "sat-reading-competition-mode":
        pageTitle = "Competition Mode";
        break;
      case "sat-exam":
        pageTitle =
          resultsPayload?.contextTitle ||
          resultsPayload?.practice?.title ||
          (resultsPayload?.practice?.kind
            ? `SAT ${String(resultsPayload.practice.kind).toUpperCase()}`
            : "SAT Exam");
        break;
      case "sat-training":
        pageTitle = "SAT Training";
        break;
      case "school-training":
        pageTitle = "School Training";
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
      case "ai-form":
        pageTitle = "Student Form";
        break;
      case "sat-assignment":
        pageTitle = "SAT Assignment";
        break;
      default:
        pageTitle = route && route !== "home" ? route.replace(/-/g, " ") : null;
    }

    document.title = pageTitle ? `${BASE_TITLE} | ${pageTitle}` : BASE_TITLE;
  }, [route, resultsPayload]);

  useEffect(() => {
    if (route === "results" && resultsPayload) {
      setLastResultsPayload(resultsPayload);
      try {
        sessionStorage.setItem("cg_last_results_payload", JSON.stringify(resultsPayload));
      } catch {}
    }
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

  const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");
  const normalizeSchool = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");
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
  const currentEmail = normalizeEmail(currentUser.email || currentUser.user_email || "");
  const currentAiAccess = Boolean(currentUser.ai_access);
  const currentSchool = normalizeSchool(currentUser.school || currentUser.school_name || currentUser.organization || currentUser.org || currentUser.company || "");

  const extractResultEmail = (payload) => {
    if (!payload) return "";
    const submission = payload.submission || payload;
    const participant =
      submission?.participant ||
      submission?.profile ||
      payload.participant ||
      {};
    return (
      submission?.user_email ||
      payload?.user_email ||
      participant?.email ||
      participant?.contactEmail ||
      participant?.guardianEmail ||
      participant?.parentEmail ||
      ""
    );
  };
  const extractResultSchool = (payload) => {
    if (!payload) return "";
    const submission = payload.submission || payload;
    const participant =
      submission?.participant ||
      submission?.profile ||
      payload.participant ||
      {};
    return (
      participant?.school ||
      submission?.school ||
      submission?.profile?.school ||
      payload?.school ||
      ""
    );
  };

  const canViewResults = useMemo(() => {
    try {
      if (localStorage.getItem("cg_admin_ok_v1") === "1") return true;
      return currentRole === "admin" || currentRole === "administrator" || currentRole === "staff";
    } catch {
      return false;
    }
  }, [route, currentRole]);

  const canViewOwnResult = useMemo(() => {
    if (!currentEmail) return false;
    const candidateEmail = normalizeEmail(
      extractResultEmail(resultsPayload) || extractResultEmail(lastResultsPayload)
    );
    return Boolean(candidateEmail && candidateEmail === currentEmail);
  }, [resultsPayload, lastResultsPayload, currentEmail]);
  const canViewSchoolResult = useMemo(() => {
    if (currentRole !== "school" || !currentSchool) return false;
    const candidateSchool = normalizeSchool(
      extractResultSchool(resultsPayload) || extractResultSchool(lastResultsPayload)
    );
    return Boolean(candidateSchool) && candidateSchool === currentSchool;
  }, [resultsPayload, lastResultsPayload, currentRole, currentSchool]);

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
  const canAccessTickets = useMemo(() => {
    try {
      if (localStorage.getItem("cg_admin_ok_v1") === "1") return true;
    } catch {}
    return currentRole === "admin" || currentRole === "administrator" || currentRole === "staff";
  }, [currentRole]);

  const recentRoutes = [];

  const renderPage = () => {
    if (route === "home")   return <Home onNavigate={onNavigate} canAccessAIEducator={canAccessAIEducator} />;
    if (route === "career") return <Test onNavigate={onNavigate} {...(resultsPayload || {})} />;
    if (route === "blogs")  return <Blogs onNavigate={onNavigate} />;
    if (route === "about")  return <About onNavigate={onNavigate} />;
    if (route === "verify-certificate") return <VerifyCertificate onNavigate={onNavigate} />;
    if (route === "sat")    return <SATIntro onNavigate={onNavigate} />;
    if (route === "sat-reading-competition") return <SATReadingCompetitionIntro onNavigate={onNavigate} />;
    if (route === "sat-reading-competition-mode") return <SATReadingCompetitionMode onNavigate={onNavigate} />;
    if (route === "sat-exam") return <SATExam onNavigate={onNavigate} {...(resultsPayload || {})} />;
    if (route === "sat-assignment") return <SATAssignment onNavigate={onNavigate} {...(resultsPayload || {})} />;
    if (route === "sat-training") return <SATTraining onNavigate={onNavigate} {...(resultsPayload || {})} />;
    if (route === "intro-career") return <FeatureIntro onNavigate={onNavigate} feature="career" />;
    if (route === "intro-sat-testing") return <FeatureIntro onNavigate={onNavigate} feature="satTesting" />;
    if (route === "intro-sat-training") return <FeatureIntro onNavigate={onNavigate} feature="satTraining" />;
    if (route === "intro-school-training") return <FeatureIntro onNavigate={onNavigate} feature="schoolTraining" />;
    if (route === "intro-ai-educator") return <FeatureIntro onNavigate={onNavigate} feature="aiEducator" />;
    if (route === "intro-verify-certificate") return <FeatureIntro onNavigate={onNavigate} feature="verify" />;
    if (route === "sat-lesson-functions-decimals") return <FunctionsAndDecimalsInteractive onNavigate={onNavigate} />;
    if (["sat-lesson-polynomials", "sat-lesson-polynomial", "sat-lesson-polynomail", "sat-lesson-polynomails"].includes(route)) {
      return <PolynomialsInteractive onNavigate={onNavigate} />;
    }
    if (["sat-lesson-solving-equations", "sat-lesson-solving-equation", "sat-lesson-solve-equations", "sat-lesson-solve-equation"].includes(route)) {
      return <SolvingEquationsInteractive onNavigate={onNavigate} />;
    }
    if (["sat-lesson-quadratic-equations", "sat-lesson-quadratic-equation", "sat-lesson-quadratics", "sat-lesson-quadratic"].includes(route)) {
      return <QuadraticEquationsInteractive onNavigate={onNavigate} />;
    }
    if (["sat-lesson-word-problems", "sat-lesson-word-problem", "sat-lesson-wordproblem", "sat-lesson-wordproblems"].includes(route)) {
      return <WordProblemsInteractive onNavigate={onNavigate} />;
    }
    if (route === "school-training") return <SchoolTraining onNavigate={onNavigate} />;
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
    if (route === "ai-form") return <AIEducatorForm onNavigate={onNavigate} />;
    if (route === "test")   return <Test onNavigate={onNavigate} {...(resultsPayload || {})} />;
    if (route === "thanks") return <Thanks onNavigate={onNavigate} />;
    if (route === "career-dashboard") return <AdminDashboard onNavigate={onNavigate} />;
    if (route === "admin-live-monitor") return <AdminLiveMonitor onNavigate={onNavigate} />;
    if (["internal-tickets", "internal-ticket", "admin-tickets", "tickets"].includes(route)) {
      if (!canAccessTickets) {
        return (
          <PageWrap>
            <HeaderBar title="Not Authorized" right={null} />
            <Card>
              <p style={{ color: "#6b7280" }}>
                Internal tickets are limited to staff and administrators.
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
      return <AdminTickets onNavigate={onNavigate} />;
    }
    if (["weekly-report", "weekly-reports"].includes(route)) {
      if (!canAccessTickets) {
        return (
          <PageWrap>
            <HeaderBar title="Not Authorized" right={null} />
            <Card>
              <p style={{ color: "#6b7280" }}>
                Weekly reports are limited to staff and administrators.
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
      return <WeeklyReports onNavigate={onNavigate} />;
    }
    if (["internal-comms", "internal-communications"].includes(route)) {
      if (!canAccessTickets) {
        return (
          <PageWrap>
            <HeaderBar title="Not Authorized" right={null} />
            <Card>
              <p style={{ color: "#6b7280" }}>
                Internal communication is limited to staff and administrators.
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
      return <InternalComms onNavigate={onNavigate} />;
    }
    if (route === "admin-manage-users") {
      if (!canViewResults && !canViewOwnResult) {
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
      return <AdminManageUsers onNavigate={onNavigate} />;
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
      return <AdminQuestionBank onNavigate={onNavigate} />;
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
    if (route === "login")  return <Login onNavigate={onNavigate} />;
    if (route === "account") return <Account onNavigate={onNavigate} />;
    if (route === "select-results") return <SelectResults onNavigate={onNavigate} />;

    if (route === "occupation-scales-full") {
      if (!canViewResults && !canViewOwnResult && !canViewSchoolResult) {
        return (
          <PageWrap>
            <HeaderBar title="Not Authorized" right={null} />
            <Card>
              <p style={{ color: "#6b7280" }}>
                Occupational matches are visible to administrators or the candidate assigned to this report.
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
      const payload =
        resultsPayload ||
        (() => {
          try {
            const raw = sessionStorage.getItem("cg_occ_full_payload");
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })();
      const backPayload =
        lastResultsPayload ||
        (() => {
          try {
            const raw = sessionStorage.getItem("cg_last_results_payload");
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })();
      if (!payload) {
        return (
          <PageWrap>
            <HeaderBar title="No Data" right={null} />
            <Card>
              <p style={{ color: "#6b7280" }}>
                We couldn&rsquo;t find the occupation list. Please return to the results page and try again.
              </p>
              <Btn
                variant="primary"
                to="results"
                onClick={(e) => onNavigate("results", backPayload, e)}
              >
                Back to Results
              </Btn>
            </Card>
          </PageWrap>
        );
      }
      return (
        <OccupationScaleFull
          payload={payload}
          canGoBack={backPayload}
          isAdmin={canViewResults}
          onNavigate={(to, data, event) => onNavigate(to, data ?? backPayload, event)}
        />
      );
    }

    if (route === "results") {
      if (!canViewResults && !canViewOwnResult && !canViewSchoolResult) {
        return (
          <PageWrap>
            <HeaderBar title="Not Authorized" right={null} />
            <Card>
              <p style={{ color: "#6b7280" }}>
                You are not authorized to view this result.
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
        <HelperBot currentRoute={route} onNavigate={onNavigate} recentRoutes={recentRoutes} />
      </PageWrap>
    );
  };

  return <AppProviders>{renderPage()}</AppProviders>;
}
