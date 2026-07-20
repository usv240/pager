"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="editor-loading">Preparing workspace...</div> });

export function CodeEditor({ language, path, value, onChange }: { language: string; path: string; value: string; onChange(value: string): void }) {
  const [theme, setTheme] = useState("pager-dark");
  useEffect(() => {
    const updateTheme = () => setTheme(document.documentElement.dataset.theme === "light" ? "pager-light" : "pager-dark");
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return <div className="monaco-shell"><Editor path={path} language={language === "python" ? "python" : "typescript"} theme={theme} value={value} onChange={(nextValue) => onChange(nextValue ?? "")} beforeMount={(monaco) => { monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false }); monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false }); monaco.editor.defineTheme("pager-dark", { base: "vs-dark", inherit: true, rules: [], colors: { "editor.background": "#0b1219", "editorGutter.background": "#0b1219", "editorLineNumber.foreground": "#536273", "editorCursor.foreground": "#8cb6ff", "editor.selectionBackground": "#244a75" } }); monaco.editor.defineTheme("pager-light", { base: "vs", inherit: true, rules: [], colors: { "editor.background": "#f8fbff", "editorGutter.background": "#f8fbff", "editorLineNumber.foreground": "#8191a2", "editorCursor.foreground": "#1f61c9", "editor.selectionBackground": "#d5e6ff" } }); }} options={{ automaticLayout: true, fontFamily: "'DM Mono', monospace", fontSize: 14, lineHeight: 23, minimap: { enabled: false }, padding: { top: 18, bottom: 18 }, scrollBeyondLastLine: false, wordWrap: "on", tabSize: 2, smoothScrolling: true }} /></div>;
}
