"use client";

import { useEffect, useRef, useState } from "react";
import type { WebContainer } from "@webcontainer/api";
import { runTests } from "@/engine/run-tests";
import { mintCredential } from "@/lib/credentials";
import { mockMessages } from "@/lib/mocks/agents";
import type { FixCandidate, Incident, TestResult } from "@/lib/types";

export function IncidentWorkbench() {
  const webcontainerRef = useRef<WebContainer | null>(null);
  const [incident, setIncident] = useState<Incident>();
  const [source, setSource] = useState("");
  const [selectedFixes, setSelectedFixes] = useState<string[]>([]);
  const [result, setResult] = useState<TestResult>();
  const [credentialOpen, setCredentialOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [fixes, setFixes] = useState<FixCandidate[]>([]);

  useEffect(() => {
    void fetch("/api/incident")
      .then((response) => response.json() as Promise<Incident>)
      .then((loadedIncident) => {
        setIncident(loadedIncident);
        setSource(loadedIncident.files.find((file) => file.path === loadedIncident.activeFile)?.content ?? "");
      });
  }, []);

  useEffect(() => {
    if (!incident) return;
    const controller = new AbortController();
    void fetch("/api/agents/fixes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: [{ path: incident.activeFile, content: source }], messages: mockMessages }),
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() as Promise<FixCandidate[]> : Promise.reject())
      .then((recommendations) => setFixes(recommendations))
      .catch(() => {
        if (!controller.signal.aborted) setFixes([]);
      });
    return () => controller.abort();
  }, [incident, source]);

  const applyFix = (fix: FixCandidate) => {
    setSelectedFixes((current) => [...current, fix.id]);
    if (fix.faultTag === "verified") setSource(fix.patch);
  };

  const verify = async () => {
    if (!incident || running) return;
    setRunning(true);
    try {
      const execution = await runTests(incident, source, webcontainerRef.current);
      webcontainerRef.current = execution.runtime;
      setResult(execution.result);
      if (execution.result.passed) setCredentialOpen(true);
    } finally {
      setRunning(false);
    }
  };

  if (!incident) return <main className="shell"><p>Loading incident artifact…</p></main>;
  const credential = mintCredential({ incidentId: incident.id, startedAt: "", selectedFixIds: selectedFixes, caughtIncorrectAiFix: selectedFixes.some((id) => id !== "atomic-payment"), testResult: result });

  return <main className="shell">
    <header className="topbar"><div><span className="brand">PAGER</span><span className="environment">production / {incident.service}</span></div><span className="timer">02:14 elapsed</span></header>
    <section className={result?.passed ? "alert cleared" : "alert"}><strong>{result?.passed ? "RESOLVED" : `${incident.severity} · INCIDENT`}</strong><span>{result?.passed ? "The incident has cleared." : incident.alert}</span></section>
    <section className="mission"><span>INCIDENT / {incident.title}</span><h1>Find the cause. Don’t ship the confident wrong fix.</h1></section>
    <div className="workbench">
      <section className="panel code-panel" aria-label="Incident source code"><div className="panel-heading"><span>{incident.activeFile}</span><span>TypeScript</span></div><textarea aria-label="Incident source editor" value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} /><div className="verify-row"><button className="verify" onClick={() => void verify()} disabled={running}>{running ? "Running real tests…" : "Run verification suite"}</button>{result && <span className={result.passed ? "result pass" : "result fail"}>{result.summary}</span>}</div></section>
      <aside className="side-stack">
        <section className="panel messages" aria-label="Incident chat"><div className="panel-heading">INCIDENT CHANNEL <span>3 online</span></div>{mockMessages.map((message) => <article key={message.id} className="message"><strong>{message.author}</strong><time>{message.timestamp}</time><p>{message.body}</p></article>)}</section>
        <section className="panel fixes" aria-label="AI pair recommendations"><div className="panel-heading">AI PAIR · RECOMMENDATIONS</div>{fixes.map((fix) => <article key={fix.id} className="fix"><div><strong>{fix.title}</strong><p>{fix.rationale}</p></div><button onClick={() => applyFix(fix)} disabled={selectedFixes.includes(fix.id)}>{selectedFixes.includes(fix.id) ? "Reviewed" : fix.faultTag === "verified" ? "Apply" : "Reject"}</button></article>)}</section>
      </aside>
    </div>
    {result && <section className="test-panel"><strong>VERIFICATION OUTPUT</strong>{result.tests.map((test) => <div key={test.name}><span className={test.passed ? "pass" : "fail"}>{test.passed ? "PASS" : "FAIL"}</span><span>{test.name}</span><em>{test.detail}</em></div>)}</section>}
    {credentialOpen && <section className="credential" role="status"><button aria-label="Close credential" onClick={() => setCredentialOpen(false)}>×</button><span>EXECUTION-VERIFIED</span><h2>{credential.title}</h2><p>{credential.summary}</p><small>Issued {credential.issuedAt} · Mission: {incident.title}</small></section>}
  </main>;
}
