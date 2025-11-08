const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const HIGHLIGHT_COLOR = "#ede9fe";

export const mergeStyles = (base, extra) => {
  const trimmedExtra = (extra || "").trim();
  if (!trimmedExtra) return base;
  return `${base}${base.endsWith(";") ? "" : ";"}${trimmedExtra}`;
};

export const legacyMarkdownToHtml = (markdown = "") => {
  if (!markdown) return "";
  const escaped = escapeHtml(markdown).replace(/\r\n/g, "\n");
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />") || "<br />"}</p>`)
    .join("");
};

export const hasHtmlLike = (value = "") => /<[^>]+>/.test(value || "");

export const hasVisualContent = (html = "") => {
  if (!html) return false;
  const stripped = html
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .trim();
  if (stripped.length > 0) return true;
  return /<(img|table|video|audio|canvas|svg|iframe)/i.test(html);
};

const ALLOWED_TAGS = new Set([
  "TABLE",
  "TBODY",
  "THEAD",
  "TFOOT",
  "TR",
  "TD",
  "TH",
  "COLGROUP",
  "COL",
  "SPAN",
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BR",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "SMALL",
  "DIV",
  "UL",
  "OL",
  "LI",
  "MARK",
  "IMG",
  "FIGURE",
  "FIGCAPTION",
  "A",
  "HR",
  "BLOCKQUOTE",
]);

const ALLOWED_ATTRS = new Set(["rowspan", "colspan", "align", "style", "src", "alt", "title", "href", "target", "rel", "width", "height"]);

export const sanitizeRichTextHtml = (html = "") => {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
    const toRemove = [];
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (!ALLOWED_TAGS.has(el.tagName)) {
        toRemove.push(el);
        continue;
      }
      Array.from(el.attributes).forEach((attr) => {
        if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) {
          el.removeAttribute(attr.name);
        }
      });
    }
    toRemove.forEach((node) => {
      const text = node.textContent || "";
      node.replaceWith(doc.createTextNode(text));
    });
    doc.querySelectorAll("a").forEach((anchor) => {
      const href = anchor.getAttribute("href") || "";
      if (!href.startsWith("http")) {
        anchor.removeAttribute("href");
      } else {
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
      }
    });
    doc.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!src) {
        img.remove();
      } else {
        const current = img.getAttribute("style") || "";
        img.setAttribute("style", mergeStyles("max-width:100%;height:auto;border-radius:12px;margin:8px 0;", current));
      }
    });
    doc.querySelectorAll("table").forEach((table) => {
      const current = table.getAttribute("style") || "";
      table.setAttribute("style", mergeStyles("border-collapse:collapse;width:100%;border:1px solid #d1d5db;background:#ffffff", current));
      table.querySelectorAll("th").forEach((th) => {
        const currentTh = th.getAttribute("style") || "";
        th.setAttribute("style", mergeStyles("border:1px solid #d1d5db;padding:8px;background:#f3f4f6;font-weight:600;text-align:left", currentTh));
      });
      table.querySelectorAll("td").forEach((td) => {
        const currentTd = td.getAttribute("style") || "";
        td.setAttribute("style", mergeStyles("border:1px solid #d1d5db;padding:8px;text-align:left;background:#ffffff", currentTd));
      });
    });
    return doc.body.innerHTML;
  } catch (err) {
    console.warn("sanitizeRichTextHtml", err);
    return html;
  }
};

export const toEditorHtml = (value = "") => {
  if (!value) return "";
  const source = hasHtmlLike(value) ? value : legacyMarkdownToHtml(value);
  return sanitizeRichTextHtml(source);
};
