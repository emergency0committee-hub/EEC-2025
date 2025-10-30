// src/pages/Blogs.jsx
import React from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { STR } from "../i18n/strings.js";

export default function Blogs({ onNavigate, lang = "EN" }) {
  Blogs.propTypes = {
    onNavigate: PropTypes.func.isRequired,
    lang: PropTypes.string,
  };

  const t = STR[lang] || STR.EN;

  return (
    <PageWrap>
      <HeaderBar title={t.navBlogs} right={null} lang={lang} />
      <Card>
        <p style={{ color: "#6b7280", marginTop: 0 }}>Coming soon.</p>
        <Btn variant="primary" onClick={() => onNavigate("home")}>{t.backToHome}</Btn>
      </Card>
    </PageWrap>
  );
}
