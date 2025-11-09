import React from "react";
import PropTypes from "prop-types";
import SATTestInterface from "./components/SATTestInterface.jsx";

export default function SATAssignment(props) {
  return <SATTestInterface {...props} mode="assignment" />;
}

SATAssignment.propTypes = {
  onNavigate: PropTypes.func.isRequired,
  practice: PropTypes.object,
};
