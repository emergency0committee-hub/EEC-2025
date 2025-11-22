// src/lib/mathText.jsx
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import { sanitizeRichTextHtml } from "./richText.js";

const INLINE_REGEX = /\\\[(.+?)\\\]|\\\((.+?)\\\)|\$\$(.+?)\$\$|\$([^$]+?)\$/gs;
const MATH_HINT_REGEX =
  /\\[a-zA-Z]+|\\frac|\\sqrt|\\sum|\\int|\\left|\\right|\\times|\\div|\\pm|\\pi|\\alpha|\\beta|\\gamma|\^|_|=|\\\(|\\\)|\\\[|\\\]|\$\$/;
const HTML_ENTITY_REGEX = /&(?:nbsp|lt|gt|amp|quot|apos|#39);/g;
const HTML_CONTENT_REGEX =
  /<\s*(table|img|div|p|br|figure|figcaption|ul|ol|li|mark|strong|em|u|span|h[1-6]|blockquote|hr|a)\b/i;

const ENTITY_MAP = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
};

const HIGHLIGHT_DEFAULT_STYLE = {
  backgroundColor: "#fef08a",
  color: "#1f2937",
  borderRadius: "4px",
  padding: "0 2px",
};

const HEADING_STYLE = {
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: "1.5",
  margin: "0 0 8px",
  color: "#111827",
  display: "block",
};

const decodeEntities = (value) =>
  String(value ?? "").replace(HTML_ENTITY_REGEX, (match) => ENTITY_MAP[match] ?? match);

const injectFormattingTokens = (value) =>
  value
    .replace(/<\s*(strong|b)[^>]*>/gi, "\u00ABB\u00BB")
    .replace(/<\s*\/\s*(strong|b)\s*>/gi, "\u00AB/B\u00BB")
    .replace(/<\s*(em|i)[^>]*>/gi, "\u00ABI\u00BB")
    .replace(/<\s*\/\s*(em|i)\s*>/gi, "\u00AB/I\u00BB")
    .replace(/<\s*u[^>]*>/gi, "\u00ABU\u00BB")
    .replace(/<\s*\/\s*u\s*>/gi, "\u00AB/U\u00BB")
    .replace(/<mark[^>]*>/gi, (match) => {
      const styleAttr = /style\s*=\s*"([^"]+)"/i.exec(match);
      if (styleAttr && /background/i.test(styleAttr[1])) {
        return `\u00ABH:${styleAttr[1].replace(/"/g, "'")}\u00BB`;
      }
      return "\u00ABH\u00BB";
    })
    .replace(/<\s*\/\s*mark\s*>/gi, "\u00AB/H\u00BB")
    .replace(/<\s*h3[^>]*>/gi, "\u00ABHD\u00BB")
    .replace(/<\s*\/\s*h3\s*>/gi, "\u00AB/HD\u00BB");

const stripBasicHtml = (value) =>
  value
    .replace(/<\s*\/\s*(p|div|section|article|h[1-6])\s*>/gi, "\n\n")
    .replace(/<\s*(p|div|section|article|h[1-6])[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(ul|ol)[^>]*>/gi, "\n")
    .replace(/<hr[^>]*>/gi, "\n────────\n")
    .replace(/<[^>]+>/g, "");

const normalizeText = (value) => {
  const decoded = decodeEntities(value);
  const withTokens = injectFormattingTokens(decoded);
  const stripped = stripBasicHtml(withTokens);
  return stripped
    .replace(/\u00a0/g, " ")
    .replace(/\\\\/g, "\\")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const TOKEN_REGEX = /\u00AB(\/?)(B|I|U|H(?::[^»]+)?|HD)\u00BB/g;
const TOKEN_TAG = {
  B: "strong",
  I: "em",
  U: "u",
  H: "mark",
  HD: "h3",
};

const parseStyleString = (style = "") =>
  style
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, declaration) => {
      const [prop, rawValue] = declaration.split(":");
      if (!prop || !rawValue) return acc;
      const camelProp = prop
        .trim()
        .toLowerCase()
        .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      acc[camelProp] = rawValue.trim();
      return acc;
    }, {});

const applyStack = (text, stack, key) => {
  if (!text) return null;
  let node = (
    <span key={`${key}-text`} style={{ whiteSpace: "pre-wrap" }}>
      {text}
    </span>
  );
  if (Array.isArray(stack) && stack.length) {
    node = stack.reduceRight((child, entry, idx) => {
      const Tag = entry.tag;
      const props = entry.props ? { ...entry.props } : {};
      const wrapKey = `${key}-wrap-${idx}`;
      return (
        <Tag key={wrapKey} {...props}>
          {child}
        </Tag>
      );
    }, node);
  }
  return node;
};

const renderStyledText = (value = "", baseKey = 0) => {
  if (!value) return null;
  const nodes = [];
  const stack = [];
  let lastIndex = 0;
  let piece = 0;
  let match;
  const regex = new RegExp(TOKEN_REGEX);
  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      const slice = value.slice(lastIndex, match.index);
      const node = applyStack(slice, stack.slice(), `${baseKey}-${piece++}`);
      if (node) nodes.push(node);
    }
    const rawToken = match[2];
    const isClosing = match[1] === "/";
    let tagKey = rawToken;
    let extraProps = null;
    if (rawToken.startsWith("H:")) {
      tagKey = "H";
      extraProps = { style: rawToken.slice(2) };
    } else if (rawToken === "HD") {
      tagKey = "HD";
    }
    const tag = TOKEN_TAG[tagKey];
    if (tag) {
      if (isClosing) {
        for (let i = stack.length - 1; i >= 0; i -= 1) {
          if (stack[i]?.tag === tag) {
            stack.splice(i, 1);
            break;
          }
        }
      } else {
        let props = null;
        if (tag === "mark") {
          const markStyle = extraProps?.style ? parseStyleString(extraProps.style) : {};
          props = {
            style: {
              ...HIGHLIGHT_DEFAULT_STYLE,
              ...markStyle,
            },
          };
        } else if (tag === "h3") {
          props = { style: HEADING_STYLE };
        } else if (extraProps) {
          props = extraProps;
        }
        stack.push({ tag, props });
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < value.length) {
    const node = applyStack(value.slice(lastIndex), stack.slice(), `${baseKey}-${piece++}`);
    if (node) nodes.push(node);
  }
  if (!nodes.length) return null;
  if (nodes.length === 1) return nodes[0];
  return (
    <React.Fragment key={`group-${baseKey}`}>
      {nodes}
    </React.Fragment>
  );
};

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
    return renderStyledText(segment.value, idx);
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
  const decoded = decodeEntities(String(value ?? ""));
  const trimmed = decoded.trim();
  if (!trimmed) return null;

  INLINE_REGEX.lastIndex = 0;
  const hasMath = INLINE_REGEX.test(trimmed);
  INLINE_REGEX.lastIndex = 0;

  if (HTML_CONTENT_REGEX.test(trimmed) && !hasMath) {
    const sanitized = sanitizeRichTextHtml(trimmed);
    const overflow = sanitized.includes("<table") ? "auto" : "visible";
    return [
      <div
        key="html"
        style={{ overflowX: overflow }}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />,
    ];
  }

  const normalized = normalizeText(trimmed);
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
  const styled = renderStyledText(normalized, "plain");
  if (styled) {
    return [styled];
  }
  return null;
};

export default renderMathText;
