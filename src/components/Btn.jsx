import React, { useState } from "react";
import PropTypes from "prop-types";
import { routeHref, isModifiedEvent } from "../lib/routes.js";

const BASE_HEIGHT = 40;

const VARIANT_STYLES = {
  primary: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
    border: "none",
    hover: {
      transform: "translateY(-1px)",
      boxShadow: "0 4px 8px rgba(102, 126, 234, 0.3)",
    },
  },
  secondary: {
    background: "#ffffff",
    color: "#374151",
    border: "1px solid #d1d5db",
    hover: {
      background: "#f9fafb",
      transform: "translateY(-1px)",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.08)",
    },
  },
  back: {
    background: "transparent",
    color: "#6b7280",
    border: "none",
    hover: {
      color: "#374151",
      background: "#f9fafb",
    },
  },
  link: {
    background: "transparent",
    color: "#374151",
    border: "none",
    padding: "0 12px",
    hover: {
      color: "#2563eb",
    },
  },
};

export default function Btn({
  children,
  onClick,
  variant = "primary",
  style = {},
  selected = false,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  to,
  href,
  target,
  rel,
  ...props
}) {
  Btn.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(["primary", "secondary", "back", "link"]),
    style: PropTypes.object,
    selected: PropTypes.bool,
    to: PropTypes.string,
    href: PropTypes.string,
    target: PropTypes.string,
    rel: PropTypes.string,
  };

  const [hovering, setHovering] = useState(false);

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
  justifyContent: "center",
  minHeight: BASE_HEIGHT,
  height: BASE_HEIGHT,
  padding: "0 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
    transition: "all 0.2s ease",
    boxShadow: "none",
    textDecoration: "none",
    border: "none",
  };

  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  const dynamic = {};
  if (variant === "secondary") {
    if (selected) {
      Object.assign(dynamic, {
        background: "#2563eb",
        color: "#ffffff",
        border: "1px solid #2563eb",
      });
    } else if (hovering) {
      Object.assign(dynamic, variantStyle.hover);
    }
  } else if (hovering) {
    Object.assign(dynamic, variantStyle.hover);
  }

  const handleMouseEnter = (e) => {
    setHovering(true);
    onMouseEnter?.(e);
  };
  const handleMouseLeave = (e) => {
    setHovering(false);
    onMouseLeave?.(e);
  };
  const handleFocus = (e) => {
    setHovering(true);
    onFocus?.(e);
  };
  const handleBlur = (e) => {
    setHovering(false);
    onBlur?.(e);
  };

  const finalHref = href || (to ? routeHref(to) : undefined);
  const Component = finalHref ? "a" : "button";

  const handleClick = (event) => {
    if (finalHref && isModifiedEvent(event)) return;
    onClick?.(event);
    if (finalHref) event.preventDefault?.();
  };

  const sharedProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    style: { ...baseStyle, ...variantStyle, ...dynamic, ...style },
    "aria-pressed": selected || undefined,
    ...props,
  };

  if (Component === "a") {
    return (
      <a
        href={finalHref}
        target={target}
        rel={rel}
        onClick={handleClick}
        {...sharedProps}
        role="button"
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={handleClick} {...sharedProps}>
      {children}
    </button>
  );
}
