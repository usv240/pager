"use client";

import Link from "next/link";
import { type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CodeEditor } from "@/components/code-editor";
import { IncidentClock } from "@/components/incident-clock";
import { InfoTip } from "@/components/info-tip";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceGuide, type GuideArea } from "@/components/workspace-guide";
import { saveCredentialSession } from "@/engine/credential-session";
import { runTests } from "@/engine/run-tests";
import type { RunnerRuntime } from "@/engine/runners";
import type { AgentGamePhase, AgentStakeholderRole } from "@/lib/agents";
import { mintCredential } from "@/lib/credentials";
import type { FixCandidate, Incident, IncidentSummary, StakeholderMessage, TestResult } from "@/lib/types";

const FAULT_CLASS_LABELS: Record<string, string> = { idempotency: "Idempotency", concurrency: "Concurrency", ordering: "Ordering", "replay-safety": "Replay safety" };

type LearnerFix = Omit<FixCandidate, "faultTag">;
type CandidateReveal = Pick<FixCandidate, "id" | "faultTag"> & { teaching: string };
type LeftTab = "brief" | "signals" | "files" | "evidence";
type RightTab = "channel" | "pair";
type AiQuestion = { question: string; answer: string };
type ResizablePane = "left" | "right";
type IntelligencePaneMode = "default" | "minimized" | "maximized";

const defaultPaneWidths = { left: 280, right: 360 };
const paneLimits = { left: { min: 220, max: 440 }, right: { min: 280, max: 520 } };
const verificationHeightLimits = { min: 160, max: 440 };
const defaultVerificationHeight = 220;
const difficultyOrder = { easy: 0, medium: 1, advanced: 2 };

