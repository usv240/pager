"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveCredentialSession } from "@/engine/credential-session";
import { runTests } from "@/engine/run-tests";
import type { RunnerRuntime } from "@/engine/runners";
import { IncidentClock } from "@/components/incident-clock";
import { mintCredential, proposeFix } from "@/lib";
import { applyMockFix, mockMessages } from "@/lib/mocks/agents";
import type { FixCandidate, Incident, IncidentSummary, TestResult } from "@/lib/types";

export function IncidentWorkbench() {
  const runnerRuntimeRef = useRef<RunnerRuntime | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [incident, setIncident] = useState<Incident>();
  const [catalog, setCatalog] = useState<IncidentSummary[]>([]);
  const [files, setFiles] = useState<Incident["files"]>([]);
  const [activeFile, setActiveFile] = useState("");
  const [selectedFixes, setSelectedFixes] = useState<string[]>([]);
  const [result, setResult] = useState<TestResult>();
  const [executionError, setExecutionError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [running, setRunning] = useState(false);
  const selectedIncidentId = searchParams.get("incident") ?? "";

  useEffect(() => {
    void fetch("/api/incidents")
      .then((response) => response.json() as Promise<IncidentSummary[]>)
      .then(setCatalog);
  }, []);

  useEffect(() => {
    const query = selectedIncidentId ? `?incident=${encodeURIComponent(selectedIncidentId)}` : "";
    void fetch(`/api/incident${query}`)
      .then((response) => response.json() as Promise<Incident>)
      .then((loadedIncident) => {
        runnerRuntimeRef.current = null;
        setIncident(loadedIncident);
        setFiles(loadedIncident.files);
        setActiveFile(loadedIncident.activeFile);
        setSelectedFixes([]);
        setResult(undefined);
        setExecutionError("");
        setCompletionMessage("");
      });
  }, [selectedIncidentId]);

  const source = files.find((file) => file.path === activeFile)?.content ?? "";
  const activeIncident = useMemo(() => incident && { ...incident, files, activeFile }, [incident, files, activeFile]);
  const updateSource = (content: string) => setFiles((current) => current.map((file) => file.path === activeFile ? { ...file, content } : file));
  const supportsMockAgents = incident?.execution.language === "typescript";
  const fixes = useMemo(() => supportsMockAgents ? proposeFix({ files: activeIncident ? [{ path: activeIncident.activeFile, content: source }] : [], messages: mockMessages }) : [], [activeIncident, source, supportsMockAgents]);

  const applyFix = (fix: FixCandidate) => {
    setSelectedFixes((current) => [...current, fix.id]);
    if (fix.faultTag === "verified") updateSource(applyMockFix(fix, source));
  };

  const verify = async () => {
    if (!activeIncident || running) return;
    setExecutionError("");
    setCompletionMessage("");
    setRunning(true);
    try {
      const execution = await runTests(activeIncident, runnerRuntimeRef.current);
      runnerRuntimeRef.current = execution.runtime;
      setResult(execution.result);
      const caughtIncorrectAiFix = selectedFixes.some((id) => id !== "atomic-payment");
      if (execution.result.passed && caughtIncorrectAiFix) {
        const credential = mintCredential({ incidentId: activeIncident.id, startedAt: "", selectedFixIds: selectedFixes, caughtIncorrectAiFix, testResult: execution.result });
        saveCredentialSession({ credential, incidentTitle: activeIncident.title, caughtIncorrectAiFix, testResult: execution.result });
        router.push("/credential");
      } else if (execution.result.passed) {
        setCompletionMessage("Tests passed. Review and reject an incorrect AI recommendation to mint the credential.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The verification runner could not start.";
      setExecutionError(message);
    } finally {
      setRunning(false);
    }
  };

  if (!incident) return <main className="shell"><p>Loading incident artifact…</p></main>;
  return <main className="shell">
    <header className="topbar"><div><span className="brand">PAGER</span><label className="environment">production / <select aria-label="Choose incident" value={incident.id} onChange={(event) => router.push(`/?incident=${encodeURIComponent(event.target.value)}`)}>{catalog.map((mission) => <option key={mission.id} value={mission.id}>{mission.title} · {mission.language}</option>)}</select></label></div><IncidentClock timeLimitSeconds={incident.timeLimitSeconds} /></header>
    <section className={result?.passed ? "alert cleared" : "alert"}><strong>{result?.passed ? "RESOLVED" : `${incident.severity} · INCIDENT`}</strong><span>{result?.passed ? "The incident has cleared." : incident.alert}</span></section>
    <section className="mission"><span>INCIDENT / {incident.title}</span><h1>Find the cause. Don’t ship the confident wrong fix.</h1></section>
    <div className="workbench">
      <section className="panel code-panel" aria-label="Incident source code"><div className="panel-heading"><span>{activeFile}</span><span>{incident.execution.language}</span></div><nav className="file-explorer" aria-label="Incident files">{files.map((file) => <button key={file.path} className={file.path === activeFile ? "file selected" : "file"} onClick={() => setActiveFile(file.path)}>{file.path}</button>)}</nav><textarea aria-label="Incident source editor" value={source} onChange={(event) => updateSource(event.target.value)} spellCheck={false} /><div className="verify-row"><button className="verify" onClick={() => void verify()} disabled={running}>{running ? "Running real tests…" : "Run verification suite"}</button>{result && <span className={result.passed ? "result pass" : "result fail"}>{result.summary}</span>}</div>{executionError && <p className="completion-message" role="alert">{executionError}</p>}</section>
      <aside className="side-stack">
        {supportsMockAgents ? <><section className="panel messages" aria-label="Incident chat"><div className="panel-heading">INCIDENT CHANNEL <span>3 online</span></div>{mockMessages.map((message) => <article key={message.id} className="message"><strong>{message.author}</strong><time>{message.timestamp}</time><p>{message.body}</p></article>)}</section><section className="panel fixes" aria-label="AI pair recommendations"><div className="panel-heading">AI PAIR · RECOMMENDATIONS</div>{fixes.map((fix) => <article key={fix.id} className="fix"><div><strong>{fix.title}</strong><p>{fix.rationale}</p></div><button onClick={() => applyFix(fix)} disabled={selectedFixes.includes(fix.id)}>{selectedFixes.includes(fix.id) ? "Reviewed" : fix.faultTag === "verified" ? "Apply" : "Reject"}</button></article>)}</section></> : <section className="panel messages" aria-label="Agent availability"><div className="panel-heading">AGENT CONTENT</div><article className="message"><strong>Mission pack incomplete</strong><p>Python execution is available for smoke testing. PM, Senior, and AI Pair content must be authored and evaluated for this language before learners can use this mission.</p></article></section>}
      </aside>
    </div>
    {result && <section className="test-panel"><strong>VERIFICATION OUTPUT</strong>{result.tests.map((test) => <div key={test.name}><span className={test.passed ? "pass" : "fail"}>{test.passed ? "PASS" : "FAIL"}</span><span>{test.name}</span><em>{test.detail}</em></div>)}</section>}
    {completionMessage && <p className="completion-message" role="status">{completionMessage}</p>}
  </main>;
}
