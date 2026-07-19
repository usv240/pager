"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IncidentClock } from "@/components/incident-clock";
import { saveCredentialSession } from "@/engine/credential-session";
import { runTests } from "@/engine/run-tests";
import type { RunnerRuntime } from "@/engine/runners";
import type { AgentGamePhase, AgentStakeholderRole } from "@/lib/agents";
import { mintCredential } from "@/lib/credentials";
import { mockMessages } from "@/lib/mocks/agents";
import type { FixCandidate, Incident, IncidentSummary, StakeholderMessage, TestResult } from "@/lib/types";

export function IncidentWorkbench() {
  const runnerRuntimeRef = useRef<RunnerRuntime | null>(null);
  const missionStartedAtRef = useRef<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [incident, setIncident] = useState<Incident>();
  const [catalog, setCatalog] = useState<IncidentSummary[]>([]);
  const [files, setFiles] = useState<Incident["files"]>([]);
  const [activeFile, setActiveFile] = useState("");
  const [fixes, setFixes] = useState<FixCandidate[]>([]);
  const [stakeholderMessages, setStakeholderMessages] = useState<StakeholderMessage[]>([]);
  const [decisions, setDecisions] = useState<Record<string, "applied" | "rejected">>({});
  const [reviewingFixId, setReviewingFixId] = useState("");
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
        missionStartedAtRef.current = Date.now();
        setIncident(loadedIncident);
        setFiles(loadedIncident.files);
        setActiveFile(loadedIncident.activeFile);
        setFixes([]);
        setStakeholderMessages([]);
        setDecisions({});
        setReviewingFixId("");
        setResult(undefined);
        setExecutionError("");
        setCompletionMessage("");
      });
  }, [selectedIncidentId]);

  const source = files.find((file) => file.path === activeFile)?.content ?? "";
  const activeIncident = useMemo(() => incident && { ...incident, files, activeFile }, [incident, files, activeFile]);
  const updateSource = (path: string, content: string) => setFiles((current) => current.map((file) => file.path === path ? { ...file, content } : file));
  const supportsAgents = incident?.execution.language === "typescript";
  const reviewedCount = Object.keys(decisions).length;
  const gamePhase = useMemo<AgentGamePhase>(() => {
    if (result && !result.passed) return "after-tests-fail";
    if (fixes.some((fix) => decisions[fix.id] === "applied" && fix.faultTag !== "verified")) return "after-wrong-fix";
    return reviewedCount > 0 ? "mid" : "start";
  }, [decisions, fixes, result, reviewedCount]);
  const channelMessages = [...stakeholderMessages, ...mockMessages.filter((message) => message.role === "ai-pair")];

  useEffect(() => {
    if (!activeIncident || !supportsAgents) return;
    const controller = new AbortController();
    void fetch("/api/agents/fixes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: activeIncident.files, messages: mockMessages }),
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() as Promise<FixCandidate[]> : Promise.reject())
      .then(setFixes)
      .catch(() => {
        if (!controller.signal.aborted) setFixes([]);
      });
    return () => controller.abort();
  }, [activeIncident, supportsAgents]);

  useEffect(() => {
    if (!activeIncident || !supportsAgents) return;
    const controller = new AbortController();
    const roles: AgentStakeholderRole[] = ["pm", "senior"];
    const elapsedSeconds = missionStartedAtRef.current ? Math.floor((Date.now() - missionStartedAtRef.current) / 1000) : 0;
    void Promise.all(roles.map(async (role) => {
      const response = await fetch("/api/agents/stakeholder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: activeIncident.files, messages: mockMessages, role, phase: gamePhase, elapsedSeconds }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Stakeholder response unavailable.");
      return response.json() as Promise<StakeholderMessage>;
    }))
      .then(setStakeholderMessages)
      .catch(() => {
        if (!controller.signal.aborted) setStakeholderMessages(mockMessages.filter((message) => message.role !== "ai-pair"));
      });
    return () => controller.abort();
  }, [activeIncident, gamePhase, supportsAgents]);

  const recordDecision = (fix: FixCandidate, decision: "applied" | "rejected") => {
    setDecisions((current) => ({ ...current, [fix.id]: decision }));
    if (decision === "applied") updateSource(fix.targetFile ?? activeFile, fix.patch);
    setReviewingFixId("");
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
      const caughtIncorrectAiFix = fixes.some((fix) => decisions[fix.id] === "rejected" && fix.faultTag !== "verified");
      if (execution.result.passed && caughtIncorrectAiFix) {
        const credential = mintCredential({ incidentId: activeIncident.id, startedAt: "", selectedFixIds: Object.keys(decisions), caughtIncorrectAiFix, testResult: execution.result });
        saveCredentialSession({ credential, incidentTitle: activeIncident.title, briefing: activeIncident.briefing, caughtIncorrectAiFix, testResult: execution.result });
        router.push("/credential");
      } else if (execution.result.passed) {
        setCompletionMessage("Tests passed. Review and reject an incorrect AI recommendation to mint the credential.");
      }
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : "The verification runner could not start.");
    } finally {
      setRunning(false);
    }
  };

  const reviewFeedback = (fix: FixCandidate) => {
    if (fix.faultTag === "symptom-not-cause") return "This proposal changes the reported gateway symptom, not the concurrent read-and-charge sequence.";
    if (fix.faultTag === "partial-fix") return "This reduces one duplicate effect, but it does not make the complete checkout state transition atomic.";
    if (fix.faultTag === "new-regression") return "This proposal introduces a separate reliability risk. Verify the full acceptance behavior before shipping it.";
    return "This repair coordinates concurrent checkout work before the gateway call. The execution suite remains the final authority.";
  };

  if (!incident) return <main className="shell"><p>Loading incident artifact…</p></main>;
  return <main className="shell">
    <header className="topbar"><div><span className="brand">PAGER</span><label className="environment">production / <select aria-label="Choose incident" value={incident.id} onChange={(event) => router.push(`/?incident=${encodeURIComponent(event.target.value)}`)}>{catalog.map((mission) => <option key={mission.id} value={mission.id}>{mission.title} · {mission.language}</option>)}</select></label></div><IncidentClock timeLimitSeconds={incident.timeLimitSeconds} /></header>
    <section className={result?.passed ? "alert cleared" : "alert"}><strong>{result?.passed ? "RESOLVED" : `${incident.severity} · INCIDENT`}</strong><span>{result?.passed ? "The incident has cleared." : incident.alert}</span></section>
    <section className="mission"><span>INCIDENT / {incident.title}</span><h1>Find the cause. Don’t ship the confident wrong fix.</h1><p>{incident.briefing.objective}</p><p className="success-criterion"><strong>Verification target:</strong> {incident.briefing.successCriterion}</p></section>
    <ol className="mission-progress" aria-label="Mission progress"><li className={reviewedCount > 0 ? "complete" : "current"}><span>1</span><div><strong>Review guidance</strong><small>{reviewedCount > 0 ? `${reviewedCount} decision${reviewedCount === 1 ? "" : "s"} recorded` : "Compare the AI proposals with the code."}</small></div></li><li className={reviewedCount > 0 ? "current" : ""}><span>2</span><div><strong>Make a judgment</strong><small>Apply or reject a proposal before testing.</small></div></li><li className={result ? (result.passed ? "complete" : "current") : ""}><span>3</span><div><strong>Verify by execution</strong><small>{result ? result.summary : "Run the full incident suite."}</small></div></li></ol>
    <div className="workbench">
      <section className="panel code-panel" aria-label="Incident source code"><div className="panel-heading"><span>{activeFile}</span><span>{incident.execution.language}</span></div><nav className="file-explorer" aria-label="Incident files">{files.map((file) => <button key={file.path} className={file.path === activeFile ? "file selected" : "file"} onClick={() => setActiveFile(file.path)}>{file.path}</button>)}</nav><textarea aria-label="Incident source editor" value={source} onChange={(event) => updateSource(activeFile, event.target.value)} spellCheck={false} /><div className="verify-row"><button className="verify" onClick={() => void verify()} disabled={running}>{running ? "Running real tests…" : "Run verification suite"}</button>{result && <span className={result.passed ? "result pass" : "result fail"}>{result.summary}</span>}</div>{executionError && <p className="completion-message" role="alert">{executionError}</p>}</section>
      <aside className="side-stack">
        {supportsAgents ? <><section className="panel messages" aria-label="Incident chat"><div className="panel-heading">INCIDENT CHANNEL <span>3 online</span></div>{channelMessages.map((message) => <article key={message.id} className="message"><strong>{message.author}</strong><time>{message.timestamp}</time><p>{message.body}</p></article>)}</section><section className="panel fixes" aria-label="AI pair recommendations"><div className="panel-heading">AI PAIR · RECOMMENDATIONS</div>{fixes.map((fix) => { const decision = decisions[fix.id]; const reviewing = reviewingFixId === fix.id; return <article key={fix.id} className="fix"><div><strong>{fix.title}</strong><p>{fix.rationale}</p>{decision && <p className="review-feedback"><b>{decision === "rejected" ? "Rejected." : "Applied."}</b> {reviewFeedback(fix)}</p>}{reviewing && <div className="decision-actions" role="group" aria-label={`Decision for ${fix.title}`}><button onClick={() => recordDecision(fix, "rejected")}>Reject suggestion</button><button onClick={() => recordDecision(fix, "applied")}>Apply suggestion</button></div>}</div>{!decision && <button onClick={() => setReviewingFixId(reviewing ? "" : fix.id)} aria-expanded={reviewing}>{reviewing ? "Close" : "Review"}</button>}</article>; })}</section></> : <section className="panel messages" aria-label="Agent availability"><div className="panel-heading">AGENT CONTENT</div><article className="message"><strong>Mission pack incomplete</strong><p>Python execution is available for smoke testing. PM, Senior, and AI Pair content must be authored and evaluated for this language before learners can use this mission.</p></article></section>}
      </aside>
    </div>
    {result && <section className="test-panel"><strong>VERIFICATION OUTPUT</strong>{result.tests.map((test) => <div key={test.name}><span className={test.passed ? "pass" : "fail"}>{test.passed ? "PASS" : "FAIL"}</span><span>{test.name}</span><em>{test.detail}</em></div>)}</section>}
    {completionMessage && <p className="completion-message" role="status">{completionMessage}</p>}
  </main>;
}
