import React from "react";
import PropTypes from "prop-types";

export default function LanguageButton({ lang, setLang, langs }) {
  LanguageButton.propTypes = {
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
    langs: PropTypes.array.isRequired,
  };

  return (
    <select value={lang} onChange={(e) => setLang(e.target.value)}>
      {langs.map((langObj) => (
        <option key={langObj.code} value={langObj.code}>
          {langObj.label}
        </option>
      ))}
    </select>
  );
}
