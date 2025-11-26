import { useMemo } from "react";
import { Q_UNIFIED as Q, RIASEC_SCALE_MAX } from "../../questionBank.js";

const DASH = "\u2014";

const buildBankDenominators = () => {
  const discCount = { D: 0, I: 0, S: 0, C: 0 };
  const bloomCount = {};
  const sdgCount = {};
  for (const q of Q || []) {
    if (q?.DISC && discCount[q.DISC] != null) discCount[q.DISC] += 1;
    if (q?.BLOOM) bloomCount[q.BLOOM] = (bloomCount[q.BLOOM] || 0) + 1;
    if (q?.UN_Goal) sdgCount[q.UN_Goal] = (sdgCount[q.UN_Goal] || 0) + 1;
  }
  return { discCount, bloomCount, sdgCount };
};

const pctRowsFromTotals = (totals, counts) => {
  const out = [];
  for (const [label, sum] of Object.entries(totals || {})) {
    const count = counts?.[label] || 0;
    const max = count * RIASEC_SCALE_MAX;
    const pct = max > 0 ? Math.round((Number(sum || 0) / max) * 100) : 0;
    out.push([label, pct]);
  }
  out.sort((a, b) => b[1] - a[1]);
  return out;
};

const normalizeValue = (value) => {
  if (value == null) return null;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
};

const displayValue = (...values) => {
  for (const candidate of values) {
    const normalized = normalizeValue(candidate);
    if (normalized) return normalized;
  }
  return DASH;
};

const loadSelectedSections = () => {
  try {
    const stored = localStorage.getItem("selectedResultsSections");
    return stored
      ? JSON.parse(stored)
      : {
          riasec: true,
          areas: true,
          scales: true,
          occupations: true,
          pillars: true,
        };
  } catch {
    return {
      riasec: true,
      areas: true,
      scales: true,
      occupations: true,
      pillars: true,
    };
  }
};

const loadLegacySubmission = () => {
  try {
    const rows = JSON.parse(localStorage.getItem("cg_submissions_v1") || "[]");
    const last = Array.isArray(rows) && rows.length ? rows[rows.length - 1] : null;
    return last || null;
  } catch {
    return null;
  }
};

const PILLAR_INSIGHTS = {
  disc: {
    title: "DISC Insights",
    body:
      "Shows your communication energy. Higher scores reveal whether you lead with drive (D), influence (I), steadiness (S), or accuracy (C) when collaborating.",
  },
  bloom: {
    title: "Bloom's Insights",
    body:
      "Highlights the cognitive depth you favor—from remembering and understanding to evaluating or creating. Lean into the layers where you scored highest.",
  },
  sdg: {
    title: "UN SDG Insights",
    body:
      "Maps your interests to global challenges. Stronger bars indicate SDG themes you feel naturally driven to impact through future careers.",
  },
};

const INTEREST_CONTEXT = {
  R: {
    uni: "Choose lab-heavy science, engineering, or vocational electives so you keep working with tools.",
    real: "Volunteer for maker events or maintenance projects to see quick, tangible results.",
  },
  I: {
    uni: "Join research assistantships or analytics clubs to feed your curiosity.",
    real: "Sign up for hackathons or citizen-science projects so you keep investigating new problems.",
  },
  A: {
    uni: "Balance core theory with studio/performance courses and keep adding to your portfolio.",
    real: "Enter design or storytelling competitions to stress-test your creativity.",
  },
  S: {
    uni: "Take service-learning or peer-mentoring classes to practice facilitation.",
    real: "Tutor, coach, or volunteer weekly so you stay energized by helping others.",
  },
  E: {
    uni: "Join entrepreneurship clubs, student government, or case competitions to pitch ideas.",
    real: "Lead fundraising drives or community campaigns to sharpen persuasion.",
  },
  C: {
    uni: "Pick electives in accounting, data management, or operations to refine your accuracy.",
    real: "Manage budgets or logistics for clubs—people will rely on your organization.",
  },
};

