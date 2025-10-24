import React from "react";
import { PageWrap, HeaderBar, Card } from "../components/Layout.jsx";
import Btn from "../components/Btn.jsx";

export default function Results({ onNavigate, ...results }) {
  return (
    <PageWrap>
      <HeaderBar title="Test Results" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>Results</h3>
        <pre>{JSON.stringify(results, null, 2)}</pre>
        <Btn variant="primary" onClick={() => onNavigate("home")}>Back to Home</Btn>
      </Card>
    </PageWrap>
  );
}
