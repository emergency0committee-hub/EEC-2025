import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  HIGHLIGHT_COLOR,
  hasVisualContent,
  sanitizeRichTextHtml,
  toEditorHtml,
} from "../lib/richText.js";

const EQUATION_ICON_SRC = "/icons/icon-equation.svg";

const ATTACH_MENU_STYLE = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  zIndex: 12,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  boxShadow: "0 12px 35px rgba(15,23,42,0.18)",
  minWidth: 220,
  display: "grid",
  gap: 12,
};

const EDITOR_STYLE = {
  minHeight: 140,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  outline: "none",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: 14,
  lineHeight: 1.4,
  background: "#ffffff",
};

function RichTextEditor({ value, onChange, placeholder = "Start typing..." }) {
  const editorRef = useRef(null);
  const lastHtmlRef = useRef("");
  const toolbarStateRef = useRef({});
  const [toolbarState, setToolbarState] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [tableConfig, setTableConfig] = useState({ rows: 2, cols: 2 });
  const fileInputRef = useRef(null);
  const toolbarWrapperRef = useRef(null);

  const updateToolbarState = () => {
    if (!editorRef.current || typeof document.queryCommandState !== "function") return;
    const states = {};
    const commands = ["bold", "italic", "underline", "insertUnorderedList", "justifyLeft", "justifyCenter", "justifyRight"];
    commands.forEach((cmd) => {
      try {
        states[cmd] = document.queryCommandState(cmd);
      } catch {
        states[cmd] = false;
      }
    });
    try {
      const hilite = (document.queryCommandValue("hiliteColor") || "").toLowerCase();
      states.highlight = hilite === HIGHLIGHT_COLOR || hilite === "rgb(237, 233, 254)";
    } catch {
      states.highlight = false;
    }
    toolbarStateRef.current = states;
    setToolbarState(states);
  };

  const ensureSelection = () => {
    if (!editorRef.current) return null;
    const selection = document.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      editorRef.current.contains(selection.anchorNode)
    ) {
      return selection;
    }
    editorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    const sel = document.getSelection();
    if (!sel) return null;
    sel.removeAllRanges();
    sel.addRange(range);
    return sel;
  };

  const syncEditor = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML || "";
    const sanitized = sanitizeRichTextHtml(html);
    lastHtmlRef.current = sanitized;
    onChange?.(sanitized);
  };

  const runCommand = (command, valueArg = null) => {
    if (!editorRef.current || typeof document.execCommand !== "function") return;
    ensureSelection();
    try {
      document.execCommand(command, false, valueArg);
    } catch {
      // ignore
    }
    syncEditor();
    updateToolbarState();
  };

  const insertHtml = (html) => {
    if (!editorRef.current) return;
    const selection = ensureSelection();
    if (!selection) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    syncEditor();
    updateToolbarState();
  };

  const insertText = (text) => {
    if (!editorRef.current) return;
    const selection = ensureSelection();
    if (!selection) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    syncEditor();
    updateToolbarState();
  };

  const handleAttachmentToggle = () => setMenuOpen((prev) => !prev);

  const handleInsertEquation = () => {
    const latex = window.prompt("Enter LaTeX (without surrounding $):");
    if (!latex) return;
    const trimmed = latex.trim();
    if (!trimmed) return;
    const isBlock = window.confirm("Insert as display equation? OK = block, Cancel = inline.");
    const snippet = isBlock ? `\n$$${trimmed}$$\n` : `\\(${trimmed}\\)`;
    insertText(snippet);
  };

  const handleQuickInsertTable = () => {
    const rows = Math.min(Math.max(Number(tableConfig.rows) || 1, 1), 6);
    const cols = Math.min(Math.max(Number(tableConfig.cols) || 1, 1), 6);
    const body = Array.from({ length: rows })
      .map(
        () =>
          `<tr>${Array.from({ length: cols })
            .map(() => '<td style="border:1px solid #d1d5db;padding:6px;">&nbsp;</td>')
            .join("")}</tr>`,
      )
      .join("");
    const html = `<table style="border-collapse:collapse;width:100%;margin:8px 0;">${body}</table>`;
    insertHtml(html);
    setMenuOpen(false);
  };

  const convertFileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }
    const dataUrl = await convertFileToDataUrl(file);
    insertHtml(`<img src="${dataUrl}" alt="" />`);
    setMenuOpen(false);
    event.target.value = "";
  };

  const formattingButtons = [
    {
      id: "bold",
      title: "Bold (Ctrl+B)",
      command: "bold",
      icon: <span style={{ fontWeight: 700, fontSize: 15 }}>B</span>,
    },
    {
      id: "italic",
      title: "Italic (Ctrl+I)",
      command: "italic",
      icon: <span style={{ fontStyle: "italic", fontSize: 15 }}>I</span>,
    },
    {
      id: "underline",
      title: "Underline (Ctrl+U)",
      command: "underline",
      icon: <span style={{ textDecoration: "underline", fontSize: 15 }}>U</span>,
    },
    {
      id: "highlight",
      title: "Highlight",
      command: "hiliteColor",
      value: HIGHLIGHT_COLOR,
      toggleValue: "transparent",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M4 12l6-6 3 3-6 6H4v-3z" fill={HIGHLIGHT_COLOR} stroke="none" />
          <path d="M11 4l2.5-2.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "bullet",
      title: "Bullet list",
      command: "insertUnorderedList",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="4" cy="5" r="1" fill="currentColor" />
          <circle cx="4" cy="9" r="1" fill="currentColor" />
          <circle cx="4" cy="13" r="1" fill="currentColor" />
          <line x1="7" y1="5" x2="14" y2="5" />
          <line x1="7" y1="9" x2="14" y2="9" />
          <line x1="7" y1="13" x2="14" y2="13" />
        </svg>
      ),
    },
    {
      id: "align-left",
      title: "Align left",
      command: "justifyLeft",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="3" y1="5" x2="15" y2="5" />
          <line x1="3" y1="9" x2="12" y2="9" />
          <line x1="3" y1="13" x2="15" y2="13" />
        </svg>
      ),
    },
    {
      id: "align-center",
      title: "Align center",
      command: "justifyCenter",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="5" y1="5" x2="13" y2="5" />
          <line x1="3" y1="9" x2="15" y2="9" />
          <line x1="5" y1="13" x2="13" y2="13" />
        </svg>
      ),
    },
    {
      id: "align-right",
      title: "Align right",
      command: "justifyRight",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="3" y1="5" x2="15" y2="5" />
          <line x1="6" y1="9" x2="15" y2="9" />
          <line x1="3" y1="13" x2="15" y2="13" />
        </svg>
      ),
    },
    {
      id: "attach",
      title: "Insert media",
      action: handleAttachmentToggle,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 9.5l5-5a3 3 0 0 1 4.2 4.2l-5.5 5.5A3 3 0 1 1 3 11.5l4.9-4.9" />
        </svg>
      ),
    },
    {
      id: "equation",
      title: "Insert equation",
      action: handleInsertEquation,
      icon: <img src={EQUATION_ICON_SRC} alt="Equation" style={{ width: 16, height: 16 }} />,
    },
  ];

  useEffect(() => {
    if (!editorRef.current) return;
    const targetHtml = toEditorHtml(value || "");
    const isFocused = document.activeElement === editorRef.current;
    if (!isFocused && lastHtmlRef.current !== targetHtml) {
      lastHtmlRef.current = targetHtml;
      editorRef.current.innerHTML = targetHtml;
    }
    updateToolbarState();
  }, [value]);

  useEffect(() => {
    const handler = () => {
      if (document.activeElement === editorRef.current) {
        updateToolbarState();
      }
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (toolbarWrapperRef.current && !toolbarWrapperRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const toolbarButtonStyle = (active) => ({
    border: "1px solid",
    borderColor: active ? "#4c1d95" : "#cbd5f5",
    background: active ? "#ede9fe" : "#f8fafc",
    color: active ? "#4c1d95" : "#0f172a",
    padding: "4px 10px",
    borderRadius: 6,
    fontWeight: 600,
    cursor: "pointer",
    minWidth: 34,
  });

  const placeholderVisible = !hasVisualContent(value || "");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div ref={toolbarWrapperRef} style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {formattingButtons.map((btn) => {
            const active =
              btn.command && toolbarState[btn.command] !== undefined
                ? !!toolbarState[btn.command]
                : btn.id === "highlight"
                  ? !!toolbarState.highlight
                  : false;
            return (
              <button
                key={btn.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  if (btn.action) {
                    btn.action(event);
                    return;
                  }
                  if (btn.id === "highlight" && active && btn.toggleValue) {
                    runCommand(btn.command, btn.toggleValue);
                    return;
                  }
                  runCommand(btn.command, btn.value ?? null);
                }}
                title={btn.title}
                aria-label={btn.title}
                style={toolbarButtonStyle(active)}
              >
                {btn.icon}
              </button>
            );
          })}
        </div>
        {menuOpen && (
          <div style={ATTACH_MENU_STYLE}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, color: "#4b5563" }}>Quick Table</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={tableConfig.rows}
                  onChange={(e) => setTableConfig((prev) => ({ ...prev, rows: e.target.value }))}
                  style={{ width: 60, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6 }}
                />
                <span style={{ fontSize: 12 }}>rows</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={tableConfig.cols}
                  onChange={(e) => setTableConfig((prev) => ({ ...prev, cols: e.target.value }))}
                  style={{ width: 60, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6 }}
                />
                <span style={{ fontSize: 12 }}>cols</span>
              </div>
              <button type="button" onClick={handleQuickInsertTable} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>
                Insert Table
              </button>
            </div>
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
              <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 6 }}>Image</div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}
              >
                Upload Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageFileChange}
              />
            </div>
          </div>
        )}
      </div>
      <div style={{ position: "relative" }}>
        {placeholderVisible && (
          <span style={{ position: "absolute", color: "#94a3b8", left: 12, top: 10, pointerEvents: "none" }}>
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncEditor}
          onBlur={syncEditor}
          style={EDITOR_STYLE}
        />
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Toolbar applies formatting directly; HTML is stored automatically.</p>
    </div>
  );
}

RichTextEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
};

export default RichTextEditor;
