// src/pages/About.jsx
import React from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";

export default function About({ onNavigate }) {
  About.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  return (
    <PageWrap>
      <HeaderBar title="About Us" right={null} />
      <Card>
        <p style={{ color: "#6b7280", marginTop: 0 }}>Coming soon.</p>
        <Btn variant="primary" onClick={() => onNavigate("home")}>Back Home</Btn>
      </Card>
    </PageWrap>
  );
}

