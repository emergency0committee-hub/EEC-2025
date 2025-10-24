import React from "react";
import PropTypes from "prop-types";

export default function TimerHeader({ label }) {
  TimerHeader.propTypes = {
    label: PropTypes.string.isRequired,
  };

  return (
    <div style={{ fontSize: 18, fontWeight: "bold", color: "#374151" }}>
      {label}
    </div>
  );
}
