import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

const KEYFRAME_ID = "__hb_slide_keyframes__";
const THEME_KEYFRAME_ID = "__app_theme_keyframes__";

export function PageWrap({ children, style = {}, className = "" }) {
  PageWrap.propTypes = {
    children: PropTypes.node.isRequired,
    style: PropTypes.object,
    className: PropTypes.string,
  };
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(THEME_KEYFRAME_ID)) return;
    const styleEl = document.createElement("style");
    styleEl.id = THEME_KEYFRAME_ID;
    styleEl.textContent = `
@keyframes appBgShift {
  0% { background-position: 0% 0%, 100% 0%, 50% 100%, 80% 40%, 0 0; }
  50% { background-position: 100% 70%, 0% 80%, 40% 20%, 10% 60%, 0 0; }
  100% { background-position: 0% 0%, 100% 0%, 50% 100%, 80% 40%, 0 0; }
}
@keyframes appCardSheen {
  0% { background-position: 0 0, -120% 0; }
  100% { background-position: 0 0, 120% 0; }
}
`;
    document.head.appendChild(styleEl);
  }, []);
  return (
    <div
      className={className}
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "40px 0",
        backgroundColor: "#eef2ff",
        backgroundImage:
          "radial-gradient(1200px 700px at 5% 15%, rgba(59, 130, 246, 0.28), transparent 60%)," +
          "radial-gradient(1000px 600px at 95% 10%, rgba(249, 115, 22, 0.3), transparent 60%)," +
          "radial-gradient(1100px 700px at 50% 95%, rgba(244, 63, 94, 0.24), transparent 60%)," +
          "radial-gradient(800px 500px at 70% 50%, rgba(34, 197, 94, 0.2), transparent 65%)," +
          "linear-gradient(135deg, #eef2ff 0%, #fef3c7 45%, #ffe4e6 100%)",
        backgroundSize: "240% 240%, 240% 240%, 220% 220%, 200% 200%, 100% 100%",
        backgroundPosition: "0% 0%, 100% 0%, 50% 100%, 80% 40%, 0 0",
        backgroundBlendMode: "screen, screen, screen, screen, normal",
        animation: "appBgShift 12s ease-in-out infinite",
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          opacity: 0.08,
          zIndex: 0,
        }}
      >
        <img
          src="/EEC_Logo.png"
          alt=""
          style={{
            width: "min(92vw, 900px)",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 800, width: "100%", padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

export function HeaderBar({ title, right, lang = "EN" }) {
  HeaderBar.propTypes = {
    title: PropTypes.node.isRequired,
    right: PropTypes.node,
    lang: PropTypes.string,
  };

  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!menuOpen) {
      setDrawerVisible(false);
      return;
    }
    setDrawerVisible(false);
    const id = window.requestAnimationFrame(() => setDrawerVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [menuOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (document.getElementById(KEYFRAME_ID)) return undefined;
    const styleEl = document.createElement("style");
    styleEl.id = KEYFRAME_ID;
    styleEl.textContent = `
@keyframes hbItemSlideLTR { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes hbItemSlideRTL { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
`;
    document.head.appendChild(styleEl);
    return undefined;
  }, []);

  const renderBurger = () => (
    <button
      type="button"
      onClick={toggleMenu}
      aria-label={menuOpen ? "Close menu" : "Open menu"}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        border: "1px solid #d1d5db",
        background: "#ffffff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "grid",
          gap: 6,
        }}
      >
        {[0, 1, 2].map((idx) => (
          <span
            key={idx}
            style={{
              display: "block",
              width: 20,
              height: 2,
              borderRadius: 999,
              background: "#374151",
            }}
          />
        ))}
      </span>
    </button>
  );

  const isRTL = lang && typeof lang === "string" ? lang.toUpperCase().startsWith("AR") : false;

  const itemAnimationName = drawerVisible ? (isRTL ? "hbItemSlideRTL" : "hbItemSlideLTR") : null;

  let mobilePanel = right;
  if (isMobile && right && React.isValidElement(right)) {
    const baseStyle = {
      ...(right.props.style || {}),
      display: "flex",
      flexDirection: "column",
        alignItems: "center",
        gap: 24,
    };
    mobilePanel = React.cloneElement(
      right,
      {
        style: baseStyle,
      },
      React.Children.map(right.props.children, (child, index) => {
        if (!React.isValidElement(child)) {
          return child;
        }
        const childType = child.type;
        const isLanguageButton =
          childType &&
          (childType.displayName === "LanguageButton" || childType.name === "LanguageButton");
        // Stack nav links vertically
        if (child.type === "nav") {
          const navStyle = {
            ...(child.props.style || {}),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          };
          return React.cloneElement(
            child,
            {
              style: navStyle,
            },
            React.Children.map(child.props.children, (navItem, navIdx) => {
              if (!React.isValidElement(navItem)) {
                return navItem;
              }
              const animation =
                drawerVisible && itemAnimationName
                  ? `${itemAnimationName} 260ms ease ${navIdx * 60}ms both`
                  : "none";
              return React.cloneElement(navItem, {
                key: navItem.key ?? `nav-item-${navIdx}`,
                style: {
                  ...(navItem.props.style || {}),
                  width: "100%",
                  justifyContent: "center",
                  textAlign: "center",
                  animation,
                },
              });
            })
          );
        }
        if (isLanguageButton) {
          const animation =
            drawerVisible && itemAnimationName
              ? `${itemAnimationName} 260ms ease ${index * 60}ms both`
              : "none";
          return React.cloneElement(child, {
            key: child.key ?? `header-item-${index}`,
            context: "drawer",
            style: {
              ...(child.props.style || {}),
              width: "100%",
              animation,
            },
          });
        }
        // Default: ensure each item stretches full width
        const animation =
          drawerVisible && itemAnimationName
            ? `${itemAnimationName} 260ms ease ${index * 60}ms both`
            : "none";
        return React.cloneElement(child, {
          key: child.key ?? `header-item-${index}`,
          style: {
            ...(child.props.style || {}),
            width: "100%",
            textAlign: "center",
            justifyContent: "center",
            animation,
          },
        });
      })
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {typeof title === "string" ? (
            <h1 style={{ margin: 0 }}>{title}</h1>
          ) : (
            React.cloneElement(title, {
              style: {
                ...(title.props?.style || {}),
              },
            })
          )}
        </div>
        {isMobile ? (right ? renderBurger() : null) : right}
      </div>
      {isMobile && right && menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.45)",
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
            position: "absolute",
            top: 0,
            right: isRTL ? "auto" : 0,
            left: isRTL ? 0 : "auto",
            width: "min(220px, 68vw)",
            height: "100%",
            background: "#ffffff",
            boxShadow: "-6px 0 16px rgba(15, 23, 42, 0.22)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            alignItems: "center",
            transform: drawerVisible
              ? "translateX(0)"
              : isRTL
                ? "translateX(-100%)"
                : "translateX(100%)",
            transition: "transform 220ms ease",
          }}
        >
            {mobilePanel}
          </div>
        </div>
      )}
    </>
  );
}

