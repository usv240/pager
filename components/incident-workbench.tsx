"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WebContainer } from "@webcontainer/api";
import { useRouter } from "next/navigation";
import { saveCredentialSession } from "@/engine/credential-session";
import { runTests } from "@/engine/run-tests";
import { mintCredential, proposeFix } from "@/lib";
import { mockMessages } from "@/lib/mocks/agents";
import type { FixCandidate, Incident, TestResult } from "@/lib/types";

export function IncidentWorkbench() {
  const webcontainerRef = useRef<WebContainer | null>(null);
  const router = useRouter();
  const [incident, setIncident] = useState<Incident>();
  const [files, setFiles] = useState<Incident["files"]>([]);
  const [activeFile, setActiveFile] = useState("");
  const [selectedFixes, setSelectedFixes] = useState<string[]>([]);
  const [result, setResult] = useState<TestResult>();
  const [completionMessage, setCompletionMessage] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    void fetch("/api/incident")
      .then((response) => response.json() as Promise<Incident>)
      .then((loadedIncident) => {
        setIncident(loadedIncident);
        setFiles(loadedIncident.files);
        setActiveFile(loadedIncident.activeFile);
      });
  }, []);

  const source = files.find((file) => file.path === activeFile)?.content ?? "";
  const activeIncident = useMemo(() => incident && { ...incident, files, activeFile }, [incident, files, activeFile]);
  const updateSource = (content: string) => setFiles((current) => current.map((file) => file.path === activeFile ? { ...file, content } : file));
  const fixes = useMemo(() => proposeFix({ files: activeIncident ? [{ path: activeIncident.activeFile, content: source }] : [], messages: mockMessages }), [activeIncident, source]);

  const applyFix = (fix: FixCandidate) => {
    setSelectedFixes((current) => [...current, fix.id]);
    if (fix.faultTag === "verified") updateSource(fix.patch);
  };

  const verify = async () => {
    if (!activeIncident || running) return;
    setRunning(true);
    try {
      const execution = await runTests(activeIncident, webcontainerRef.current);
      webcontainerRef.current = execution.runtime;
      setResult(execution.result);
      const caughtIncorrectAiFix = selectedFixes.some((id) => id !== "atomic-payment");
      if (execution.result.passed && caughtIncorrectAiFix) {
        const credential = mintCredential({ incidentId: activeIncident.id, startedAt: "", selectedFixIds: selectedFixes, caughtIncorrectAiFix, testResult: execution.result });
        saveCredentialSession({ credential, incidentTitle: activeIncident.title, caughtIncorrectAiFix, testResult: execution.result });
        router.push("/credential");
      } else if (execution.result.passed) {
        setCompletionMessage("Tests passed. Review and reject an incorrect AI recommendation to mint the credential.");
      }
    } finally {
      setRunning(false);
    }
  };

  if (!incident) return <main className="shell"><p>Loading incident artifact…</p></main>;
  return <main className="shell">
    <header className="topbar"><div><span className="brand">PAGER</span><span className="environment">production / {incident.service}</span></div><span className="timer">02:14 elapsed</span></header>
    <section className={result?.passed ? "alert cleared" : "alert"}><strong>{result?.passed ? "RESOLVED" : `${incident.severity} · INCIDENT`}</strong><span>{result?.passed ? "The incident has cleared." : incident.alert}</span></section>
    <section className="mission"><span>INCIDENT / {incident.title}</span><h1>Find the cause. Don’t ship the confident wrong fix.</h1></section>
    <div className="workbench">
      <section className="panel code-panel" aria-label="Incident source code"><div className="panel-heading"><span>{activeFile}</span><span>TypeScript</span></div><nav className="file-explorer" aria-label="Incident files">{files.map((file) => <button key={file.path} className={file.path === activeFile ? "file selected" : "file"} onClick={() => setActiveFile(file.path)}>{file.path}</button>)}</nav><textarea aria-label="Incident source editor" value={source} onChange={(event) => updateSource(event.target.value)} spellCheck={false} /><div className="verify-row"><button className="verify" onClick={() => void verify()} disabled={running}>{running ? "Running real tests…" : "Run verification suite"}</button>{result && <span className={result.passed ? "result pass" : "result fail"}>{result.summary}</span>}</div></section>
      <aside className="side-stack">
        <section className="panel messages" aria-label="Incident chat"><div className="panel-heading">INCIDENT CHANNEL <span>3 online</span></div>{mockMessages.map((message) => <article key={message.id} className="message"><strong>{message.author}</strong><time>{message.timestamp}</time><p>{message.body}</p></article>)}</section>
        <section className="panel fixes" aria-label="AI pair recommendations"><div className="panel-heading">AI PAIR · RECOMMENDATIONS</div>{fixes.map((fix) => <article key={fix.id} className="fix"><div><strong>{fix.title}</strong><p>{fix.rationale}</p></div><button onClick={() => applyFix(fix)} disabled={selectedFixes.includes(fix.id)}>{selectedFixes.includes(fix.id) ? "Reviewed" : fix.faultTag === "verified" ? "Apply" : "Reject"}</button></article>)}</section>
      </aside>
    </div>
    {result && <section className="test-panel"><strong>VERIFICATION OUTPUT</strong>{result.tests.map((test) => <div key={test.name}><span className={test.passed ? "pass" : "fail"}>{test.passed ? "PASS" : "FAIL"}</span><span>{test.name}</span><em>{test.detail}</em></div>)}</section>}
    {completionMessage && <p className="completion-message" role="status">{completionMessage}</p>}
  </main>;
}
