import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

// Country list: code, dial, and display name (used for sorting only)
const COUNTRIES = [
  { code: "AE", dial: "+971", name: "United Arab Emirates" },
  { code: "AR", dial: "+54",  name: "Argentina" },
  { code: "AT", dial: "+43",  name: "Austria" },
  { code: "AU", dial: "+61",  name: "Australia" },
  { code: "BD", dial: "+880", name: "Bangladesh" },
  { code: "BE", dial: "+32",  name: "Belgium" },
  { code: "BH", dial: "+973", name: "Bahrain" },
  { code: "BR", dial: "+55",  name: "Brazil" },
  { code: "CA", dial: "+1",   name: "Canada" },
  { code: "CH", dial: "+41",  name: "Switzerland" },
  { code: "CN", dial: "+86",  name: "China" },
  { code: "DE", dial: "+49",  name: "Germany" },
  { code: "DK", dial: "+45",  name: "Denmark" },
  { code: "DZ", dial: "+213", name: "Algeria" },
  { code: "EG", dial: "+20",  name: "Egypt" },
  { code: "ES", dial: "+34",  name: "Spain" },
  { code: "ET", dial: "+251", name: "Ethiopia" },
  { code: "FR", dial: "+33",  name: "France" },
  { code: "GH", dial: "+233", name: "Ghana" },
  { code: "IE", dial: "+353", name: "Ireland" },
  { code: "IL", dial: "+972", name: "Israel" },
  { code: "IN", dial: "+91",  name: "India" },
  { code: "IQ", dial: "+964", name: "Iraq" },
  { code: "IR", dial: "+98",  name: "Iran" },
  { code: "IT", dial: "+39",  name: "Italy" },
  { code: "JO", dial: "+962", name: "Jordan" },
  { code: "JP", dial: "+81",  name: "Japan" },
  { code: "KE", dial: "+254", name: "Kenya" },
  { code: "KR", dial: "+82",  name: "South Korea" },
  { code: "KW", dial: "+965", name: "Kuwait" },
  { code: "LB", dial: "+961", name: "Lebanon" },
  { code: "MA", dial: "+212", name: "Morocco" },
  { code: "MX", dial: "+52",  name: "Mexico" },
  { code: "MY", dial: "+60",  name: "Malaysia" },
  { code: "NG", dial: "+234", name: "Nigeria" },
  { code: "NL", dial: "+31",  name: "Netherlands" },
  { code: "NO", dial: "+47",  name: "Norway" },
  { code: "NZ", dial: "+64",  name: "New Zealand" },
  { code: "OM", dial: "+968", name: "Oman" },
  { code: "PA", dial: "+970", name: "Palestine" }, // alias for PS if needed
  { code: "PH", dial: "+63",  name: "Philippines" },
  { code: "PK", dial: "+92",  name: "Pakistan" },
  { code: "PS", dial: "+970", name: "Palestine" },
  { code: "PT", dial: "+351", name: "Portugal" },
  { code: "QA", dial: "+974", name: "Qatar" },
  { code: "SA", dial: "+966", name: "Saudi Arabia" },
  { code: "SD", dial: "+249", name: "Sudan" },
  { code: "SE", dial: "+46",  name: "Sweden" },
  { code: "SG", dial: "+65",  name: "Singapore" },
  { code: "SY", dial: "+963", name: "Syria" },
  { code: "TH", dial: "+66",  name: "Thailand" },
  { code: "TN", dial: "+216", name: "Tunisia" },
  { code: "TR", dial: "+90",  name: "Turkey" },
  { code: "UA", dial: "+380", name: "Ukraine" },
  { code: "UK", dial: "+44",  name: "United Kingdom" }, // will normalize to GB for emoji
  { code: "US", dial: "+1",   name: "United States" },
  { code: "VN", dial: "+84",  name: "Vietnam" },
  { code: "YE", dial: "+967", name: "Yemen" },
  { code: "ZA", dial: "+27",  name: "South Africa" },
];

const COUNTRIES_SORTED = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
const REGIONS = COUNTRIES_SORTED.map((c) => c.code);
const DIAL = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.dial]));
const NAMES = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));