export function Card({ children, style = {} }) {
  Card.propTypes = {
    children: PropTypes.node.isRequired,
    style: PropTypes.object,
  };
  const [hovered, setHovered] = useState(false);
  const cardRef = React.useRef(null);
  const baseBackground = "linear-gradient(135deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.08))";
  const sheenBackground =
    "linear-gradient(120deg, rgba(255, 255, 255, 0) 5%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0) 95%)";
  const baseShadow = style?.boxShadow || "0 16px 40px rgba(15, 23, 42, 0.18)";
  const hoverShadow = style?.boxShadow || "0 22px 50px rgba(15, 23, 42, 0.22)";
  const rawBackground = typeof style?.background === "string" ? style.background : "";
  const customBackgroundImage =
    style?.backgroundImage ||
    (rawBackground && (rawBackground.includes("gradient") || rawBackground.includes("url")) ? rawBackground : "");
  const customFill =
    rawBackground && !rawBackground.includes("gradient") && !rawBackground.includes("url")
      ? rawBackground
      : style?.backgroundColor;
  const highlightOpacity = hovered ? 0.55 : 0;
  const hazeOpacity = hovered ? 0.28 : 0;
  const highlightGradient = `radial-gradient(180px 180px at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, ${highlightOpacity}), rgba(255, 255, 255, 0) 70%)`;
  const hazeGradient = `radial-gradient(360px 360px at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, ${hazeOpacity}), rgba(255, 255, 255, 0) 75%)`;
  const backgroundImage = customBackgroundImage
    ? `${highlightGradient}, ${hazeGradient}, ${customBackgroundImage}`
    : customFill
      ? `${highlightGradient}, ${hazeGradient}`
      : `${highlightGradient}, ${hazeGradient}, ${baseBackground}`;

  const updateLightPosition = (event) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    cardRef.current.style.setProperty("--mx", `${clampedX}%`);
    cardRef.current.style.setProperty("--my", `${clampedY}%`);
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={(event) => {
        setHovered(true);
        updateLightPosition(event);
      }}
      onMouseMove={updateLightPosition}
      onMouseLeave={() => {
        setHovered(false);
        if (cardRef.current) {
          cardRef.current.style.setProperty("--mx", "50%");
          cardRef.current.style.setProperty("--my", "50%");
        }
      }}
      style={{
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        boxShadow: hovered ? hoverShadow : baseShadow,
        backdropFilter: "blur(14px) saturate(170%)",
        WebkitBackdropFilter: "blur(14px) saturate(170%)",
        boxSizing: "border-box",
        transition: "box-shadow 180ms ease",
        ...style,
        border: "1px solid transparent",
        backgroundColor: customFill || "rgba(255, 255, 255, 0.08)",
        backgroundImage,
        backgroundSize: "100% 100%",
      }}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  invalid = false,
  autoComplete,
  inputMode,
  endAdornment = null,
  name,
  maxLength,
  readOnly = false,
  disabled = false,
  style = {},
  children,
  ...rest
}) {
  Field.propTypes = {
    label: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    children: PropTypes.node,
    type: PropTypes.string,
    invalid: PropTypes.bool,
    autoComplete: PropTypes.string,
    inputMode: PropTypes.string,
    endAdornment: PropTypes.node,
    name: PropTypes.string,
    maxLength: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,
    style: PropTypes.object,
  };

  if (value !== undefined && onChange) {
    const { onFocus: externalFocus, onBlur: externalBlur, ...inputRest } = rest;
    const baseBorder = invalid ? "#dc2626" : "#d1d5db";
    const direction =
      inputRest.dir ||
      (style && style.direction) ||
      "ltr";
    const isRTLDirection = direction === "rtl";
    const handleFocus = (e) => {
      e.target.style.borderColor = "#2563eb";
      e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.12)";
      if (typeof externalFocus === "function") externalFocus(e);
    };
    const handleBlur = (e) => {
      e.target.style.borderColor = invalid ? "#dc2626" : "#d1d5db";
      e.target.style.boxShadow = "none";
      if (typeof externalBlur === "function") externalBlur(e);
    };

    return (
      <div style={{ marginBottom: 16 }}>
        {label && <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151" }}>{label}</label>}
        <div style={{ position: "relative" }}>
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            name={name}
            maxLength={maxLength}
            readOnly={readOnly}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "10px 12px",
              paddingRight: endAdornment && !isRTLDirection ? 44 : 12,
              paddingLeft: endAdornment && isRTLDirection ? 44 : 12,
              border: `1px solid ${baseBorder}`,
              borderRadius: 8,
              fontSize: 14,
              lineHeight: "20px",
              background: disabled ? "#f3f4f6" : "#ffffff",
              boxShadow: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              ...style,
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...inputRest}
          />
          {endAdornment && (
            <div
              style={{
                position: "absolute",
                right: isRTLDirection ? "auto" : 10,
                left: isRTLDirection ? 10 : "auto",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {endAdornment}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", marginBottom: 4 }}>{label}</label>}
      {children}
    </div>
  );
}

export function ProgressBar({ value, max }) {
  ProgressBar.propTypes = {
    value: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
  };

  return (
    <div style={{ width: "100%", height: 8, background: "#e5e7eb", borderRadius: 4 }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: "#3b82f6", borderRadius: 4 }} />
    </div>
  );
}
