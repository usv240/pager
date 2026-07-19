"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IncidentClock } from "@/components/incident-clock";
import { InfoTip } from "@/components/info-tip";
import { saveCredentialSession } from "@/engine/credential-session";
import { runTests } from "@/engine/run-tests";
import type { RunnerRuntime } from "@/engine/runners";
import type { AgentGamePhase, AgentStakeholderRole } from "@/lib/agents";
import { mintCredential } from "@/lib/credentials";
import { mockMessages } from "@/lib/mocks/agents";
import type { FixCandidate, Incident, IncidentSummary, StakeholderMessage, TestResult } from "@/lib/types";

type LearnerFix = Omit<FixCandidate, "faultTag">;
type CandidateReveal = Pick<FixCandidate, "id" | "faultTag"> & { teaching: string };

export function IncidentWorkbench() {
  const runnerRuntimeRef = useRef<RunnerRuntime | null>(null);
  const missionStartedAtRef = useRef<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [incident, setIncident] = useState<Incident>();
  const [catalog, setCatalog] = useState<IncidentSummary[]>([]);
  const [files, setFiles] = useState<Incident["files"]>([]);
  const [activeFile, setActiveFile] = useState("");
  const [fixes, setFixes] = useState<LearnerFix[]>([]);
  const [reveals, setReveals] = useState<Record<string, CandidateReveal>>({});
  const [stakeholderMessages, setStakeholderMessages] = useState<StakeholderMessage[]>([]);
  const [decisions, setDecisions] = useState<Record<string, "applied" | "rejected">>({});
  const [reviewingFixId, setReviewingFixId] = useState("");
  const [result, setResult] = useState<TestResult>();
  const [executionError, setExecutionError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [running, setRunning] = useState(false);
  const selectedIncidentId = searchParams.get("incident") ?? "";
  const missionHref = (incidentId: string) => `/?play=1&incident=${encodeURIComponent(incidentId)}`;

  useEffect(() => {
    void fetch("/api/incidents").then((response) => response.json() as Promise<IncidentSummary[]>).then(setCatalog);
  }, []);

  useEffect(() => {
    const query = selectedIncidentId ? `?incident=${encodeURIComponent(selectedIncidentId)}` : "";
    void fetch(`/api/incident${query}`).then((response) => response.json() as Promise<Incident>).then((loadedIncident) => {
      runnerRuntimeRef.current = null;
      missionStartedAtRef.current = Date.now();
      setIncident(loadedIncident);
      setFiles(loadedIncident.files);
      setActiveFile(loadedIncident.activeFile);
      setFixes([]); setReveals({}); setStakeholderMessages([]); setDecisions({}); setReviewingFixId("");
      setResult(undefined); setExecutionError(""); setCompletionMessage("");
    });
  }, [selectedIncidentId]);

  const source = files.find((file) => file.path === activeFile)?.content ?? "";
  const activeIncident = useMemo(() => incident && { ...incident, files, activeFile }, [incident, files, activeFile]);
  const supportsAgents = incident?.execution.language === "typescript";
  const reviewedCount = Object.keys(decisions).length;
  const gamePhase = useMemo<AgentGamePhase>(() => {
    if (result && !result.passed) return "after-tests-fail";
    if (fixes.some((fix) => decisions[fix.id] === "applied" && reveals[fix.id]?.faultTag !== "verified" && reveals[fix.id] !== undefined)) return "after-wrong-fix";
    return reviewedCount > 0 ? "mid" : "start";
  }, [decisions, fixes, result, reveals, reviewedCount]);
  const channelMessages = [...stakeholderMessages, ...mockMessages.filter((message) => message.role === "ai-pair")];

  useEffect(() => {
    if (!incident || !supportsAgents) return;
    const controller = new AbortController();
    void fetch("/api/agents/fixes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: incident.files, messages: mockMessages }), signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<LearnerFix[]> : Promise.reject())
      .then(setFixes).catch(() => { if (!controller.signal.aborted) setFixes([]); });
    return () => controller.abort();
  }, [incident, supportsAgents]);

  useEffect(() => {
    if (!incident || !supportsAgents) return;
    const controller = new AbortController();
    const elapsedSeconds = missionStartedAtRef.current ? Math.floor((Date.now() - missionStartedAtRef.current) / 1000) : 0;
    const roles: AgentStakeholderRole[] = ["pm", "senior"];
    void Promise.all(roles.map(async (role) => {
      const response = await fetch("/api/agents/stakeholder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: incident.files, messages: mockMessages, role, phase: gamePhase, elapsedSeconds }), signal: controller.signal });
      if (!response.ok) throw new Error("Stakeholder response unavailable.");
      return response.json() as Promise<StakeholderMessage>;
    })).then(setStakeholderMessages).catch(() => { if (!controller.signal.aborted) setStakeholderMessages(mockMessages.filter((message) => message.role !== "ai-pair")); });
    return () => controller.abort();
  }, [incident, gamePhase, supportsAgents]);

  const updateSource = (path: string, content: string) => setFiles((current) => current.map((file) => file.path === path ? { ...file, content } : file));
  const requestReveal = async (fix: LearnerFix, decision: "applied" | "rejected"): Promise<CandidateReveal | undefined> => {
    try {
      const response = await fetch("/api/agents/reveal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateId: fix.id, decision }) });
      if (!response.ok) return undefined;
      const reveal = await response.json() as CandidateReveal;
      setReveals((current) => ({ ...current, [reveal.id]: reveal }));
      return reveal;
    } catch { return undefined; }
  };
  const recordDecision = (fix: LearnerFix, decision: "applied" | "rejected") => {
    setDecisions((current) => ({ ...current, [fix.id]: decision }));
    if (decision === "applied") updateSource(fix.targetFile ?? activeFile, fix.patch);
    void requestReveal(fix, decision);
    setReviewingFixId("");
  };
  const verify = async () => {
    if (!activeIncident || running) return;
    setExecutionError(""); setCompletionMessage(""); setRunning(true);
    try {
      const execution = await runTests(activeIncident, runnerRuntimeRef.current);
      runnerRuntimeRef.current = execution.runtime;
      setResult(execution.result);
      const rejectedFixes = fixes.filter((fix) => decisions[fix.id] === "rejected");
      const rejectedReveals = await Promise.all(rejectedFixes.map((fix) => reveals[fix.id] ?? requestReveal(fix, "rejected")));
      const caughtIncorrectAiFix = rejectedReveals.some((reveal) => reveal !== undefined && reveal.faultTag !== "verified");
      if (execution.result.passed && caughtIncorrectAiFix) {
        const credential = mintCredential({ incidentId: activeIncident.id, startedAt: "", selectedFixIds: Object.keys(decisions), caughtIncorrectAiFix, testResult: execution.result });
        saveCredentialSession({ credential, incidentTitle: activeIncident.title, briefing: activeIncident.briefing, caughtIncorrectAiFix, testResult: execution.result });
        router.push("/credential");
      } else if (execution.result.passed) setCompletionMessage("Tests passed. Review and reject an incorrect AI recommendation to mint the credential.");
    } catch (error) { setExecutionError(error instanceof Error ? error.message : "The verification runner could not start."); }
    finally { setRunning(false); }
  };

  if (!incident) return <main className="shell"><p>Loading incident artifact...</p></main>;
  return <main className="shell">
    <a className="skip-link" href="#incident-main">Skip to incident workspace</a>
    <header className="topbar"><div className="topbar-brand"><Link className="brand" href="/">PAGER</Link><label className="environment">production / <select aria-label="Choose incident" value={incident.id} onChange={(event) => router.push(missionHref(event.target.value))}>{catalog.map((mission) => <option key={mission.id} value={mission.id}>{mission.title} · {mission.language} · {mission.availability}</option>)}</select></label><InfoTip label="About this simulator">Pager is a judgment simulator. You inspect a real incident, decide whether to trust AI guidance, and prove the outcome by running its acceptance suite.</InfoTip></div><IncidentClock timeLimitSeconds={incident.timeLimitSeconds} /></header>
    <section className={result?.passed ? "alert cleared" : "alert"}><strong>{result?.passed ? "RESOLVED" : `${incident.severity} · INCIDENT`}</strong><span>{result?.passed ? "The incident has cleared." : incident.alert}</span></section>
    <section id="incident-main" className="mission"><span>INCIDENT / {incident.title}</span><h1>Find the cause. Don’t ship the confident wrong fix.</h1><p>{incident.briefing.objective}</p><p className="success-criterion"><strong>Verification target:</strong> {incident.briefing.successCriterion}</p></section>
    <ol className="mission-progress" aria-label="Mission progress"><li className={reviewedCount > 0 ? "complete" : "current"}><span>1</span><div><strong>Review guidance</strong><small>{reviewedCount > 0 ? `${reviewedCount} decision${reviewedCount === 1 ? "" : "s"} recorded` : "Compare the AI proposals with the code."}</small></div></li><li className={reviewedCount > 0 ? "current" : ""}><span>2</span><div><strong>Make a judgment</strong><small>Apply or reject a proposal before testing.</small></div></li><li className={result ? (result.passed ? "complete" : "current") : ""}><span>3</span><div><strong>Verify by execution</strong><small>{result ? result.summary : "Run the full incident suite."}</small></div></li></ol>
    <div className="workbench"><section className="panel code-panel" aria-label="Incident source code"><div className="panel-heading"><span>{activeFile}</span><span>{incident.execution.language}</span></div><label className="file-picker"><span>Open source file</span><select value={activeFile} onChange={(event) => setActiveFile(event.target.value)}>{files.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}</select></label><textarea aria-label="Incident source editor" value={source} onChange={(event) => updateSource(activeFile, event.target.value)} spellCheck={false} /><div className="verify-row"><button className="verify" onClick={() => void verify()} disabled={running}>{running ? "Running real tests..." : "Run verification suite"}</button><InfoTip label="About verification">This runs the incident’s actual acceptance suite in your browser. A passing result is required, but it is not enough for a credential—you must also reject flawed AI guidance.</InfoTip>{result && <span className={result.passed ? "result pass" : "result fail"}>{result.summary}</span>}</div>{executionError && <p className="completion-message" role="alert">{executionError}</p>}</section>
      <aside className="side-stack">{supportsAgents ? <><section className="panel messages" aria-label="Incident chat"><div className="panel-heading">INCIDENT CHANNEL <span>3 online</span></div>{channelMessages.map((message) => <article key={message.id} className="message"><strong>{message.author}</strong><time>{message.timestamp}</time><p>{message.body}</p></article>)}</section><section className="panel fixes" aria-label="AI pair recommendations"><div className="panel-heading">AI PAIR · RECOMMENDATIONS <InfoTip label="How to review AI recommendations">Review exposes the two possible decisions. Pager does not reveal whether a recommendation is safe until after you decide.</InfoTip></div>{fixes.map((fix) => { const decision = decisions[fix.id]; const reveal = reveals[fix.id]; const reviewing = reviewingFixId === fix.id; return <article key={fix.id} className="fix"><div><strong>{fix.title}</strong><p>{fix.rationale}</p>{decision && reveal && <p className="review-feedback"><b>{decision === "rejected" ? "Rejected." : "Applied."}</b> {reveal.teaching}</p>}{reviewing && <div className="decision-actions" role="group" aria-label={`Decision for ${fix.title}`}><button onClick={() => recordDecision(fix, "rejected")}>Reject suggestion</button><button onClick={() => recordDecision(fix, "applied")}>Apply suggestion</button></div>}</div>{!decision && <button onClick={() => setReviewingFixId(reviewing ? "" : fix.id)} aria-expanded={reviewing}>{reviewing ? "Close" : "Review"}</button>}</article>; })}</section></> : <section className="panel messages" aria-label="Agent availability"><div className="panel-heading">AGENT CONTENT</div><article className="message"><strong>Mission pack incomplete</strong><p>Python execution is available for smoke testing. PM, Senior, and AI Pair content must be authored and evaluated for this language before learners can use this mission.</p></article></section>}</aside></div>
    {result && <section className="test-panel"><strong>VERIFICATION OUTPUT</strong>{result.tests.map((test) => <div key={test.name}><span className={test.passed ? "pass" : "fail"}>{test.passed ? "PASS" : "FAIL"}</span><span>{test.name}</span><em>{test.detail}</em></div>)}</section>}
    {completionMessage && <p className="completion-message" role="status">{completionMessage}</p>}
  </main>;
}
