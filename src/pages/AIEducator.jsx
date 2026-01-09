import React, { useState } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { useGradebookState } from "./aiEducator/gradebookState.js";
import InstructionalMaterialsWorkspace from "./aiEducator/InstructionalMaterialsWorkspace.jsx";
import FeedbackAssessmentWorkspace from "./aiEducator/FeedbackAssessmentWorkspace.jsx";

const MAIN_TABS = [
  { key: "materials", label: "Instructional Materials" },
  { key: "feedback", label: "Feedback & Assessment" },
];

export default function AIEducator({ onNavigate }) {
  AIEducator.propTypes = { onNavigate: PropTypes.func.isRequired };
  const [mainTab, setMainTab] = useState("materials");
  const formState = useGradebookState();

  return (
    <PageWrap>
      <HeaderBar title="AI Educator Workspace" right={null} />
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMainTab(tab.key)}
                style={{
                  padding: "12px 20px",
                  borderRadius: 999,
                  border: mainTab === tab.key ? "1px solid #4f46e5" : "1px solid #d1d5db",
                  background: mainTab === tab.key ? "rgba(99, 102, 241, 0.12)" : "transparent",
                  color: mainTab === tab.key ? "#312e81" : "#374151",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mainTab === "materials" ? (
            <InstructionalMaterialsWorkspace formState={formState} />
          ) : (
            <FeedbackAssessmentWorkspace formState={formState} />
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Btn variant="back" onClick={() => onNavigate("home")}>
              Back Home
            </Btn>
          </div>
        </div>
      </Card>
    </PageWrap>
  );
}
