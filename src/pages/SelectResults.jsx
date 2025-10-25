import React, { useState } from "react";
import PropTypes from "prop-types";
import Btn from "../components/Btn.jsx";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";

export default function SelectResults({ onNavigate }) {
  SelectResults.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const [selectedSections, setSelectedSections] = useState({
    riasec: true,
    areas: true,
    scales: true,
    occupations: true,
    pillars: true,
  });

  const handleSectionChange = (section) => {
    setSelectedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleViewResults = () => {
    // Store selected sections in localStorage or pass as props
    localStorage.setItem("selectedResultsSections", JSON.stringify(selectedSections));
    onNavigate("results");
  };

  return (
    <PageWrap>
      <HeaderBar title="Select Results to View" right={null} />

      <Card>
        <h3 style={{ marginTop: 0 }}>Choose which results to display</h3>
        <p style={{ color: "#6b7280" }}>
          Select the sections you want to see in your results report.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { key: "riasec", label: "RIASEC Profile & Percentages" },
            { key: "areas", label: "Top Interest Areas & Least Interest" },
            { key: "scales", label: "Basic Interest Scales" },
            { key: "occupations", label: "Occupational Scales" },
            { key: "pillars", label: "DISC, Bloom’s Taxonomy & UN Goals" },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={selectedSections[key]}
                onChange={() => handleSectionChange(key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <Btn variant="primary" onClick={handleViewResults}>
            View Selected Results
          </Btn>
        </div>

        <div style={{ marginTop: 16 }}>
          <Btn variant="secondary" onClick={() => onNavigate("home")}>
            Back to Home
          </Btn>
        </div>
      </Card>
    </PageWrap>
  );
}
