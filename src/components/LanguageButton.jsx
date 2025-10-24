import React from "react";
import PropTypes from "prop-types";

export default function LanguageButton({ lang, setLang, langs }) {
  LanguageButton.propTypes = {
    lang: PropTypes.string.isRequired,
    setLang: PropTypes.func.isRequired,
    langs: PropTypes.object.isRequired,
  };

  return (
    <select value={lang} onChange={(e) => setLang(e.target.value)}>
      {Object.keys(langs).map((key) => (
        <option key={key} value={key}>
          {langs[key]}
        </option>
      ))}
    </select>
  );
}
