import React from "react";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";

export default function Thanks({ onNavigate, lang, setLang }) {
  return (
    <PageWrap>
      <HeaderBar title="Thank You" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>Thank You for Participating!</h3>
        <p>Your responses have been recorded.</p>
        <Btn variant="primary" onClick={() => onNavigate("home")}>Back to Home</Btn>
      </Card>
    </PageWrap>
  );
}
