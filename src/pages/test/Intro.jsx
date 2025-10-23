// src/pages/test/Intro.jsx
import React from "react";
import { PageWrap, HeaderBar, Card, Field } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";

export default function Intro({
  profile,
  setProfile,
  isValidProfile,
  showProfileError,
  setShowProfileError,
  onStart,
  onBackHome,
}) {
  const nameInvalid = showProfileError && !(String(profile.name || "").trim().length > 1);
  const emailInvalid = showProfileError && !/^\S+@\S+\.\S+$/.test(String(profile.email || "").trim());
  const schoolInvalid = showProfileError && !(String(profile.school || "").trim().length > 1);

  return (
    <PageWrap>
      <HeaderBar title="Career Guidance Test" right={null} />
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <Field
            label="Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Full name"
            invalid={nameInvalid}
          />
          <Field
            label="Email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            placeholder="email@example.com"
            invalid={emailInvalid}
          />
          <Field
            label="School / Organization"
            value={profile.school}
            onChange={(e) => setProfile({ ...profile, school: e.target.value })}
            placeholder="Your school"
            invalid={schoolInvalid}
          />
        </div>

        {showProfileError && (
          <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 14 }}>
            Please complete all fields (valid email) to begin.
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
          <Btn variant="back" onClick={onBackHome}>
            Back Home
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              if (!isValidProfile()) {
                setShowProfileError(true);
              } else {
                onStart();
              }
            }}
          >
            Start Test
          </Btn>
        </div>
      </Card>
    </PageWrap>
  );
}
