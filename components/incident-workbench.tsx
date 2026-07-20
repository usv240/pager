"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CodeEditor } from "@/components/code-editor";
import { IncidentClock } from "@/components/incident-clock";
import { InfoTip } from "@/components/info-tip";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceGuide } from "@/components/workspace-guide";
import { saveCredentialSession } from "@/engine/credential-session";
import { runTests } from "@/engine/run-tests";
import type { RunnerRuntime } from "@/engine/runners";
import type { AgentGamePhase, AgentStakeholderRole } from "@/lib/agents";
import { mintCredential } from "@/lib/credentials";
import { mockMessages } from "@/lib/mocks/agents";
import type { FixCandidate, Incident, IncidentSummary, StakeholderMessage, TestResult } from "@/lib/types";

type LearnerFix = Omit<FixCandidate, "faultTag">;
type CandidateReveal = Pick<FixCandidate, "id" | "faultTag"> & { teaching: string };
type LeftTab = "brief" | "files" | "evidence";
type RightTab = "channel" | "pair";
type AiQuestion = { question: string; answer: string };

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
  const [verificationProgress, setVerificationProgress] = useState("");
  const [leftTab, setLeftTab] = useState<LeftTab>("brief");
  const [rightTab, setRightTab] = useState<RightTab>("channel");
  const [agentQuestion, setAgentQuestion] = useState("");
  const [agentQuestions, setAgentQuestions] = useState<AiQuestion[]>([]);
  const [agentQuestionError, setAgentQuestionError] = useState("");
  const [askingAgent, setAskingAgent] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const selectedIncidentId = searchParams.get("incident") ?? "";
  const missionHref = (incidentId: string) => `/?play=1&incident=${encodeURIComponent(incidentId)}`;

  useEffect(() => {
    void fetch("/api/incidents")
      .then((response) => response.json() as Promise<IncidentSummary[]>)
      .then(setCatalog);
  }, []);

  useEffect(() => {
    const updateProgress = (event: Event) => setVerificationProgress((event as CustomEvent<string>).detail);
    window.addEventListener("pager:webcontainer-progress", updateProgress);
    return () => window.removeEventListener("pager:webcontainer-progress", updateProgress);
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
        setReveals({});
        setStakeholderMessages([]);
        setDecisions({});
        setReviewingFixId("");
        setResult(undefined);
        setExecutionError("");
        setCompletionMessage("");
        setLeftTab("brief");
        setRightTab("channel");
        setAgentQuestion("");
        setAgentQuestions([]);
        setAgentQuestionError("");
        setGuideOpen(window.localStorage.getItem("pager-workspace-guide-dismissed") !== "1");
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
  const fileGroups = useMemo(() => files.reduce<Record<string, Incident["files"]>>((groups, file) => {
    const separator = file.path.lastIndexOf("/");
    const directory = separator === -1 ? "root" : file.path.slice(0, separator);
    groups[directory] = [...(groups[directory] ?? []), file];
    return groups;
  }, {}), [files]);

  useEffect(() => {
    if (!incident || !supportsAgents) return;
    const controller = new AbortController();
    void fetch("/api/agents/fixes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: incident.files, messages: mockMessages }),
      signal: controller.signal,
    }).then((response) => response.ok ? response.json() as Promise<LearnerFix[]> : Promise.reject())
      .then(setFixes)
      .catch(() => { if (!controller.signal.aborted) setFixes([]); });
    return () => controller.abort();
  }, [incident, supportsAgents]);

  useEffect(() => {
    if (!incident || !supportsAgents) return;
    const controller = new AbortController();
    const elapsedSeconds = missionStartedAtRef.current ? Math.floor((Date.now() - missionStartedAtRef.current) / 1000) : 0;
    const roles: AgentStakeholderRole[] = ["pm", "senior"];
    void Promise.all(roles.map(async (role) => {
      const response = await fetch("/api/agents/stakeholder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: incident.files, messages: mockMessages, role, phase: gamePhase, elapsedSeconds }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Stakeholder response unavailable.");
      return response.json() as Promise<StakeholderMessage>;
    })).then(setStakeholderMessages)
      .catch(() => { if (!controller.signal.aborted) setStakeholderMessages(mockMessages.filter((message) => message.role !== "ai-pair")); });
    return () => controller.abort();
  }, [incident, gamePhase, supportsAgents]);

  const updateSource = (path: string, content: string) => {
    setFiles((current) => current.map((file) => file.path === path ? { ...file, content } : file));
  };
  const requestReveal = async (fix: LearnerFix, decision: "applied" | "rejected"): Promise<CandidateReveal | undefined> => {
    try {
      const response = await fetch("/api/agents/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: fix.id, decision }),
      });
      if (!response.ok) return undefined;
      const reveal = await response.json() as CandidateReveal;
      setReveals((current) => ({ ...current, [reveal.id]: reveal }));
      return reveal;
    } catch {
      return undefined;
    }
  };
  const recordDecision = (fix: LearnerFix, decision: "applied" | "rejected") => {
    setDecisions((current) => ({ ...current, [fix.id]: decision }));
    if (decision === "applied") updateSource(fix.targetFile ?? activeFile, fix.patch);
    void requestReveal(fix, decision);
    setReviewingFixId("");
  };
  const verify = async () => {
    if (!activeIncident || running) return;
    setExecutionError("");
    setCompletionMessage("");
    setVerificationProgress("");
    setRunning(true);
    setLeftTab("evidence");
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
      } else if (execution.result.passed) {
        setCompletionMessage("Tests passed. Review and reject an incorrect AI recommendation to mint the credential.");
      }
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : "The verification runner could not start.");
    } finally {
      setRunning(false);
      setVerificationProgress("");
    }
  };
  const askAgent = async () => {
    const question = agentQuestion.trim();
    if (!question || askingAgent) return;
    setAskingAgent(true);
    setAgentQuestionError("");
    try {
      const response = await fetch("/api/agents/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, activeFile, source }),
      });
      const payload = await response.json() as { answer?: string; error?: string };
      const answer = payload.answer;
      if (!response.ok || !answer) {
        setAgentQuestionError(payload.error ?? "AI Pair could not answer right now.");
        return;
      }
      setAgentQuestions((current) => [...current, { question, answer }]);
      setAgentQuestion("");
    } catch {
      setAgentQuestionError("AI Pair could not answer right now. Keep investigating and try again.");
    } finally {
      setAskingAgent(false);
    }
  };
  const closeGuide = () => {
    window.localStorage.setItem("pager-workspace-guide-dismissed", "1");
    setGuideOpen(false);
  };

  if (!incident) return <main className="shell"><p>Loading incident artifact...</p></main>;

  const openFile = (path: string) => {
    setActiveFile(path);
    setLeftTab("files");
  };

  return (
    <main className="shell workspace-shell">
      <a className="skip-link" href="#workspace-main">Skip to incident workspace</a>
      <header className="workspace-topbar">
        <Link className="brand" href="/">PAGER</Link>
        <span className="workspace-environment">production</span>
        <label className="workspace-mission-select">
          <span className="sr-only">Choose incident</span>
          <select value={incident.id} onChange={(event) => router.push(missionHref(event.target.value))}>
            {catalog.map((mission) => <option key={mission.id} value={mission.id}>{mission.title} · {mission.language} · {mission.availability}</option>)}
          </select>
        </label>
        <nav className="workspace-labs" aria-label="Available labs">
          <Link className={incident.execution.language === "typescript" ? "active" : ""} href="/?play=1">TS / JS</Link>
          <Link className={incident.execution.language === "python" ? "active" : ""} href="/?play=1&incident=python-invoice-queue">Python Lab</Link>
        </nav>
        <div className="workspace-topbar-actions">
          <InfoTip label="About this simulator">Pager is a judgment simulator. Inspect a real incident, decide whether to trust AI guidance, then prove the outcome by running the acceptance suite.</InfoTip>
          <button className="workspace-guide-trigger" onClick={() => setGuideOpen(true)}>Guide</button>
          <ThemeToggle />
          <IncidentClock timeLimitSeconds={incident.timeLimitSeconds} />
        </div>
      </header>

      <section className={result?.passed ? "workspace-alert resolved" : "workspace-alert"} aria-live="polite">
        <strong>{result?.passed ? "RESOLVED" : `${incident.severity} · INCIDENT`}</strong>
        <span>{result?.passed ? "The incident has cleared. Verification evidence is available in the left rail." : incident.alert}</span>
      </section>

      <div id="workspace-main" className="workspace-frame">
        <aside className="workspace-rail" aria-label="Incident context">
          <div className="workspace-rail-header">
            <span>MISSION CONTROL</span>
            <span>{reviewedCount}/3 reviewed</span>
          </div>
          <nav className="workspace-tabs" aria-label="Context panel">
            <button className={leftTab === "brief" ? "active" : ""} onClick={() => setLeftTab("brief")}>Brief</button>
            <button className={leftTab === "files" ? "active" : ""} onClick={() => setLeftTab("files")}>Files <span>{files.length}</span></button>
            <button className={leftTab === "evidence" ? "active" : ""} onClick={() => setLeftTab("evidence")}>Evidence</button>
          </nav>
          <div className="workspace-rail-content">
            {leftTab === "brief" && <>
              <span className="workspace-eyebrow">INCIDENT / {incident.title}</span>
              <h1>{incident.title}</h1>
              <p className="workspace-objective">{incident.briefing.objective}</p>
              <div className="workspace-criterion"><span>SUCCESS CONDITION</span><p>{incident.briefing.successCriterion}</p></div>
              <ol className="workspace-checklist">
                <li className={reviewedCount > 0 ? "complete" : "current"}><span>01</span><div><strong>Interrogate the guidance</strong><p>Compare the proposal with the code path.</p></div></li>
                <li className={reviewedCount > 0 ? "current" : ""}><span>02</span><div><strong>Make the call</strong><p>Apply or reject before execution.</p></div></li>
                <li className={result?.passed ? "complete" : result ? "current" : ""}><span>03</span><div><strong>Prove it by execution</strong><p>{result ? result.summary : "Run the acceptance suite."}</p></div></li>
              </ol>
              <div className="workspace-first-files"><span>START HERE</span>{files.slice(0, 3).map((file) => <button key={file.path} onClick={() => openFile(file.path)}>{file.path}</button>)}</div>
            </>}
            {leftTab === "files" && <div className="workspace-tree">{Object.entries(fileGroups).map(([directory, group]) => <details key={directory} open><summary>{directory}</summary>{group.map((file) => <button key={file.path} className={file.path === activeFile ? "selected" : ""} onClick={() => openFile(file.path)}>{file.path.split("/").at(-1)}</button>)}</details>)}</div>}
            {leftTab === "evidence" && <div className="workspace-evidence">
              <span className="workspace-eyebrow">EXECUTION EVIDENCE</span>
              {!result && <><h2>Nothing has run yet.</h2><p>Your decision is not graded by an AI. Run the real acceptance suite when you are ready to test the code.</p></>}
              {result && <><h2 className={result.passed ? "pass" : "fail"}>{result.passed ? "Suite passed" : "Suite found a failure"}</h2><p>{result.summary}</p><div className="workspace-test-list">{result.tests.map((test) => <div key={test.name}><strong className={test.passed ? "pass" : "fail"}>{test.passed ? "PASS" : "FAIL"}</strong><span>{test.name}</span><small>{test.detail}</small></div>)}</div></>}
              {executionError && <p className="workspace-error" role="alert">{executionError}</p>}
            </div>}
          </div>
        </aside>

        <section className="workspace-editor" aria-label="Source editor">
          <div className="workspace-editor-tabs"><button className="active"><span className="tab-dot" />{activeFile}</button><span>{incident.execution.language}</span></div>
          <label className="workspace-file-picker"><span>Open file</span><select value={activeFile} onChange={(event) => openFile(event.target.value)}>{files.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}</select></label>
          <div className="workspace-editor-surface"><CodeEditor language={incident.execution.language} path={activeFile} value={source} onChange={(content) => updateSource(activeFile, content)} /></div>
          <section className="workspace-runner" aria-label="Verification controls">
            <div><span className="workspace-eyebrow">VERIFICATION</span><p>{running ? verificationProgress || "Running the real acceptance suite…" : result ? result.summary : "Changes are local to this incident. The suite decides what ships."}</p></div>
            <button className="workspace-run-button" onClick={() => void verify()} disabled={running}>{running ? "Running tests…" : "Run verification"}</button>
          </section>
          {completionMessage && <p className="workspace-completion" role="status">{completionMessage}</p>}
        </section>

        <aside className="workspace-console" aria-label="Incident intelligence">
          <div className="workspace-console-header"><div><span>INCIDENT INTELLIGENCE</span><strong>{supportsAgents ? "AI oversight console" : "Python lab guide"}</strong></div><InfoTip label="How Pager evaluates you">Agent guidance can be incomplete or wrong. Only the deterministic acceptance suite verifies a repair; Pager never asks an LLM to decide whether you passed.</InfoTip></div>
          {supportsAgents ? <>
            <nav className="workspace-tabs console-tabs" aria-label="Intelligence panel"><button className={rightTab === "channel" ? "active" : ""} onClick={() => setRightTab("channel")}>Incident chat <span>{channelMessages.length}</span></button><button className={rightTab === "pair" ? "active" : ""} onClick={() => setRightTab("pair")}>AI Pair <span>{fixes.length}</span></button></nav>
            {rightTab === "channel" && <div className="workspace-channel">{channelMessages.map((message) => <article key={message.id} className="workspace-message"><div><strong>{message.author}</strong><time>{message.timestamp}</time></div><p>{message.body}</p></article>)}</div>}
            {rightTab === "pair" && <div className="workspace-pair"><p className="workspace-agent-boundary">Treat every recommendation as a hypothesis. Decide before Pager reveals what it missed.</p>{fixes.map((fix, index) => { const decision = decisions[fix.id]; const reveal = reveals[fix.id]; const reviewing = reviewingFixId === fix.id; return <article key={fix.id} className={`workspace-recommendation ${decision ? "decided" : ""}`}><span>PROPOSAL 0{index + 1}</span><h2>{fix.title}</h2><p>{fix.rationale}</p>{decision && reveal && <p className="workspace-reveal"><b>{decision === "rejected" ? "Rejected." : "Applied."}</b> {reveal.teaching}</p>}{reviewing && <div className="workspace-decision-actions" role="group" aria-label={`Decision for ${fix.title}`}><button onClick={() => recordDecision(fix, "rejected")}>Reject</button><button onClick={() => recordDecision(fix, "applied")}>Apply</button></div>}{!decision && <button className="workspace-review-button" onClick={() => setReviewingFixId(reviewing ? "" : fix.id)} aria-expanded={reviewing}>{reviewing ? "Cancel" : "Review proposal"}</button>}</article>; })}<section className="workspace-agent-ask"><div><span className="workspace-eyebrow">LIVE AI PAIR</span><strong>Ask about the active code</strong></div>{agentQuestions.map((item, index) => <article key={`${item.question}-${index}`} className="workspace-agent-answer"><p><b>You:</b> {item.question}</p><p><b>AI Pair:</b> {item.answer}</p></article>)}<label className="sr-only" htmlFor="agent-question">Ask AI Pair</label><textarea id="agent-question" value={agentQuestion} onChange={(event) => setAgentQuestion(event.target.value)} placeholder="Ask what to inspect, what invariant to test, or what the failure disproves…" maxLength={700} rows={3} /><button onClick={() => void askAgent()} disabled={askingAgent || !agentQuestion.trim()}>{askingAgent ? "Thinking…" : "Ask AI Pair"}</button>{agentQuestionError && <p className="workspace-agent-error" role="alert">{agentQuestionError}</p>}<small>Live responses are constrained to guidance, not answer-revealing patches.</small></section></div>}
          </> : <div className="workspace-python-guide"><span className="workspace-eyebrow">REAL PYTHON EXECUTION</span><h2>Prevent duplicate queue entries.</h2><p>Inspect `enqueue`, add the smallest guard that preserves queue order, then run the unittest suite. This lab is execution-ready; AI Pair decisions and credentialing remain TypeScript-mission only.</p><div><strong>Success condition</strong><p>Repeated enqueue attempts leave each invoice ID exactly once in the pending queue.</p></div></div>}
        </aside>
      </div>
      <WorkspaceGuide open={guideOpen} onClose={closeGuide} />
    </main>
  );
}