function FlagIcon({ code }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const [imgErr, setImgErr] = useState(false);
  const norm = (code || "").toUpperCase() === "UK" ? "GB" : (code || "").toUpperCase();
  // Reset image loading state when the target code changes
  useEffect(() => {
    setSrcIdx(0);
    setImgErr(false);
  }, [norm]);
  const base = import.meta.env.BASE_URL || "/";
  const candidates = [
    `${base}flags/${norm.toLowerCase()}.svg`,
    `${base}assets/flags/${norm.toLowerCase()}.svg`,
  ];
  const src = candidates[srcIdx] || candidates[0];
  const toEmoji = (cc) => {
    const cc2 = (cc || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc2)) return "??";
    const cp1 = 127397 + cc2.charCodeAt(0);
    const cp2 = 127397 + cc2.charCodeAt(1);
    try { return String.fromCodePoint(cp1) + String.fromCodePoint(cp2); } catch { return "??"; }
  };
  return (
    <div style={{ width: 20, height: 14, borderRadius: 2, overflow: "hidden", background: "#f3f4f6", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden>
      {!imgErr ? (
        <img
          src={src}
          alt=""
          width={20}
          height={14}
          onError={() => {
            try { console.warn('[PhoneInput] Flag not found:', src); } catch {}
            if (srcIdx + 1 < candidates.length) {
              setSrcIdx(srcIdx + 1);
            } else {
              setImgErr(true);
            }
          }}
          style={{ display: "block", width: 20, height: 14 }}
        />
      ) : (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 14,
            fontSize: 12,
            lineHeight: "14px",
          }}
        >
          {toEmoji(norm)}
        </span>
      )}
    </div>
  );
}

FlagIcon.propTypes = { code: PropTypes.string };

export default function PhoneInput({
  label = "Phone",
  placeholder = "e.g., 555 123 4567",
  region = "",
  phone = "",
  onChange,
  error,
  dir = "ltr",
}) {
  PhoneInput.propTypes = {
    label: PropTypes.string,
    placeholder: PropTypes.string,
    region: PropTypes.string,
    phone: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    error: PropTypes.string,
    dir: PropTypes.oneOf(["ltr", "rtl"]),
  };

  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      const t = e.target;
      if (btnRef.current && btnRef.current.contains(t)) return;
      if (menuRef.current && menuRef.current.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const dial = (r) => DIAL[r] || "+";
  const pick = (r) => { setOpen(false); onChange({ region: r, phone }); };
  const isRTL = dir === "rtl";

  return (
    <div style={{ position: "relative" }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 4,
          textAlign: isRTL ? "right" : "left",
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexDirection: isRTL ? "row-reverse" : "row",
        }}
      >
        <input
          type="tel"
          value={phone}
          onChange={(e) => onChange({ region, phone: e.target.value })}
          placeholder={placeholder}
          autoComplete="tel"
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            direction: dir,
            textAlign: isRTL ? "right" : "left",
          }}
        />
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup
          aria-expanded={open}
          title={region ? `${NAMES[region] || region} ${dial(region)}` : ""}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            background: "#f9fafb",
            minWidth: 96,
            cursor: "pointer",
            flexDirection: isRTL ? "row-reverse" : "row",
          }}
        >
          <FlagIcon code={region} />
          <span style={{ color: "#111827", fontWeight: 600 }}>{dial(region)}</span>
        </button>
      </div>
      {error && (
        <p
          style={{
            color: "#dc2626",
            fontSize: 14,
            margin: "4px 0 0",
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {error}
        </p>
      )}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "absolute",
            zIndex: 1000,
            marginTop: 4,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            background: "#fff",
            boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
            padding: 6,
            minWidth: 160,
            maxHeight: 200, /* ~5 items */
            overflowY: "auto",
            overscrollBehavior: "contain",
            right: isRTL ? 0 : "auto",
            left: isRTL ? "auto" : 0,
          }}
        >
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => pick(r)}
              title={`${NAMES[r] || r} ${dial(r)}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                background: "transparent",
                border: "none",
                textAlign: isRTL ? "right" : "left",
                padding: "8px 10px",
                borderRadius: 6,
                cursor: "pointer",
                flexDirection: isRTL ? "row-reverse" : "row",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <FlagIcon code={r} />
              <span style={{ fontWeight: 600 }}>{dial(r)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}



