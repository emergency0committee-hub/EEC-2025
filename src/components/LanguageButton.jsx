import React from "react";

export default function LanguageButton({ lang, setLang, langs }) {
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
