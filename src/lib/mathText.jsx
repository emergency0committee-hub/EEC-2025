// src/lib/mathText.js
import React from "react";
import { InlineMath, BlockMath } from "react-katex";

const INLINE_REGEX = /\\\[(.+?)\\\]|\\\((.+?)\\\)|\$\$(.+?)\$\$|\$([^$]+?)\$/gs;
const MATH_HINT_REGEX =
  /\\[a-zA-Z]+|\\frac|\\sqrt|\\sum|\\int|\\left|\\right|\\times|\\div|\\pm|\\pi|\\alpha|\\beta|\\gamma|\^|_|=|\\\(|\\\)|\\\[|\\\]|\$\$/;
const HTML_ENTITY_REGEX = /&(?:nbsp|lt|gt|amp|quot|apos|#39);/g;
const ENTITY_MAP = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
};

const decodeEntities = (value) =>
  value.replace(HTML_ENTITY_REGEX, (match) => ENTITY_MAP[match] ?? match);

const normalizeText = (value) =>
  decodeEntities(String(value ?? ""))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\\\\/g, "\\")
    .replace(/\r\n/g, "\n");

const renderSegments = (normalized) => {
  const segments = [];
  const regex = new RegExp(INLINE_REGEX);
  regex.lastIndex = 0;
  let match;
  let lastIndex = 0;
  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: normalized.slice(lastIndex, match.index) });
    }
    if (match[1] != null) {
      segments.push({ type: "block", value: match[1] });
    } else if (match[2] != null) {
      segments.push({ type: "inline", value: match[2] });
    } else if (match[3] != null) {
      segments.push({ type: "block", value: match[3] });
    } else if (match[4] != null) {
      segments.push({ type: "inline", value: match[4] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < normalized.length) {
    segments.push({ type: "text", value: normalized.slice(lastIndex) });
  }
  return segments;
};

const renderSegmentNode = (segment, idx) => {
  if (!segment) return null;
  if (segment.type === "text") {
    if (!segment.value) return null;
    return (
      <span key={`text-${idx}`} style={{ whiteSpace: "pre-wrap" }}>
        {segment.value}
      </span>
    );
  }
  const MathComponent = segment.type === "block" ? BlockMath : InlineMath;
  try {
    return <MathComponent key={`math-${idx}`}>{segment.value}</MathComponent>;
  } catch {
    return (
      <span key={`math-${idx}`} style={{ whiteSpace: "pre-wrap" }}>
        {segment.value}
      </span>
    );
  }
};

export const renderMathText = (value) => {
  if (value == null) return null;
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const segments = renderSegments(normalized);
  if (segments.some((segment) => segment.type !== "text")) {
    return segments.map((segment, idx) => renderSegmentNode(segment, idx)).filter(Boolean);
  }
  if (MATH_HINT_REGEX.test(normalized)) {
    try {
      return [<BlockMath key="math-fallback">{normalized}</BlockMath>];
    } catch {
      return [
        <span key="text-fallback" style={{ whiteSpace: "pre-wrap" }}>
          {normalized}
        </span>,
      ];
    }
  }
  return [
    <span key="text-only" style={{ whiteSpace: "pre-wrap" }}>
      {normalized}
    </span>,
  ];
};

export default renderMathText;
