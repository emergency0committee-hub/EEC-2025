import React, { useEffect, useMemo, useState } from "react";
import RiasecHeroSection from "./results/components/RiasecHeroSection.jsx";
import BasicInterestScales from "./results/components/BasicInterestScales.jsx";
import PillarSummaryCards from "./results/components/PillarSummaryCards.jsx";
import { THEME_COLORS } from "../components/Chart.jsx";
import OccupationScales from "../components/OccupationScales.jsx";
import { PageWrap } from "../components/Layout.jsx";
import HeaderCard from "./results/components/HeaderCard.jsx";
import CandidateDetailsCard from "./results/components/CandidateDetailsCard.jsx";
import { loadOccupations } from "../lib/occupations.js";
import { supabase } from "../lib/supabase.js";

/**
 * Minimal rebuild: header + candidate details.
 * Fetches cg_results by resultId and hydrates with profiles data.
 */
export default function Results({ resultId, participant, submission = null, onNavigate, fromAdmin = false }) {
  const [participantData, setParticipantData] = useState(participant || null);
  const [resultData, setResultData] = useState(
    participant
      ? {
          radarData: participant?.radar_data || [],
          areaPercents: participant?.area_percents || [],
          pillarAgg: participant?.pillar_agg || {},
          pillarCounts: participant?.pillar_counts || {},
        }
      : null
  );
  const resolvedResultId = resultId || submission?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [occupations, setOccupations] = useState([]);
  const [topOccIndex, setTopOccIndex] = useState(0);
  const [topOccAnim, setTopOccAnim] = useState("top-occ-slide-left");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "top-occ-slide-animations";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes top-occ-slide-left {
        from { opacity: 0; transform: translateX(40px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes top-occ-slide-right {
        from { opacity: 0; transform: translateX(-40px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Seed from submission payload (when navigated from dashboard)
  useEffect(() => {
    if (!submission) return;
    const subParticipant = submission.participant || submission.profile || {};
    setParticipantData({
      ...subParticipant,
      class_name: subParticipant.class_name || submission.profile?.class_name || subParticipant.grade,
      phone: subParticipant.phone || submission.profile?.phone,
      email: subParticipant.email || submission.profile?.email || submission.user_email,
    });
    setResultData({
      radarData: submission.radar_data || [],
      areaPercents: submission.area_percents || [],
      pillarAgg: submission.pillar_agg || {},
      pillarCounts: submission.pillar_counts || {},
      answers: submission.answers || {},
      durationSeconds:
        submission.duration_sec ??
        (typeof submission.duration_minutes === "number" ? submission.duration_minutes * 60 : undefined),
    });
  }, [submission]);

  useEffect(() => {
    if (!resolvedResultId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: resultRow, error: resultErr } = await supabase
          .from("cg_results")
          .select("*")
          .eq("id", resolvedResultId)
          .single();
        if (resultErr) throw resultErr;

        let profile = null;
        const lookupEmail = resultRow?.user_email || resultRow?.email || participantObj?.email;
        if (lookupEmail) {
          const { data: profileRows } = await supabase
            .from("profiles")
            .select(
              "email, full_name, name, username, school, school_name, organization, org, company, class_name, phone"
            )
            .eq("email", lookupEmail)
            .limit(1);
          profile = Array.isArray(profileRows) && profileRows.length ? profileRows[0] : null;
        }

        const participantObj = resultRow?.participant || {};
        const merged = {
          ...participantObj,
          name: profile?.full_name || profile?.name || participantObj?.name,
          full_name: profile?.full_name || participantObj?.full_name,
          username: profile?.username || participantObj?.username,
          class_name: profile?.class_name || participantObj?.class_name,
          email: lookupEmail || participantObj?.email || profile?.email,
          phone: participantObj?.phone || profile?.phone,
          school:
            profile?.school ||
            profile?.school_name ||
            profile?.organization ||
            profile?.org ||
            profile?.company ||
            participantObj?.school,
          ts: resultRow?.ts || resultRow?.created_at,
        };

        setParticipantData(merged);
        setResultData({
          radarData: resultRow?.radar_data || [],
          areaPercents: resultRow?.area_percents || [],
          pillarAgg: resultRow?.pillar_agg || {},
          pillarCounts: resultRow?.pillar_counts || {},
          answers: resultRow?.answers || {},
          durationSeconds:
            resultRow?.duration_sec ??
            (typeof resultRow?.duration_minutes === "number" ? resultRow.duration_minutes * 60 : undefined) ??
            participantObj?.duration_sec ??
            (typeof participantObj?.duration_minutes === "number"
              ? participantObj.duration_minutes * 60
              : undefined),
        });
      } catch (err) {
        setError(err.message || "Failed to load result.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [resolvedResultId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await loadOccupations({ force: true, cacheBuster: Date.now() });
      if (alive) setOccupations(Array.isArray(rows) ? rows : []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = [
    { label: "Email", value: participantData?.email || "-" },
    { label: "School", value: participantData?.school || "-" },
    {
      label: "Grade/Class",
      value: participantData?.class_name || "-",
    },
    { label: "Phone", value: participantData?.phone || "-" },
  ];

  const radarData = resultData?.radarData || [];
  const areaPercents = resultData?.areaPercents || [];
  const pillarAgg = resultData?.pillarAgg || {};
  const pillarCounts = resultData?.pillarCounts || {};
  const answersObj = resultData?.answers || {};
  const answeredCount = Object.keys(answersObj || {}).length;
  const totalQuestions = 300;
  const answeredPct = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
  const durationSeconds = (() => {
    // prefer explicit duration fields
    const d = resultData?.durationSeconds;
    if (typeof d === "number" && Number.isFinite(d)) return d;
    // fallback to participant duration_sec
    const pDur = participantData?.duration_sec;
    if (typeof pDur === "number" && Number.isFinite(pDur)) return pDur;
    // fallback: compute from started/finished timestamps if available
    const start = participantData?.started_at ? new Date(participantData.started_at).getTime() : null;
    const end = participantData?.finished_at ? new Date(participantData.finished_at).getTime() : null;
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return Math.round((end - start) / 1000);
    }
    return null;
  })();
  const durationMinutes =
    typeof durationSeconds === "number" && Number.isFinite(durationSeconds) ? durationSeconds / 60 : null;
  const isIncomplete =
    (durationMinutes != null && durationMinutes < 30) || answeredPct < 0.8;

  const themeOrder = useMemo(
    () => [...radarData].sort((a, b) => b.score - a.score).map((d) => d.code),
    [radarData]
  );

  const radarByCode = useMemo(() => {
    const m = {};
    (radarData || []).forEach((d) => {
      m[d.code] = d.score ?? 0;
    });
    return m;
  }, [radarData]);

  const groupedAreas = useMemo(() => {
    const g = {};
    (areaPercents || []).forEach((a) => {
      if (!g[a.code]) g[a.code] = [];
      g[a.code].push(a);
    });
    Object.keys(g).forEach((k) => g[k].sort((x, y) => y.percent - x.percent));
    return g;
  }, [areaPercents]);

  const THEME_NAMES = {
    R: "Realistic",
    I: "Investigative",
    A: "Artistic",
    S: "Social",
    E: "Enterprising",
    C: "Conventional",
  };

  const scoreFromTheme = (themeStr = "") => {
    const weights = [0.6, 0.25, 0.15];
    const letters = String(themeStr || "")
      .toUpperCase()
      .replace(/[^RIASEC]/g, "")
      .split("");
    if (!letters.length) return 0;
    let score = 0;
    for (let i = 0; i < Math.min(3, letters.length); i++) {
      const L = letters[i];
      const pct = radarByCode[L] ?? 0;
      score += pct * weights[i];
    }
    return score;
  };

  const scoredOccupations = useMemo(() => {
    return (occupations || []).map((occ) => ({
      ...occ,
      _score: scoreFromTheme(occ.theme, radarByCode),
    }));
  }, [occupations, radarByCode]);

  const topFiveOcc = useMemo(
    () => [...scoredOccupations].sort((a, b) => b._score - a._score).slice(0, 5),
    [scoredOccupations]
  );
  const leastFiveOcc = useMemo(
    () => [...scoredOccupations].sort((a, b) => a._score - b._score).slice(0, 5),
    [scoredOccupations]
  );
  useEffect(() => {
    if (!topFiveOcc.length) {
      if (topOccIndex !== 0) setTopOccIndex(0);
      return;
    }
    if (topOccIndex >= topFiveOcc.length) {
      setTopOccIndex(0);
    }
  }, [topFiveOcc, topOccIndex]);

  const topOccupation = useMemo(
    () => (topFiveOcc.length ? topFiveOcc[Math.min(topOccIndex, topFiveOcc.length - 1)] : null),
    [topFiveOcc, topOccIndex]
  );
  const themeColorFor = (themeStr) => {
    const letter = String(themeStr || "").toUpperCase().replace(/[^RIASEC]/g, "").charAt(0);
    return THEME_COLORS?.[letter] || "#0f172a";
  };

  const handleTopOccNav = (direction) => {
    if (!topFiveOcc.length) return;
    setTopOccAnim(direction === "prev" ? "top-occ-slide-right" : "top-occ-slide-left");
    setTopOccIndex((prev) => {
      if (!topFiveOcc.length) return 0;
      if (direction === "prev") {
        return (prev - 1 + topFiveOcc.length) % topFiveOcc.length;
      }
      return (prev + 1) % topFiveOcc.length;
    });
  };

  const parseMaybe = (val) => {
    if (val == null) return null;
    if (typeof val === "object") return val;
    if (typeof val !== "string") return val;
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        try {
          return JSON.parse(trimmed.replace(/'/g, '"'));
        } catch {
          return trimmed;
        }
      }
    }
    return trimmed;
  };

  const normalizeArray = (val) => {
    const parsed = parseMaybe(val);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string" && parsed.length) return [parsed];
    return [];
  };

  const renderDictBlock = (
    title,
    dictVal,
    headerColor = "#2563eb",
    categoryColor = "#38bdf8",
    options = {}
  ) => {
    const { hideTitle = false } = options || {};
    const parsed = parseMaybe(dictVal);
    if (!parsed) return null;
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      // fallback: simple string or list
      const items = normalizeArray(parsed);
      if (!items.length) return null;
      return (
        <div style={{ color: "#4b5563", lineHeight: 1.5 }}>
          {!hideTitle && (
            <>
              <strong>{title}:</strong>{" "}
            </>
          )}
          {items.join(", ")}
        </div>
      );
    }
    const entries = Object.entries(parsed);
    if (!entries.length) return null;
    return (
      <div style={{ color: "#4b5563", lineHeight: 1.5 }}>
        {!hideTitle && <strong style={{ color: headerColor }}>{title}:</strong>}
        <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
          {entries.map(([key, vals], idx) => (
            <li key={idx} style={{ margin: "2px 0" }}>
              <span style={{ fontWeight: 700, color: categoryColor }}>{key}:</span>{" "}
              {Array.isArray(vals) ? vals.join(", ") : String(vals)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderPersonality = (personality, headerColor = "#2563eb", options = {}) => {
    const { hideTitle = false } = options || {};
    const parsed = parseMaybe(personality);
    if (!parsed || typeof parsed !== "object") return null;
    const intro = parsed.intro || parsed.summary || null;
    const traits = normalizeArray(parsed.traits);
    if (!intro && !traits.length) return null;
    return (
      <div style={{ color: "#4b5563", lineHeight: 1.5 }}>
        {!hideTitle && <strong style={{ color: headerColor }}>Personality:</strong>}
        {intro && <div style={{ marginTop: 2 }}>{intro}</div>}
        {traits.length > 0 && (
          <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
            {traits.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderTech = (tech, headerColor = "#2563eb", categoryColor = "#38bdf8", options = {}) => {
    const { hideTitle = false } = options || {};
    const parsed = parseMaybe(tech);
    if (!parsed) return null;
    const intro = parsed.intro || null;
    const categories = parsed.categories && typeof parsed.categories === "object" ? parsed.categories : null;
    if (!intro && !categories) return null;
    return (
      <div style={{ color: "#4b5563", lineHeight: 1.5 }}>
        {!hideTitle && <strong style={{ color: headerColor }}>Technology / Tools:</strong>}
        {intro && <div style={{ marginTop: 2 }}>{intro}</div>}
        {categories && (
          <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
            {Object.entries(categories).map(([cat, items], idx) => (
              <li key={idx}>
                <span style={{ fontWeight: 700, color: categoryColor }}>{cat}:</span>{" "}
                {Array.isArray(items) ? items.join(", ") : String(items)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const sections = useMemo(() => {
    const maxScore = 5;
    const makeRows = (totals = {}, counts = {}) =>
      Object.entries(totals).map(([label, sum]) => {
        const count = counts[label] || 0;
        const pct = count > 0 ? Math.round((Number(sum || 0) / (count * maxScore)) * 100) : 0;
        return [label, pct];
      });

    return [
      {
        title: "DISC",
        data: makeRows(pillarAgg.disc || {}, pillarCounts.discCount || {}),
        color: "#6366f1",
        insight: { title: "DISC insights" },
      },
      {
        title: "Bloom",
        data: makeRows(pillarAgg.bloom || {}, pillarCounts.bloomCount || {}),
        color: "#06b6d4",
        insight: { title: "Bloom insights" },
      },
      {
        title: "UN SDG",
        data: makeRows(pillarAgg.sdg || {}, pillarCounts.sdgCount || {}),
        color: "#f59e0b",
        insight: { title: "SDG insights" },
      },
    ];
  }, [pillarAgg, pillarCounts]);

  const parseSalaryValue = (val) => {
    if (val == null) return null;
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : null;
    }
    return null;
  };

  const renderSalarySection = (lowRaw, typicalRaw, highRaw, accent) => {
    const low = parseSalaryValue(lowRaw);
    const typical = parseSalaryValue(typicalRaw);
    const high = parseSalaryValue(highRaw);
    if (!low && !typical && !high) return null;

    if (!(low && typical && high) || high <= low) {
      const text = [low ? `Low: ${lowRaw}` : null, typical ? `Typical: ${typicalRaw}` : null, high ? `High: ${highRaw}` : null]
        .filter(Boolean)
        .join(" | ");
      return text || null;
    }

    const width = 360;
    const height = 130;
    const baseline = height - 30;
    const typicalX = ((typical - low) / (high - low)) * width;
    const accentColor = accent || "#0ea5e9";
    const gradientId = `salaryGradient-${(accentColor || "").replace(/[^a-zA-Z0-9]/g, "")}`;
    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    const lowFormatted = formatter.format(low);
    const typicalFormatted = formatter.format(typical);
    const highFormatted = formatter.format(high);

    const a = width - 2 * typicalX;
    const b = 2 * typicalX;
    const c = -typicalX;
    let t = 0.5;
    if (Math.abs(a) > 1e-6) {
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const tCandidate1 = (-b + sqrtDisc) / (2 * a);
        const tCandidate2 = (-b - sqrtDisc) / (2 * a);
        const candidates = [tCandidate1, tCandidate2].filter((val) => val >= 0 && val <= 1);
        if (candidates.length) {
          t = candidates.reduce((prev, curr) => (Math.abs(curr - 0.5) < Math.abs(prev - 0.5) ? curr : prev), candidates[0]);
        }
      }
    }
    const controlY = height * 0.1;
    const typicalY =
      (1 - t) * (1 - t) * baseline +
      2 * (1 - t) * t * controlY +
      t * t * baseline;

    const ticks = [
      { label: "Low", x: 0, text: lowFormatted, dashEnd: baseline + 6 },
      { label: "Typical", x: typicalX, text: typicalFormatted, dashEnd: typicalY },
      { label: "High", x: width, text: highFormatted, dashEnd: baseline + 6 },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.45" />
              <stop offset="80%" stopColor={accentColor} stopOpacity="0.05" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M0 ${baseline} Q ${typicalX} ${controlY} ${width} ${baseline} L ${width} ${height} L 0 ${height} Z`}
            fill={`url(#${gradientId})`}
          />
          <path
            d={`M0 ${baseline} Q ${typicalX} ${controlY} ${width} ${baseline}`}
            fill="none"
            stroke={accentColor}
            strokeWidth="3"
          />
          {ticks.map((mark) => (
            <g key={mark.label}>
              <line
                x1={mark.x}
                x2={mark.x}
                y1={baseline}
                y2={mark.dashEnd}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={mark.x}
                y={baseline + 18}
                textAnchor={mark.label === "Low" ? "start" : mark.label === "High" ? "end" : "middle"}
                fontSize="13"
                fill="#475569"
              >
                {mark.text}
              </text>
            </g>
          ))}
          <circle cx={typicalX} cy={typicalY} r="6" fill={accentColor} />
          <text x={typicalX} y={typicalY - 10} textAnchor="middle" fontSize="11" fill={accentColor}>
            Typical
          </text>
        </svg>
      </div>
    );
  };

  const renderEducationSection = (educationRaw, accent) => {
    if (!educationRaw) return null;
    const match = educationRaw.match(/rated\s*(\d+(?:\.\d+)?)\s*(?:out\s+of|of|\/)?\s*5/i);
    const rating = match ? Math.max(0, Math.min(5, parseFloat(match[1]))) : null;
    const cleanedText = match ? educationRaw.replace(match[0], "").replace(/[()]/g, "").trim() : educationRaw;

    if (rating == null) {
      return <span>{cleanedText}</span>;
    }

    const rounded = Math.round(rating * 10) / 10;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", gap: 4 }}>
            {[0, 1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: 10,
                  borderRadius: 4,
                  background: idx < Math.round(rating) ? (accent || "#0ea5e9") : "#f3f4f6",
                  boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.08)",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 13, color: "#475569", minWidth: 60, textAlign: "right" }}>{rounded} / 5</span>
        </div>
        {cleanedText && (
          <span style={{ color: "#475569", display: "block", marginTop: 4, lineHeight: 1.4 }}>{cleanedText}</span>
        )}
      </div>
    );
  };

  const renderSection = (title, icon, body, accent) => {
    if (!body) return null;
    return (
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "10px 0",
          borderBottom: "1px solid #eef2ff",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `${accent || "#e0f2fe"}33`,
            color: accent || "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: accent || "#0f172a", marginBottom: 4 }}>{title}</div>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>{body}</div>
        </div>
      </div>
    );
  };

  return (
    <PageWrap>
      <HeaderCard />

      {loading && (
        <div className="card" style={{ padding: 16, marginTop: 12 }}>
          <div style={{ color: "#6b7280" }}>Loading submission…</div>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: 16, marginTop: 12, border: "1px solid #fecaca", background: "#fef2f2" }}>
          <div style={{ color: "#b91c1c", fontWeight: 600 }}>Error</div>
          <div style={{ color: "#6b7280" }}>{error}</div>
        </div>
      )}

      <CandidateDetailsCard rows={rows} />

      {isIncomplete && (
        <div
          className="card"
          style={{
            padding: 16,
            marginTop: 12,
            border: "1px solid #fcd34d",
            background: "#fffbeb",
            borderRadius: 12,
          }}
        >
          <div style={{ color: "#92400e", fontWeight: 700, marginBottom: 6 }}>Marked Incomplete</div>
          <div style={{ color: "#92400e" }}>
            This submission was marked incomplete because it did not meet the minimum required completion criteria.
          </div>
        </div>
      )}

      {!isIncomplete && (
        <>

      <div
        className="card section"
        style={{
          padding: 20,
          borderRadius: 16,
          border: "1px solid #d1d5db",
          background: "#ffffff",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          marginTop: 12,
        }}
      >
        <BasicInterestScales
          themeOrder={themeOrder}
          radarByCode={radarByCode}
          groupedAreas={groupedAreas}
          themeNameMap={THEME_NAMES}
          themeColors={THEME_COLORS}
          themeDescriptions={{}}
        />
      </div>

      <div
        className="card section"
        style={{
          padding: 20,
          borderRadius: 16,
          border: "1px solid #d1d5db",
          background: "#ffffff",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          marginTop: 12,
        }}
      >
        <OccupationScales radarByCode={radarByCode} themeOrder={themeOrder} onNavigate={onNavigate} />
      </div>

      <div
        className="card section"
        style={{
          padding: 20,
          borderRadius: 16,
          border: "1px solid #d1d5db",
          background: "#ffffff",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          marginTop: 12,
        }}
      >
        <PillarSummaryCards sections={sections} scaleLabel="Percent of Max" />
      </div>

      <div
        className="card section"
        style={{
          padding: 20,
          borderRadius: 16,
          border: "1px solid #d1d5db",
          background: "#ffffff",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          marginTop: 12,
        }}
      >
        <RiasecHeroSection radarData={radarData} />
      </div>

      <div
        className="card section"
        style={{
          padding: 20,
          borderRadius: 16,
          border: "1px solid #d1d5db",
          background: "#ffffff",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          marginTop: 12,
        }}
      >
        <h3 style={{ margin: 0, color: "#111827" }}>Top & Least Occupations</h3>
        <p style={{ margin: "6px 0 12px", color: "#6b7280", fontSize: 14 }}>
          Highest and lowest matching roles based on your RIASEC profile.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div className="card" style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
            <h4 style={{ margin: "0 0 8px", color: "#0f172a" }}>Top 5</h4>
            {topFiveOcc.length ? (
              <ol style={{ margin: 0, paddingLeft: 18, color: "#374151", lineHeight: 1.4 }}>
                {topFiveOcc.map((r, idx) => (
                  <li key={`top-${idx}`} style={{ margin: "4px 0" }}>
                    <span style={{ fontWeight: 600, color: themeColorFor(r.theme || r.code) }}>
                      {r.occupation || r.title}
                    </span>{" "}
                    <span style={{ color: "#6b7280" }}>({Math.round(r._score)}%)</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div style={{ color: "#6b7280", fontSize: 13 }}>No occupations available.</div>
            )}
          </div>
          <div className="card" style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
            <h4 style={{ margin: "0 0 8px", color: "#0f172a" }}>Least 5</h4>
            {leastFiveOcc.length ? (
              <ol style={{ margin: 0, paddingLeft: 18, color: "#374151", lineHeight: 1.4 }}>
                {leastFiveOcc.map((r, idx) => (
                  <li key={`least-${idx}`} style={{ margin: "4px 0" }}>
                    <span style={{ fontWeight: 600, color: themeColorFor(r.theme || r.code) }}>
                      {r.occupation || r.title}
                    </span>{" "}
                    <span style={{ color: "#6b7280" }}>({Math.round(r._score)}%)</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div style={{ color: "#6b7280", fontSize: 13 }}>No occupations available.</div>
            )}
          </div>
        </div>
      </div>

      <div
        className="card section"
        style={{
          padding: 20,
          borderRadius: 16,
          border: "1px solid #d1d5db",
          background: "#ffffff",
          boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
          marginTop: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0, color: "#111827" }}>Top Occupation Focus</h3>
          {topFiveOcc.length > 1 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#475569", fontSize: 13 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleTopOccNav("prev")}
                  style={{
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    color: "#374151",
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    minWidth: 36,
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => handleTopOccNav("next")}
                  style={{
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    color: "#374151",
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    minWidth: 36,
                  }}
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
        {topOccupation ? (
          <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
            {(() => {
              const headerColor = themeColorFor(topOccupation.theme || topOccupation.code);
              const categoryColor = headerColor ? `${headerColor}CC` : "#38bdf8"; // lighten a bit
              const alsoCalledList = normalizeArray(topOccupation.also_called);
              const knowledgeContent = renderDictBlock(
                "Knowledge",
                topOccupation.knowledge,
                headerColor,
                categoryColor,
                { hideTitle: true }
              );
              const skillsContent = renderDictBlock(
                "Skills",
                topOccupation.skills,
                headerColor,
                categoryColor,
                { hideTitle: true }
              );
              const abilitiesContent = renderDictBlock(
                "Abilities",
                topOccupation.abilities,
                headerColor,
                categoryColor,
                { hideTitle: true }
              );
              const personalityContent = renderPersonality(topOccupation.personality, headerColor, { hideTitle: true });
              const techContent = renderTech(
                topOccupation.technology_tools || topOccupation.technology,
                headerColor,
                categoryColor,
                {
                  hideTitle: true,
                }
              );
              const salaryText = [
                topOccupation.salary_low ? `Low: ${topOccupation.salary_low}` : null,
                topOccupation.salary_typical ? `Typical: ${topOccupation.salary_typical}` : null,
                topOccupation.salary_high ? `High: ${topOccupation.salary_high}` : null,
              ]
                .filter(Boolean)
                .join(" | ");
              return (
                <div
                  key={topOccIndex}
                  style={{
                    animation: `${topOccAnim} 0.35s ease`,
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: headerColor,
                    }}
                  >
                    {topOccupation.job_title || topOccupation.occupation || topOccupation.title || "Occupation"}{" "}
                    <span style={{ color: "#6b7280", fontWeight: 500 }}>
                      ({topOccupation.theme || topOccupation.code || "-"})
                    </span>
                  </div>
                  {topOccupation.summary && (
                    <p style={{ color: "#475569", marginTop: 6, lineHeight: 1.6 }}>{topOccupation.summary}</p>
                  )}
                  {alsoCalledList.length > 0 && (
                    <div style={{ margin: "6px 0", display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {alsoCalledList.map((label, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: `${headerColor}1a`,
                            color: headerColor,
                            fontSize: 13,
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 12 }}>
                    {renderSection(
                      "Key duties",
                      "🗂️",
                      Array.isArray(topOccupation.duties) && topOccupation.duties.length ? (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {topOccupation.duties.map((duty, idx) => (
                            <li key={idx}>{duty}</li>
                          ))}
                        </ul>
                      ) : null,
                      headerColor
                    )}
                    {renderSection("Knowledge", "📘", knowledgeContent, headerColor)}
                    {renderSection("Skills", "🛠️", skillsContent, headerColor)}
                    {renderSection("Abilities", "🎯", abilitiesContent, headerColor)}
                    {renderSection("Personality", "✨", personalityContent, headerColor)}
                    {renderSection("Technology / Tools", "💻", techContent, headerColor)}
                    {renderSection(
                      "Education",
                      "🎓",
                      renderEducationSection(topOccupation.education, headerColor),
                      headerColor
                    )}
                    {renderSection(
                      "Job outlook",
                      "📈",
                      topOccupation.job_outlook ? <span>{topOccupation.job_outlook}</span> : null,
                      headerColor
                    )}
                    {renderSection(
                      "Yearly Salary",
                      "💰",
                      renderSalarySection(
                        topOccupation.salary_low,
                        topOccupation.salary_typical,
                        topOccupation.salary_high,
                        headerColor
                      ) || (salaryText ? <span>{salaryText}</span> : null),
                      headerColor
                    )}
                    {renderSection(
                      "Learn more",
                      "🔗",
                      topOccupation.link ? (
                        <a href={topOccupation.link} target="_blank" rel="noreferrer" style={{ color: headerColor }}>
                          View occupation profile
                        </a>
                    ) : null,
                      headerColor
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div style={{ color: "#6b7280", marginTop: 8 }}>No occupation data available yet.</div>
        )}
      </div>

        </>
      )}
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button
          onClick={() => onNavigate?.(fromAdmin ? "career-dashboard" : "home")}
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            padding: "10px 14px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {fromAdmin ? "Back to Submissions" : "Back Home"}
        </button>
      </div>
    </PageWrap>
  );
}