export function IncidentWorkbench() {
  const runnerRuntimeRef = useRef<RunnerRuntime | null>(null);
  const filesRef = useRef<Incident["files"]>([]);
  const missionStartedAtRef = useRef<number | null>(null);
  const topbarRef = useRef<HTMLElement>(null);
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
  const [activeAppliedFixId, setActiveAppliedFixId] = useState("");
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
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const [intelligencePaneMode, setIntelligencePaneMode] = useState<IntelligencePaneMode>("default");
  const [guideOpen, setGuideOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [paneWidths, setPaneWidths] = useState(defaultPaneWidths);
  const [verificationHeight, setVerificationHeight] = useState(defaultVerificationHeight);
  const [topbarHeight, setTopbarHeight] = useState(64);
  const pythonLabs = useMemo(() => catalog
    .filter((mission) => mission.language === "python")
    .sort((left, right) => difficultyOrder[left.difficulty] - difficultyOrder[right.difficulty] || left.title.localeCompare(right.title)), [catalog]);
  const tsLabs = useMemo(() => catalog
    .filter((mission) => mission.language === "typescript" || mission.language === "javascript")
    .sort((left, right) => difficultyOrder[left.difficulty] - difficultyOrder[right.difficulty] || left.title.localeCompare(right.title)), [catalog]);
  const selectedIncidentId = searchParams.get("incident") ?? "";
  const missionHref = (incidentId: string) => `/?play=1&incident=${encodeURIComponent(incidentId)}`;
  const draftKey = (incidentId: string) => `pager-incident-draft-v1:${incidentId}`;

  useEffect(() => {
    void fetch("/api/incidents")
      .then((response) => response.json() as Promise<IncidentSummary[]>)
      .then(setCatalog);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("pager-workspace-verification-height");
    const parsed = saved ? Number(saved) : Number.NaN;
    if (Number.isFinite(parsed)) {
      setVerificationHeight(Math.min(verificationHeightLimits.max, Math.max(verificationHeightLimits.min, parsed)));
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("pager-workspace-pane-widths");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<typeof defaultPaneWidths>;
      if (typeof parsed.left === "number" && typeof parsed.right === "number") {
        setPaneWidths({
          left: Math.min(paneLimits.left.max, Math.max(paneLimits.left.min, parsed.left)),
          right: Math.min(paneLimits.right.max, Math.max(paneLimits.right.min, parsed.right)),
        });
      }
    } catch {
      window.localStorage.removeItem("pager-workspace-pane-widths");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pager-workspace-pane-widths", JSON.stringify(paneWidths));
  }, [paneWidths]);

  useEffect(() => {
    window.localStorage.setItem("pager-workspace-verification-height", String(verificationHeight));
  }, [verificationHeight]);

  useEffect(() => {
    const updateProgress = (event: Event) => setVerificationProgress((event as CustomEvent<string>).detail);
    window.addEventListener("pager:webcontainer-progress", updateProgress);
    return () => window.removeEventListener("pager:webcontainer-progress", updateProgress);
  }, []);

  useEffect(() => {
    const topbar = topbarRef.current;
    if (!topbar) return;
    const updateHeight = () => setTopbarHeight(Math.ceil(topbar.getBoundingClientRect().height));
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(topbar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = selectedIncidentId ? `?incident=${encodeURIComponent(selectedIncidentId)}` : "";
    void fetch(`/api/incident${query}`)
      .then((response) => response.json() as Promise<Incident>)
      .then((loadedIncident) => {
        runnerRuntimeRef.current = null;
        missionStartedAtRef.current = Date.now();
        setIncident(loadedIncident);
        let initialFiles = loadedIncident.files.map((file) => ({ ...file }));
        let initialActiveFile = loadedIncident.activeFile;
        try {
          const savedDraft = window.localStorage.getItem(draftKey(loadedIncident.id));
          if (savedDraft) {
            const draft = JSON.parse(savedDraft) as { files?: Incident["files"]; activeFile?: string };
            const hasMatchingFiles = Array.isArray(draft.files)
              && draft.files.length === loadedIncident.files.length
              && draft.files.every((file) => typeof file.path === "string" && typeof file.content === "string" && loadedIncident.files.some((starter) => starter.path === file.path));
            if (hasMatchingFiles && draft.files) initialFiles = draft.files;
            if (typeof draft.activeFile === "string" && initialFiles.some((file) => file.path === draft.activeFile)) initialActiveFile = draft.activeFile;
          }
        } catch {
          window.localStorage.removeItem(draftKey(loadedIncident.id));
        }
        filesRef.current = initialFiles;
        setFiles(initialFiles);
        setActiveFile(initialActiveFile);
        setFixes([]);
        setReveals({});
        setStakeholderMessages([]);
        setDecisions({});
        setActiveAppliedFixId("");
        setReviewingFixId("");
        setResult(undefined);
        setExecutionError("");
        setCompletionMessage("");
        setLeftTab("brief");
        setRightTab("channel");
        setAgentQuestion("");
        setAgentQuestions([]);
        setAgentQuestionError("");
        setAgentChatOpen(false);
        setIntelligencePaneMode("default");
        setGuideOpen(window.localStorage.getItem("pager-workspace-guide-v2-dismissed") !== "1");
        setVerificationOpen(true);
        setFocusMode(false);
      });
  }, [selectedIncidentId]);

  const source = files.find((file) => file.path === activeFile)?.content ?? "";
  const supportsAgents = Boolean(incident);
  const usesDynamicStakeholders = incident?.id === "checkout-2pm";
  const reviewedCount = Object.keys(decisions).length;
  const passedTestCount = result?.tests.filter((test) => test.passed).length ?? 0;
  const failedTestCount = result?.tests.length ? result.tests.length - passedTestCount : 0;
  const reviewingFix = fixes.find((fix) => fix.id === reviewingFixId);
  const reviewingTargetPath = reviewingFix?.targetFile ?? activeFile;
  const reviewingCurrentSource = files.find((file) => file.path === reviewingTargetPath)?.content ?? "";
  const effectiveRightPaneWidth = intelligencePaneMode === "minimized"
    ? 48
    : intelligencePaneMode === "maximized"
      ? paneLimits.right.max
      : paneWidths.right;
  const gamePhase = useMemo<AgentGamePhase>(() => {
    if (result && !result.passed) return "after-tests-fail";
    if (fixes.some((fix) => decisions[fix.id] === "applied" && reveals[fix.id]?.faultTag !== "verified" && reveals[fix.id] !== undefined)) return "after-wrong-fix";
    return reviewedCount > 0 ? "mid" : "start";
  }, [decisions, fixes, result, reveals, reviewedCount]);
  const channelMessages = incident
    ? usesDynamicStakeholders
      ? [...stakeholderMessages, ...incident.stakeholderMessages.filter((message) => message.role !== "pm" && message.role !== "senior")]
      : incident.stakeholderMessages
    : [];
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
      body: JSON.stringify({ files: incident.files, messages: incident.stakeholderMessages }),
      signal: controller.signal,
    }).then((response) => response.ok ? response.json() as Promise<LearnerFix[]> : Promise.reject())
      .then(setFixes)
      .catch(() => { if (!controller.signal.aborted) setFixes([]); });
    return () => controller.abort();
  }, [incident, supportsAgents]);

  useEffect(() => {
    if (!incident || !usesDynamicStakeholders) return;
    const controller = new AbortController();
    const elapsedSeconds = missionStartedAtRef.current ? Math.floor((Date.now() - missionStartedAtRef.current) / 1000) : 0;
    const roles: AgentStakeholderRole[] = ["pm", "senior"];
    void Promise.all(roles.map(async (role) => {
      const response = await fetch("/api/agents/stakeholder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: incident.files, messages: incident.stakeholderMessages, role, phase: gamePhase, elapsedSeconds }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Stakeholder response unavailable.");
      return response.json() as Promise<StakeholderMessage>;
    })).then(setStakeholderMessages)
      .catch(() => { if (!controller.signal.aborted) setStakeholderMessages(incident.stakeholderMessages.filter((message) => message.role !== "ai-pair")); });
    return () => controller.abort();
  }, [incident, gamePhase, usesDynamicStakeholders]);

  const saveDraft = (nextFiles: Incident["files"], nextActiveFile = activeFile) => {
    if (!incident) return;
    window.localStorage.setItem(draftKey(incident.id), JSON.stringify({ files: nextFiles, activeFile: nextActiveFile }));
  };
  const updateSource = (path: string, content: string) => {
    const nextFiles = filesRef.current.map((file) => file.path === path ? { ...file, content } : file);
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    saveDraft(nextFiles);
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
    if (decision === "applied" && activeAppliedFixId && activeAppliedFixId !== fix.id) return;
    setDecisions((current) => ({ ...current, [fix.id]: decision }));
    if (decision === "applied") {
      updateSource(fix.targetFile ?? activeFile, fix.patch);
      setActiveAppliedFixId(fix.id);
    }
    void requestReveal(fix, decision);
    setReviewingFixId("");
  };
  const restoreStarterCode = () => {
    if (!incident || running) return;
    const starterFiles = incident.files.map((file) => ({ ...file }));
    filesRef.current = starterFiles;
    setFiles(starterFiles);
    setActiveFile(incident.activeFile);
    setActiveAppliedFixId("");
    setResult(undefined);
    setExecutionError("");
    setCompletionMessage("");
    saveDraft(starterFiles, incident.activeFile);
  };
  const startProposalReview = (fix: LearnerFix) => {
    setActiveFile(fix.targetFile ?? activeFile);
    setReviewingFixId(fix.id);
  };
  const resetIncident = () => {
    if (!incident || running || askingAgent) return;
    runnerRuntimeRef.current = null;
    missionStartedAtRef.current = Date.now();
    const resetFiles = incident.files.map((file) => ({ ...file }));
    filesRef.current = resetFiles;
    setFiles(resetFiles);
    setActiveFile(incident.activeFile);
    window.localStorage.removeItem(draftKey(incident.id));
    setReveals({});
    setStakeholderMessages([]);
    setDecisions({});
    setActiveAppliedFixId("");
    setReviewingFixId("");
    setResult(undefined);
    setExecutionError("");
    setCompletionMessage("");
    setVerificationProgress("");
    setLeftTab("brief");
    setRightTab("channel");
    setAgentQuestion("");
    setAgentQuestions([]);
    setAgentQuestionError("");
    setAgentChatOpen(false);
    setVerificationOpen(true);
    setFocusMode(false);
  };
  const verify = async () => {
    const incidentForVerification = incident ? { ...incident, files: filesRef.current, activeFile } : undefined;
    if (!incidentForVerification || running) return;
    setExecutionError("");
    setCompletionMessage("");
    setVerificationProgress("");
    setRunning(true);
    setLeftTab("evidence");
    setVerificationOpen(true);
    try {
      const execution = await runTests(incidentForVerification, runnerRuntimeRef.current);
      runnerRuntimeRef.current = execution.runtime;
      setResult(execution.result);
      const rejectedFixes = fixes.filter((fix) => decisions[fix.id] === "rejected");
      const rejectedReveals = await Promise.all(rejectedFixes.map((fix) => reveals[fix.id] ?? requestReveal(fix, "rejected")));
      const allOptionsReviewed = fixes.length > 0 && fixes.every((fix) => decisions[fix.id] !== undefined);
      const rejectedIncorrectCount = rejectedReveals.filter((reveal) => reveal !== undefined && reveal.faultTag !== "verified").length;
      const caughtIncorrectAiFix = rejectedIncorrectCount >= Math.max(1, fixes.length - 1);
      const appliedFix = fixes.find((fix) => decisions[fix.id] === "applied");
      if (execution.result.passed && allOptionsReviewed && caughtIncorrectAiFix && appliedFix) {
        const credential = mintCredential({ incidentId: incidentForVerification.id, startedAt: "", selectedFixIds: Object.keys(decisions), caughtIncorrectAiFix, testResult: execution.result });
        saveCredentialSession({ credential, incidentTitle: incidentForVerification.title, briefing: incidentForVerification.briefing, caughtIncorrectAiFix, testResult: execution.result });
        router.push("/credential");
      } else if (execution.result.passed) {
        setCompletionMessage(`Tests passed. Complete the review trail: ${reviewedCount}/${fixes.length} options judged, including rejection of each unsafe repair.`);
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
        body: JSON.stringify({
          question,
          activeFile,
          source,
          context: {
            id: incident?.id ?? "",
            title: incident?.title ?? "",
            service: incident?.service ?? "",
            severity: incident?.severity ?? "",
            alert: incident?.alert ?? "",
            objective: incident?.briefing.objective ?? "",
            successCriterion: incident?.briefing.successCriterion ?? "",
            impact: incident?.telemetry.impact ?? "",
            services: incident?.telemetry.services ?? [],
            events: incident?.telemetry.events ?? [],
            messages: channelMessages.map(({ author, body, timestamp }) => ({ author, body, timestamp })),
            filePaths: files.map((file) => file.path),
            verification: result ? { summary: result.summary, tests: result.tests } : undefined,
          },
        }),
      });
      const payload = await response.json() as { answer?: string; error?: string };
      const answer = payload.answer;
      if (!response.ok || !answer) {
        setAgentQuestionError(payload.error ?? "Coach could not answer right now.");
        return;
      }
      setAgentQuestions((current) => [...current, { question, answer }]);
      setAgentQuestion("");
    } catch {
      setAgentQuestionError("Coach could not answer right now. Keep investigating and try again.");
    } finally {
      setAskingAgent(false);
    }
  };
  const closeGuide = () => {
    window.localStorage.setItem("pager-workspace-guide-v2-dismissed", "1");
    setGuideOpen(false);
  };
  const skipGuide = () => {
    closeGuide();
  };
  const highlightGuideArea = (area: GuideArea) => {
    if (area === "brief") setLeftTab("brief");
    if (area === "signals") setLeftTab("signals");
    if (area === "files") setLeftTab("files");
    if (area === "evidence") setLeftTab("evidence");
    if (area === "chat") setRightTab("channel");
    if (area === "coach") setRightTab("pair");
    if (area === "verify") setVerificationOpen(true);
  };
  const navigateGuide = (area: GuideArea) => {
    highlightGuideArea(area);
    closeGuide();
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`guide-${area}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus();
    });
  };
  const updatePaneWidth = (pane: ResizablePane, proposedWidth: number) => {
    const limits = paneLimits[pane];
    const clampedWidth = Math.min(limits.max, Math.max(limits.min, proposedWidth));
    setPaneWidths((current) => ({ ...current, [pane]: clampedWidth }));
  };
  const beginPaneResize = (pane: ResizablePane, event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const initialWidth = paneWidths[pane];
    const initialX = event.clientX;
    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      const delta = moveEvent.clientX - initialX;
      updatePaneWidth(pane, initialWidth + (pane === "left" ? delta : -delta));
    };
    const stopResize = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      document.body.classList.remove("workspace-resizing");
    };
    document.body.classList.add("workspace-resizing");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize, { once: true });
  };
  const resizePaneWithKeyboard = (pane: ResizablePane, event: KeyboardEvent<HTMLDivElement>) => {
    const direction = pane === "left" ? 1 : -1;
    if (event.key === "ArrowRight") { event.preventDefault(); updatePaneWidth(pane, paneWidths[pane] + 16 * direction); }
    if (event.key === "ArrowLeft") { event.preventDefault(); updatePaneWidth(pane, paneWidths[pane] - 16 * direction); }
    if (event.key === "Home") { event.preventDefault(); updatePaneWidth(pane, paneLimits[pane].min); }
    if (event.key === "End") { event.preventDefault(); updatePaneWidth(pane, paneLimits[pane].max); }
  };
  const updateVerificationHeight = (proposedHeight: number) => {
    setVerificationHeight(Math.min(verificationHeightLimits.max, Math.max(verificationHeightLimits.min, proposedHeight)));
  };
  const beginVerificationResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const initialHeight = verificationHeight;
    const initialY = event.clientY;
    const onPointerMove = (moveEvent: globalThis.PointerEvent) => updateVerificationHeight(initialHeight - (moveEvent.clientY - initialY));
    const stopResize = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      document.body.classList.remove("workspace-row-resizing");
    };
    document.body.classList.add("workspace-row-resizing");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize, { once: true });
  };
  const resizeVerificationWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowUp") { event.preventDefault(); updateVerificationHeight(verificationHeight + 16); }
    if (event.key === "ArrowDown") { event.preventDefault(); updateVerificationHeight(verificationHeight - 16); }
    if (event.key === "Home") { event.preventDefault(); updateVerificationHeight(verificationHeightLimits.min); }
    if (event.key === "End") { event.preventDefault(); updateVerificationHeight(verificationHeightLimits.max); }
  };

  if (!incident) return <main className="shell"><p>Loading incident artifact...</p></main>;

  const openFile = (path: string) => {
    setActiveFile(path);
    saveDraft(filesRef.current, path);
    setLeftTab("files");
  };

  return (
    <main className="shell workspace-shell">
      <a className="skip-link" href="#workspace-main">Skip to incident workspace</a>
      <header ref={topbarRef} className="workspace-topbar">
        <Link className="brand" href="/">PAGER</Link>
        <span className="workspace-environment">production</span>
        <label className="workspace-mission-select">
          <span className="sr-only">Choose incident</span>
          <select value={incident.id} onChange={(event) => router.push(missionHref(event.target.value))}>
            <optgroup label="Python labs">{pythonLabs.map((mission) => <option key={mission.id} value={mission.id}>{mission.title} - {mission.difficulty} - {mission.availability}</option>)}</optgroup>
            <optgroup label="TypeScript and JavaScript labs">{tsLabs.map((mission) => <option key={mission.id} value={mission.id}>{mission.title} - {mission.difficulty} - {mission.availability}</option>)}</optgroup>
          </select>
        </label>
        <nav className="workspace-labs" aria-label="Available labs">
          <Link className={incident.execution.language === "python" ? "active" : ""} href="/?play=1&incident=python-invoice-queue">Python</Link>
          <Link className={incident.execution.language === "typescript" ? "active" : ""} href="/?play=1&incident=checkout-2pm">TS / JS</Link>
        </nav>
        <span className="workspace-lab-count">{pythonLabs.length} Python / {tsLabs.length} TS/JS labs</span><span className="workspace-save-status">Edits saved on this device</span>
        <div className="workspace-topbar-actions">
          <InfoTip label="About this simulator">Pager pairs an incident coach with real code and deterministic tests. Use AI Pair to investigate; use the acceptance suite to validate a repair.</InfoTip>
          <button className="workspace-guide-trigger workspace-focus-trigger" onClick={() => setFocusMode((current) => !current)} aria-pressed={focusMode} title="Hide or restore the context rails">{focusMode ? "Exit focus" : "Focus code"}</button>
          <button className="workspace-guide-trigger" onClick={() => setGuideOpen(true)}>Guided practice</button>{intelligencePaneMode === "minimized" && <button className="workspace-guide-trigger workspace-intelligence-restore" type="button" onClick={() => setIntelligencePaneMode("default")} aria-label="Restore incident intelligence panel" title="Restore the hidden Incident Intelligence panel"><span aria-hidden="true">↗</span>Open intelligence</button>}
          <ThemeToggle />
          <IncidentClock timeLimitSeconds={incident.timeLimitSeconds} />
        </div>
      </header>

      <section className={result?.passed ? "workspace-alert resolved" : "workspace-alert"} style={{ "--workspace-topbar-height": `${topbarHeight}px` } as CSSProperties} aria-live="polite">
        <strong>{result?.passed ? "RESOLVED" : `${incident.severity} - INCIDENT`}</strong>
        <span>{result?.passed ? "The incident has cleared. Verification evidence is available in the left rail." : incident.alert}</span>
      </section>

      <div id="workspace-main" className={`workspace-frame workspace-intelligence-${intelligencePaneMode}${focusMode ? " workspace-focus-mode" : ""}`} style={{ "--workspace-left-width": `${paneWidths.left}px`, "--workspace-right-width": `${effectiveRightPaneWidth}px` } as CSSProperties}>
        <aside className="workspace-rail" aria-label="Incident context">
          <div className="workspace-rail-header">
            <span>MISSION CONTROL <InfoTip label="About mission control" className="workspace-inline-tip">Use Brief for the objective, Signals for operational context, Files to navigate the artifact, and Evidence for a concise suite summary.</InfoTip></span>
            <span>{reviewedCount}/{fixes.length || 3} reviewed</span>
          </div>
          <nav className="workspace-tabs workspace-context-tabs" aria-label="Context panel">
            <button className={leftTab === "brief" ? "active" : ""} onClick={() => setLeftTab("brief")}>Brief</button>
            <button className={leftTab === "signals" ? "active" : ""} onClick={() => setLeftTab("signals")}>Signals</button>
            <button className={leftTab === "files" ? "active" : ""} onClick={() => setLeftTab("files")}>Files <span>{files.length}</span></button>
            <button className={leftTab === "evidence" ? "active" : ""} onClick={() => setLeftTab("evidence")}>Evidence</button>
          </nav>
          <div className="workspace-rail-content">
            {leftTab === "brief" && <section id="guide-brief" tabIndex={-1}>
              <span className="workspace-eyebrow">INCIDENT / {incident.title}</span>
              <h1>{incident.title}</h1>
              <p className="workspace-objective">{incident.briefing.objective}</p>
              <div className="workspace-mission-meta" aria-label="Incident details">
                <span>{incident.severity}</span><span>{incident.difficulty}</span><span>{incident.service}</span><span>{Math.ceil(incident.timeLimitSeconds / 60)} min</span>{incident.faultClass && <span className="fault-class" title="The class of bug this incident trains you to catch">{FAULT_CLASS_LABELS[incident.faultClass] ?? incident.faultClass}</span>}
              </div>
              <div className="workspace-criterion"><span>SUCCESS CONDITION</span><p>{incident.briefing.successCriterion}</p></div>
              <button className="workspace-practice-button" onClick={() => setGuideOpen(true)}>Start guided practice <span aria-hidden="true">&rarr;</span></button>
              <details className="workspace-brief-details">
                <summary>View investigation plan and starter files</summary>
                <div className="workspace-next-step"><span>START WITH</span><p>Read the incident chat, inspect the source and matching tests, then judge every repair option. Only one repair can enter the workspace at a time.</p></div>
                <ol className="workspace-checklist">
                  <li className={reviewedCount > 0 ? "complete" : "current"}><span>01</span><div><strong>Investigate with the coach</strong><p>Trace the code path and the invariant.</p></div></li>
                  <li className={reviewedCount > 0 ? "current" : ""}><span>02</span><div><strong>Make the call</strong><p>Apply or reject before execution.</p></div></li>
                  <li className={result?.passed ? "complete" : result ? "current" : ""}><span>03</span><div><strong>Prove it by execution</strong><p>{result ? result.summary : "Run the acceptance suite."}</p></div></li>
                </ol>
                <div className="workspace-first-files"><span>START HERE</span>{files.slice(0, 3).map((file) => <button key={file.path} onClick={() => openFile(file.path)}>{file.path}</button>)}</div>
              </details>
              <p className="workspace-practice-note">New here? Start the guide for a focused walkthrough, or open the plan when you want the detailed sequence.</p>
            </section>}
            {leftTab === "signals" && <section id="guide-signals" className="workspace-signals" aria-label="Incident signals" tabIndex={-1}><span className="workspace-eyebrow">LIVE INCIDENT SIGNALS</span><h2>Operational context</h2><p className="workspace-impact">{incident.telemetry.impact}</p><div className="workspace-service-list"><span>SERVICE HEALTH</span>{incident.telemetry.services.map((service) => <div key={service.name}><i className={service.status} /><strong>{service.name}</strong><em>{service.status}</em></div>)}</div><ol className="workspace-timeline">{incident.telemetry.events.map((event) => <li key={`${event.timestamp}-${event.source}`}><time>{event.timestamp}</time><div><strong>{event.source}</strong><p>{event.message}</p></div></li>)}</ol></section>}
            {leftTab === "files" && <div id="guide-files" className="workspace-tree" tabIndex={-1}>{Object.entries(fileGroups).map(([directory, group]) => <details key={directory} open><summary>{directory}</summary>{group.map((file) => <button key={file.path} className={file.path === activeFile ? "selected" : ""} onClick={() => openFile(file.path)}>{file.path.split("/").at(-1)}</button>)}</details>)}</div>}
            {leftTab === "evidence" && <div id="guide-evidence" className="workspace-evidence" tabIndex={-1}>
              <span className="workspace-eyebrow">EXECUTION EVIDENCE</span>
              {!result && <><h2>Nothing has run yet.</h2><p>Your decision is not graded by an AI. Run the real acceptance suite when you are ready to test the code.</p></>}
              {result && <><h2 className={result.passed ? "pass" : "fail"}>{result.passed ? "Suite passed" : "Suite found a failure"}</h2><p>{result.summary}</p><div className="workspace-evidence-summary"><strong>{passedTestCount}/{result.tests.length} acceptance checks passed</strong>{failedTestCount > 0 && <strong className="fail">{failedTestCount} failed</strong>}</div><button className="workspace-evidence-button" onClick={() => { setVerificationOpen(true); requestAnimationFrame(() => document.getElementById("verification-drawer")?.scrollIntoView({ behavior: "smooth", block: "nearest" })); }}>Open detailed test output</button><small className="workspace-evidence-note">Detailed failures live in the verification panel so you only inspect them once.</small></>}
              {executionError && <p className="workspace-error" role="alert">{executionError}</p>}
            </div>}
          </div>
        </aside>

        <div className="workspace-resizer" role="separator" aria-label="Resize mission control panel" aria-orientation="vertical" aria-controls="guide-brief" aria-valuemin={paneLimits.left.min} aria-valuemax={paneLimits.left.max} aria-valuenow={paneWidths.left} tabIndex={0} onPointerDown={(event) => beginPaneResize("left", event)} onKeyDown={(event) => resizePaneWithKeyboard("left", event)} />

        <section id="guide-editor" className="workspace-editor" aria-label="Source editor" tabIndex={-1}>
          <div className="workspace-editor-tabs"><button className="active"><span className="tab-dot" />{activeFile}</button><span>{incident.execution.language}</span></div>
          <label className="workspace-file-picker"><span>Open file <InfoTip label="About source files" className="workspace-inline-tip">Choose a file to inspect or edit. Changes stay in this incident workspace until you run verification.</InfoTip></span><select value={activeFile} onChange={(event) => openFile(event.target.value)}>{files.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}</select></label>
          <div className="workspace-editor-surface"><CodeEditor language={incident.execution.language} path={activeFile} value={source} onChange={(content) => updateSource(activeFile, content)} /></div>
          <section id="guide-verify" className="workspace-runner" aria-label="Verification controls" tabIndex={-1}>
            <div><span className="workspace-eyebrow">VERIFICATION <InfoTip label="About verification" className="workspace-inline-tip">Runs the language-specific acceptance suite. Its reported pass or fail result is the only completion authority.</InfoTip></span><p>{running ? verificationProgress || "Running the real acceptance suite..." : result ? result.summary : "Changes are local to this incident. The suite decides what ships."}</p></div>
            <div className="workspace-run-actions"><button className="workspace-reset-button" onClick={restoreStarterCode} disabled={running} title="Restore starter code and keep your review trail">Restore code</button><button className="workspace-reset-button" onClick={resetIncident} disabled={running || askingAgent} title="Restore starter code and clear decisions, results, and Coach chat">Reset incident</button>{result && <button className="workspace-results-toggle" onClick={() => setVerificationOpen((current) => !current)} aria-expanded={verificationOpen} aria-controls="verification-drawer">{verificationOpen ? "Hide results" : "View results"}</button>}<button className="workspace-run-button" onClick={() => void verify()} disabled={running}>{running ? "Running tests..." : "Run verification"}</button></div>
          </section>
          {verificationOpen && <><div className="workspace-verification-resizer" role="separator" aria-label="Resize verification panel" aria-orientation="horizontal" aria-controls="verification-drawer" aria-valuemin={verificationHeightLimits.min} aria-valuemax={verificationHeightLimits.max} aria-valuenow={verificationHeight} tabIndex={0} onPointerDown={beginVerificationResize} onKeyDown={resizeVerificationWithKeyboard}><span>Drag to resize</span></div><section id="verification-drawer" className="workspace-verification-drawer" aria-label="Verification results" style={{ "--verification-height": `${verificationHeight}px` } as CSSProperties}><div className="workspace-verification-heading"><span>TEST RESULTS</span>{result && <span className="workspace-suite-badge">{result.tests.length} acceptance {result.tests.length === 1 ? "check" : "checks"}</span>}{result && <strong className={result.passed ? "pass" : "fail"}>{result.passed ? "PASSING" : "FAILING"}</strong>}</div>{!result && <p>No verification has run yet. Change code or review a repair option, then run the real acceptance suite.</p>}{result && <div className="workspace-verification-list">{result.tests.map((test) => <article key={test.name}><strong className={test.passed ? "pass" : "fail"}>{test.passed ? "PASS" : "FAIL"}</strong><div><span>{test.name}</span><small>{test.detail}</small></div></article>)}</div>}{executionError && <p className="workspace-error" role="alert">{executionError}</p>}</section></>}
          {completionMessage && <p className="workspace-completion" role="status">{completionMessage}</p>}
        </section>

        <div className="workspace-resizer workspace-console-resizer" role="separator" aria-label="Resize incident intelligence panel" aria-orientation="vertical" aria-controls="guide-coach" aria-valuemin={paneLimits.right.min} aria-valuemax={paneLimits.right.max} aria-valuenow={effectiveRightPaneWidth} tabIndex={intelligencePaneMode === "minimized" ? -1 : 0} onPointerDown={(event) => { if (intelligencePaneMode === "default") beginPaneResize("right", event); }} onKeyDown={(event) => { if (intelligencePaneMode === "default") resizePaneWithKeyboard("right", event); }} />

        <aside id="guide-coach" className="workspace-console" aria-label="Incident intelligence" tabIndex={-1}>
          <div className="workspace-console-header">
            <div className="workspace-console-title"><span>INCIDENT INTELLIGENCE</span><strong>{supportsAgents ? "Repair options and Coach" : "Python lab guide"}</strong></div>
            <div className="workspace-console-actions">
              {intelligencePaneMode !== "minimized" && <InfoTip label="How Pager evaluates you" className="workspace-intelligence-tip">Repair options are authored code changes to inspect and judge. Coach answers questions. The deterministic acceptance suite alone validates repairs.</InfoTip>}
              {intelligencePaneMode !== "minimized" && <button className="workspace-console-control" type="button" onClick={() => setIntelligencePaneMode((current) => current === "maximized" ? "default" : "maximized")} aria-label={intelligencePaneMode === "maximized" ? "Restore incident intelligence width" : "Maximize incident intelligence width"} title={intelligencePaneMode === "maximized" ? "Restore width" : "Maximize width"}>{intelligencePaneMode === "maximized" ? "Restore" : "Maximize"}</button>}
              <button className="workspace-console-control" type="button" onClick={() => setIntelligencePaneMode((current) => current === "minimized" ? "default" : "minimized")} aria-label={intelligencePaneMode === "minimized" ? "Restore incident intelligence panel" : "Minimize incident intelligence panel"} title={intelligencePaneMode === "minimized" ? "Restore panel" : "Minimize panel"}>{intelligencePaneMode === "minimized" ? "Open" : "Minimize"}</button>
            </div>
          </div>
          {supportsAgents ? <>
            <nav className="workspace-tabs console-tabs" aria-label="Intelligence panel"><button className={rightTab === "channel" ? "active" : ""} onClick={() => setRightTab("channel")}>Incident chat <span>{channelMessages.length}</span></button><button className={rightTab === "pair" ? "active" : ""} onClick={() => setRightTab("pair")}>Repair options <span>{fixes.length}</span></button></nav>
            {rightTab === "channel" && <div id="guide-chat" className="workspace-channel" tabIndex={-1}><p className="workspace-intelligence-intro">Read the incident conversation first. It explains the impact, the constraint, and the question your code must answer.</p>{channelMessages.map((message) => <article key={message.id} className="workspace-message"><div><strong>{message.author}</strong><span className={`workspace-role workspace-role-${message.role}`}>{message.role.replace("ai-pair", "AI Pair")}</span><time>{message.timestamp}</time></div><p>{message.body}</p></article>)}</div>}
            {rightTab === "pair" && <div className="workspace-pair"><p className="workspace-agent-boundary">These repair options come from the AI Pair, the fallible AI teammate you must judge (GPT-5.6 in live mode). They are fixed candidates for review, so grading never depends on a live model. Review each diff against the incident invariant. You may reject several options, but only one repair can enter the workspace; the acceptance suite is the final proof.</p><p className="workspace-review-progress">Review trail: <strong>{reviewedCount}/{fixes.length || 3}</strong> options judged{activeAppliedFixId && ". One repair is currently in the workspace."}</p>{fixes.map((fix, index) => { const decision = decisions[fix.id]; const reveal = reveals[fix.id]; return <article key={fix.id} className={`workspace-recommendation ${decision ? "decided" : ""}`}><span>REPAIR OPTION 0{index + 1}</span><p className="workspace-repair-source">Proposed by AI Pair &middot; GPT-5.6</p><h2>{fix.title}</h2><p>{fix.rationale}</p>{decision && reveal && <p className="workspace-reveal"><b>{decision === "rejected" ? "Rejected." : "Applied."}</b> {reveal.teaching}</p>}{!decision && <button className="workspace-review-button" onClick={() => startProposalReview(fix)} aria-haspopup="dialog">Review code change</button>}</article>; })}<section className="workspace-agent-ask"><div><span className="workspace-eyebrow">LIVE COACH</span><strong>Ask about the investigation</strong></div>{agentQuestions.map((item, index) => <article key={`${item.question}-${index}`} className="workspace-agent-answer"><p><b>You:</b> {item.question}</p><p><b>Coach:</b> {item.answer}</p></article>)}<label className="sr-only" htmlFor="agent-question">Ask the incident coach</label><textarea id="agent-question" value={agentQuestion} onChange={(event) => setAgentQuestion(event.target.value)} placeholder="Ask what to inspect, which invariant matters, or how to read the failure..." maxLength={700} rows={3} /><button onClick={() => void askAgent()} disabled={askingAgent || !agentQuestion.trim()}>{askingAgent ? "Thinking..." : "Ask Coach"}</button>{agentQuestionError && <p className="workspace-agent-error" role="alert">{agentQuestionError}</p>}<small>Coach receives this incident&apos;s training context for investigation support only. It cannot choose a repair. Do not paste credentials or customer data.</small></section></div>}
          </> : <div className="workspace-python-guide"><span className="workspace-eyebrow">REAL PYTHON EXECUTION</span><h2>Prevent duplicate queue entries.</h2><p>Inspect `enqueue`, add the smallest guard that preserves queue order, then run the unittest suite. This lab is execution-ready; AI Pair decisions and credentialing remain TypeScript-mission only.</p><div><strong>Success condition</strong><p>Repeated enqueue attempts leave each invoice ID exactly once in the pending queue.</p></div></div>}
        </aside>
      </div>
      {reviewingFix && <section className="workspace-proposal-review" role="dialog" aria-modal="true" aria-labelledby="proposal-review-title">
        <div className="workspace-proposal-review-panel">
          <header><div><span className="workspace-eyebrow">CODE REVIEW</span><h2 id="proposal-review-title">{reviewingFix.title}</h2><p>Compare the exact replacement before making a decision. Verification remains the final authority.</p></div><button type="button" onClick={() => setReviewingFixId("")} aria-label="Close code review">Close</button></header>
          <div className="workspace-proposal-file">{reviewingTargetPath}</div>
          <div className="workspace-proposal-columns">
            <article><h3>Current code</h3><pre>{reviewingCurrentSource.split("\n").map((line, index) => <code key={`${index}-${line}`}><span>{index + 1}</span>{line || " "}</code>)}</pre></article>
            <article><h3>Proposed code</h3><pre>{reviewingFix.patch.split("\n").map((line, index) => <code key={`${index}-${line}`}><span>{index + 1}</span>{line || " "}</code>)}</pre></article>
          </div>
          <footer><p>Choose based on the code and incident invariant-not the proposal wording. Applying a repair is exclusive; restore starter code before trying another one.</p><div className="workspace-decision-actions" role="group" aria-label={`Decision for ${reviewingFix.title}`}><button onClick={() => recordDecision(reviewingFix, "rejected")}>Reject proposal</button><button onClick={() => recordDecision(reviewingFix, "applied")} disabled={Boolean(activeAppliedFixId && activeAppliedFixId !== reviewingFix.id)}>{activeAppliedFixId && activeAppliedFixId !== reviewingFix.id ? "Another repair is active" : "Apply to workspace"}</button></div></footer>
        </div>
      </section>}
      {supportsAgents && <><button className="workspace-agent-dock" onClick={() => setAgentChatOpen(true)} aria-expanded={agentChatOpen} aria-controls="agent-chat">Live help</button>{agentChatOpen && <aside id="agent-chat" className="workspace-agent-chat" role="dialog" aria-modal="false" aria-label="Incident coach"><header><div><span className="workspace-eyebrow">LIVE COACH</span><strong>Ask about the investigation</strong></div><button className="workspace-agent-chat-close" onClick={() => setAgentChatOpen(false)} aria-label="Close incident coach">&times;</button></header><p className="workspace-agent-chat-intro">Coach sees this incident&apos;s brief, signals, stakeholder thread, file map, active code, and latest test evidence. It guides investigation but cannot choose a repair. Only the suite decides what passes.</p><div className="workspace-agent-chat-history" aria-live="polite">{agentQuestions.length === 0 && <p className="workspace-agent-empty">No questions yet. Start with the failing invariant.</p>}{agentQuestions.map((item, index) => <article key={`${item.question}-${index}`} className="workspace-agent-answer"><p><b>You:</b> {item.question}</p><p><b>Coach:</b> {item.answer}</p></article>)}</div><form onSubmit={(event) => { event.preventDefault(); void askAgent(); }}><label className="sr-only" htmlFor="agent-question-chat">Ask the incident coach</label><textarea id="agent-question-chat" value={agentQuestion} onChange={(event) => setAgentQuestion(event.target.value)} placeholder="Ask what to inspect or how to read the failure..." maxLength={700} rows={3} /><div><small>Do not paste credentials or customer data.</small><button type="submit" disabled={askingAgent || !agentQuestion.trim()}>{askingAgent ? "Thinking..." : "Ask Coach"}</button></div>{agentQuestionError && <p className="workspace-agent-error" role="alert">{agentQuestionError}</p>}</form></aside>}</>}
      <WorkspaceGuide open={guideOpen} onClose={closeGuide} onSkip={skipGuide} onHighlight={highlightGuideArea} onNavigate={navigateGuide} />
    </main>
  );
}
