// src/pages/Thanks.jsx
import React from "react";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";
import { STR } from "../i18n/strings.js";

export default function Thanks({ onNavigate, lang = "EN" }) {
  const t = STR[lang] || STR.EN;

  return (
    <PageWrap>
      <HeaderBar title={t.thanksTitle} />
      <Card>
        <p style={{ margin: 0, color: "#374151", fontSize: 16 }}>{t.thanksMsg}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <Btn variant="secondary" onClick={() => onNavigate("home")}>
            {t.thanksHome}
          </Btn>
        </div>
      </Card>
    </PageWrap>
  );
}
