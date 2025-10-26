// src/pages/AIEducator.jsx
import React from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";

export default function AIEducator({ onNavigate }) {
  AIEducator.propTypes = { onNavigate: PropTypes.func.isRequired };
  return (
    <PageWrap>
      <HeaderBar title="AI Educator" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>Coming Soon</h3>
        <p style={{ color: "#6b7280" }}>
          This space will include AI-powered lessons, feedback, and personalized study plans. Stay tuned!
        </p>
        <Btn variant="back" onClick={() => onNavigate("home")}>Back Home</Btn>
      </Card>
    </PageWrap>
  );
}

