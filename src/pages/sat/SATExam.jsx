import React from "react";
import PropTypes from "prop-types";
import SATTestInterface from "./components/SATTestInterface.jsx";

export default function SATExam(props) {
  return <SATTestInterface {...props} mode="exam" />;
}

SATExam.propTypes = {
  onNavigate: PropTypes.func.isRequired,
  practice: PropTypes.object,
  preview: PropTypes.bool,
};
