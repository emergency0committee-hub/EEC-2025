import { createPortal } from "react-dom";
import PropTypes from "prop-types";

export default function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

ModalPortal.propTypes = {
  children: PropTypes.node.isRequired,
};
