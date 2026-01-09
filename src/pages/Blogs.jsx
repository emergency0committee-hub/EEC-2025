// src/pages/Blogs.jsx
import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import UserMenu from "../components/UserMenu.jsx";
import { STR } from "../i18n/strings.js";
import ModalPortal from "../components/ModalPortal.jsx";

export default function Blogs({ onNavigate }) {
  Blogs.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const t = STR.EN;

  const ui = {
    heroTitle: "Blog",
    heroSubtitle: "News, resources, and updates from EEC.",
    searchPlaceholder: "Search posts...",
    allCategories: "All",
    featured: "Featured",
    latest: "Latest posts",
    read: "Read",
    close: "Close",
    noResults: "No posts match your search.",
    draftNote: "Draft content - replace with real posts when ready.",
  };
  const activeLang = "EN";

  const POSTS = [
    {
      id: "career-guidance-start",
      featured: true,
      date: "2025-01-10",
      category: { EN: "Career Guidance", FR: "Orientation" },
      title: {
        EN: "Getting Started with Career Guidance",
        FR: "Bien démarrer l’orientation",
      },
      excerpt: {
        EN: "How to approach interest assessments and use your results to explore pathways.",
        FR: "Comment aborder les évaluations d’intérêt et utiliser vos résultats pour explorer des parcours.",
      },
      content: {
        EN: [
          "Career guidance starts with self-awareness: interests, strengths, and values.",
          "Assessments can help you organize your thoughts, but the next step is exploring options and talking to mentors.",
          "Use your results as a starting point—then learn about roles, skills, and real-world pathways.",
        ],
        FR: [
          "L’orientation commence par la connaissance de soi : intérêts, forces et valeurs.",
          "Les évaluations aident à structurer la réflexion, puis vient l’exploration et l’échange avec des mentors.",
          "Utilisez les résultats comme point de départ — ensuite, renseignez-vous sur les métiers, les compétences et les parcours.",
        ],
      },
      readTime: "4 min",
    },
    {
      id: "sat-practice-plan",
      featured: false,
      date: "2025-01-18",
      category: { EN: "SAT Practice", FR: "Pratique SAT" },
      title: {
        EN: "A Simple SAT Practice Plan (Weekly)",
        FR: "Un plan simple de pratique SAT (hebdomadaire)",
      },
      excerpt: {
        EN: "A practical routine to build consistency: timed sets, review, and targeted drills.",
        FR: "Une routine pratique pour progresser : séries chronométrées, revue et exercices ciblés.",
      },
      content: {
        EN: [
          "Start small: two timed sets per week and one deep review session.",
          "Track mistakes by skill and re-practice similar questions.",
          "Consistency beats intensity—keep it sustainable.",
        ],
        FR: [
          "Commencez petit : deux séries chronométrées par semaine et une session de revue approfondie.",
          "Repérez les erreurs par compétence et refaites des questions similaires.",
          "La régularité vaut mieux que l’intensité — restez réaliste.",
        ],
      },
      readTime: "3 min",
    },
    {
      id: "reading-results",
      featured: false,
      date: "2025-02-02",
      category: { EN: "Assessment", FR: "Évaluation" },
      title: {
        EN: "How to Read Assessment Results",
        FR: "Comment lire les résultats d’évaluation",
      },
      excerpt: {
        EN: "A quick guide to interpreting scores, patterns, and what to do next.",
        FR: "Un guide rapide pour interpréter les scores, les tendances et les prochaines étapes.",
      },
      content: {
        EN: [
          "Look for patterns, not a single number.",
          "Compare strengths across areas and identify what motivates you.",
          "Turn insights into action: a short list of roles to explore and skills to build.",
        ],
        FR: [
          "Cherchez des tendances, pas un seul chiffre.",
          "Comparez les points forts et identifiez ce qui vous motive.",
          "Transformez les informations en actions : une liste de métiers à explorer et de compétences à développer.",
        ],
      },
      readTime: "5 min",
    },
    {
      id: "school-highlights",
      featured: false,
      date: "2025-02-10",
      category: { EN: "School Updates", FR: "Actualités écoles" },
      title: {
        EN: "Highlights from Partner Schools",
        FR: "Temps forts des écoles partenaires",
      },
      excerpt: {
        EN: "A snapshot of activities, workshops, and student achievements.",
        FR: "Un aperçu des activités, ateliers et réussites des élèves.",
      },
      content: {
        EN: [
          "We work with schools to deliver guidance activities and assessment sessions.",
          "This space will showcase workshop highlights and student outcomes.",
        ],
        FR: [
          "Nous travaillons avec des écoles pour organiser des activités d’orientation et des sessions d’évaluation.",
          "Cet espace présentera des temps forts d’ateliers et des résultats d’élèves.",
        ],
      },
      readTime: "2 min",
    },
  ];

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(ui.allCategories);
  const [openPostId, setOpenPostId] = useState(null);

  const categories = useMemo(() => {
    const set = new Set();
    POSTS.forEach((p) => {
      const c = p?.category?.[activeLang] || p?.category?.EN || "";
      if (c) set.add(c);
    });
    return [ui.allCategories, ...Array.from(set)];
  }, [activeLang, ui.allCategories]);

  const filteredPosts = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    return POSTS.filter((p) => {
      const title = (p?.title?.[activeLang] || p?.title?.EN || "").toLowerCase();
      const excerpt = (p?.excerpt?.[activeLang] || p?.excerpt?.EN || "").toLowerCase();
      const cat = p?.category?.[activeLang] || p?.category?.EN || "";
      const matchesCategory = activeCategory === ui.allCategories ? true : cat === activeCategory;
      const matchesQuery = !q ? true : title.includes(q) || excerpt.includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, activeLang, query, ui.allCategories]);

  const featuredPost = useMemo(() => filteredPosts.find((p) => p.featured) || null, [filteredPosts]);
  const latestPosts = useMemo(() => filteredPosts.filter((p) => !p.featured), [filteredPosts]);

  const formatDate = (iso) => {
    const d = new Date(String(iso || ""));
    if (!Number.isFinite(d.getTime())) return String(iso || "");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const openPost = useMemo(() => POSTS.find((p) => p.id === openPostId) || null, [POSTS, openPostId]);
  const openTitle =
    openPost?.title?.[activeLang] || openPost?.title?.EN || "";
  const openCategory =
    openPost?.category?.[activeLang] || openPost?.category?.EN || "";
  const openContent =
    openPost?.content?.[activeLang] || openPost?.content?.EN || [];

  return (
    <PageWrap>
      <HeaderBar
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/EEC_Logo.png" alt="Logo" style={{ height: 40, width: "auto", mixBlendMode: "multiply" }} />
            <span style={{ fontWeight: 600, fontSize: 18 }}>EEC</span>
          </div>
        }
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Btn variant="link" to="home" onClick={(e) => onNavigate("home", null, e)}>
                {t.navHome}
              </Btn>
              <Btn variant="link" to="about" onClick={(e) => onNavigate("about", null, e)}>
                {t.navAbout}
              </Btn>
              <Btn variant="link" to="blogs" onClick={(e) => onNavigate("blogs", null, e)}>
                {t.navBlogs}
              </Btn>
            </nav>
            <UserMenu onNavigate={onNavigate} />
          </div>
        }
      />

      <Card style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, alignItems: "start" }}>
          <div>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 28 }}>{ui.heroTitle}</h1>
            <p style={{ margin: "10px 0 0", color: "#4b5563", fontSize: 16 }}>{ui.heroSubtitle}</p>
            <div style={{ marginTop: 14 }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ui.searchPlaceholder}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                }}
              />
            </div>
            <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>{ui.draftNote}</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, background: "#f8fafc" }}>
            <div style={{ fontWeight: 800, color: "#111827", marginBottom: 10 }}>{t.navBlogs}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {categories.map((c) => (
                <Btn
                  key={c}
                  variant="secondary"
                  selected={activeCategory === c}
                  onClick={() => setActiveCategory(c)}
                  style={{ height: 34, minHeight: 34, padding: "0 12px" }}
                >
                  {c}
                </Btn>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="back" onClick={() => onNavigate("home")}>{t.backToHome}</Btn>
        </div>
      </Card>

      {featuredPost ? (
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#1e3a8a", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 10px", borderRadius: 999 }}>
                {ui.featured}
              </span>
              <span style={{ color: "#475569", fontSize: 13 }}>
                {featuredPost?.category?.[activeLang] || featuredPost?.category?.EN || ""} • {formatDate(featuredPost.date)} • {featuredPost.readTime}
              </span>
            </div>
          </div>
          <h2 style={{ margin: "10px 0 6px", color: "#111827" }}>
            {featuredPost?.title?.[activeLang] || featuredPost?.title?.EN || ""}
          </h2>
          <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6 }}>
            {featuredPost?.excerpt?.[activeLang] || featuredPost?.excerpt?.EN || ""}
          </p>
          <div style={{ marginTop: 12 }}>
            <Btn variant="primary" onClick={() => setOpenPostId(featuredPost.id)}>
              {ui.read}
            </Btn>
          </div>
        </Card>
      ) : null}

      <Card style={{ padding: 20 }}>
        <h3 style={{ margin: "0 0 12px", color: "#111827", fontSize: 18 }}>{ui.latest}</h3>
        {latestPosts.length === 0 ? (
          <div style={{ color: "#6b7280" }}>{ui.noResults}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {latestPosts.map((p) => {
              const cat = p?.category?.[activeLang] || p?.category?.EN || "";
              const title = p?.title?.[activeLang] || p?.title?.EN || "";
              const excerpt = p?.excerpt?.[activeLang] || p?.excerpt?.EN || "";
              return (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ color: "#1e3a8a", fontWeight: 800, fontSize: 12 }}>{cat}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{formatDate(p.date)} • {p.readTime}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: "#111827", fontSize: 16, lineHeight: 1.25 }}>{title}</div>
                  <div style={{ color: "#4b5563", fontSize: 13, lineHeight: 1.55 }}>{excerpt}</div>
                  <div style={{ marginTop: "auto" }}>
                    <Btn variant="secondary" onClick={() => setOpenPostId(p.id)}>
                      {ui.read}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {openPost ? (
        <ModalPortal>
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setOpenPostId(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.78)",
              zIndex: 2000,
              padding: 16,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: "min(760px, 96vw)" }}>
              <Card style={{ marginBottom: 0, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "#1e3a8a", fontWeight: 800, fontSize: 12, marginBottom: 6 }}>
                    {openCategory} • {formatDate(openPost.date)} • {openPost.readTime}
                  </div>
                  <h2 style={{ margin: 0, color: "#111827" }}>{openTitle}</h2>
                </div>
                <Btn variant="secondary" onClick={() => setOpenPostId(null)} style={{ height: 36, minHeight: 36 }}>
                  {ui.close}
                </Btn>
              </div>
              <div style={{ marginTop: 14, display: "grid", gap: 10, color: "#374151", lineHeight: 1.7 }}>
                {Array.isArray(openContent) ? openContent.map((p) => <p key={p} style={{ margin: 0 }}>{p}</p>) : null}
              </div>
              </Card>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </PageWrap>
  );
}