export function useResultsData({
  radarData,
  areaPercents,
  participant,
  showParticipantHeader,
  submission,
  pillarAgg,
  pillarCounts,
}) {
  const selectedSections = useMemo(() => loadSelectedSections(), []);
  const radarByCode = useMemo(() => {
    const map = {};
    (radarData || []).forEach((d) => {
      map[d.code] = d.score ?? 0;
    });
    return map;
  }, [radarData]);

  const themeOrder = useMemo(
    () => [...(radarData || [])].sort((a, b) => b.score - a.score).map((d) => d.code),
    [radarData]
  );

  const groupedAreas = useMemo(() => {
    const grouped = {};
    (areaPercents || []).forEach((area) => {
      if (!grouped[area.code]) grouped[area.code] = [];
      grouped[area.code].push(area);
    });
    Object.keys(grouped).forEach((code) =>
      grouped[code].sort((a, b) => b.percent - a.percent)
    );
    return grouped;
  }, [areaPercents]);

  const sortedAllAreas = useMemo(
    () => [...(areaPercents || [])].sort((a, b) => b.percent - a.percent),
    [areaPercents]
  );
  const topFive = sortedAllAreas.slice(0, 5);
  const leastThree = sortedAllAreas.slice(-3).reverse();

  const interestInsights = useMemo(() => {
    const result = {};
    Object.entries(groupedAreas).forEach(([code, areas]) => {
      if (!areas || !areas.length) {
        result[code] =
          "No responses recorded yet. Answer a few more questions in this theme to unlock personalized guidance.";
        return;
      }
      const top = areas[0];
      const runners = areas.slice(1, 3);
      const runnerText = runners.length
        ? ` You also lean toward ${runners.map((item) => item.area).join(" and ")}.`
        : "";
      const context = INTEREST_CONTEXT[code] || {};
      let action;
      if (top.percent >= 80) {
        action = "Double down on this strength with advanced projects or leadership roles in the same domain.";
      } else if (top.percent >= 60) {
        action = "Balance your schedule with at least one weekly activity that mirrors this area to keep momentum.";
      } else {
        action = "Try short experiments (club tasks, mini projects) to see if this area should stay in your plan.";
      }
      const uniLine = context.uni ? ` University focus: ${context.uni}` : "";
      const realLine = context.real ? ` Real-life focus: ${context.real}` : "";
      result[code] = `Your top driver is ${top.area}.${runnerText} ${action}${uniLine}${realLine}`;
    });
    return result;
  }, [groupedAreas]);

  const candidateName = displayValue(participant?.name, participant?.fullName, participant?.email);
  const schoolValue = displayValue(participant?.school);
  const classValue = displayValue(
    participant?.className,
    participant?.class,
    participant?.grade,
    participant?.section,
    participant?.classroom
  );
  const phoneValue = displayValue(participant?.phone, participant?.tel, participant?.phoneNumber);
  const detailRows = useMemo(
    () => [
      { label: "Name", value: candidateName },
      { label: "School", value: schoolValue },
      { label: "Class", value: classValue },
      { label: "Phone", value: phoneValue },
    ],
    [candidateName, schoolValue, classValue, phoneValue]
  );

  const { totals, counts } = useMemo(() => {
    if (pillarAgg || pillarCounts) {
      return {
        totals: pillarAgg || { disc: {}, bloom: {}, sdg: {} },
        counts: pillarCounts || { discCount: {}, bloomCount: {}, sdgCount: {} },
      };
    }
    const legacy = loadLegacySubmission();
    if (legacy) {
      return {
        totals: legacy.pillarAgg || { disc: {}, bloom: {}, sdg: {} },
        counts: legacy.pillarCounts || { discCount: {}, bloomCount: {}, sdgCount: {} },
      };
    }
    return {
      totals: { disc: {}, bloom: {}, sdg: {} },
      counts: { discCount: {}, bloomCount: {}, sdgCount: {} },
    };
  }, [pillarAgg, pillarCounts]);

  const bankDenoms = useMemo(() => buildBankDenominators(), []);
  const effectiveCounts = useMemo(() => {
    const useAnswered = (obj) => obj && Object.keys(obj).length > 0;
    return {
      disc: useAnswered(counts.discCount) ? counts.discCount : bankDenoms.discCount,
      bloom: useAnswered(counts.bloomCount) ? counts.bloomCount : bankDenoms.bloomCount,
      sdg: useAnswered(counts.sdgCount) ? counts.sdgCount : bankDenoms.sdgCount,
    };
  }, [counts, bankDenoms]);

  const discPct = useMemo(
    () => pctRowsFromTotals(totals.disc, effectiveCounts.disc),
    [totals, effectiveCounts]
  );
  const bloomPct = useMemo(
    () => pctRowsFromTotals(totals.bloom, effectiveCounts.bloom),
    [totals, effectiveCounts]
  );
  const sdgPct = useMemo(
    () => pctRowsFromTotals(totals.sdg, effectiveCounts.sdg),
    [totals, effectiveCounts]
  );

  const pillarSections = useMemo(
    () => [
      {
        title: "DISC",
        data: discPct,
        color: "#6366f1",
        description: null,
        insight: PILLAR_INSIGHTS.disc,
      },
      {
        title: "Bloom's Taxonomy",
        data: bloomPct,
        color: "#06b6d4",
        description: null,
        insight: PILLAR_INSIGHTS.bloom,
      },
      {
        title: "UN Sustainable Development Goals",
        data: sdgPct,
        color: "#f59e0b",
        description: null,
        insight: PILLAR_INSIGHTS.sdg,
      },
    ],
    [discPct, bloomPct, sdgPct]
  );

  const hasParticipantDetails = Boolean(participant || submission);
  const shouldShowParticipantCard = hasParticipantDetails || showParticipantHeader;

  return {
    selectedSections,
    radarByCode,
    themeOrder,
    groupedAreas,
    topFive,
    leastThree,
    detailRows,
    shouldShowParticipantCard,
    pillarSections,
    interestInsights,
  };
}
