"use client";

import { useEffect, useRef, useState } from "react";

export type GuideArea = "brief" | "signals" | "files" | "editor" | "chat" | "coach" | "verify" | "evidence";

type WorkspaceGuideProps = { open: boolean; onClose: () => void; onSkip: () => void; onHighlight: (area: GuideArea) => void; onNavigate: (area: GuideArea) => void; };
type Spotlight = { top: number; left: number; width: number; height: number };

const steps = [
  { label: "01 / Map", title: "Welcome to your incident IDE.", body: "Left is mission context and files. The center is the editable codebase. Right is incident collaboration and AI Pair. Follow the tour to see how each area supports one debugging workflow.", area: "Three panes → context, code, and collaboration", target: "brief" as const, action: "Open the brief", spotlight: false },
  { label: "02 / Brief", title: "Brief defines the job to be done.", body: "Read the production symptom, the success condition, and the required invariant before editing. This is the contract the acceptance suite will later prove.", area: "Left rail → Brief", target: "brief" as const, action: "Show Brief", spotlight: true },
  { label: "03 / Signals", title: "Signals show production context.", body: "Service health and the event timeline tell you what is affected and what has already been observed. Use them to choose where to investigate next.", area: "Left rail → Signals", target: "signals" as const, action: "Show Signals", spotlight: true },
  { label: "04 / Files", title: "Files is your project explorer.", body: "Browse the real incident repository here. Open the source file named in the brief, then inspect the matching tests to understand expected behavior.", area: "Left rail → Files", target: "files" as const, action: "Browse Files", spotlight: true },
  { label: "05 / Editor", title: "The center pane is the working codebase.", body: "Read and edit the active source file here. Changes remain local to this mission until you run verification, so make the smallest repair tied to the invariant.", area: "Center pane → Editor", target: "editor" as const, action: "Focus Editor", spotlight: true },
  { label: "06 / Chat", title: "Incident chat is operational context.", body: "PM and engineering messages recreate the pressure and clues of a real response. They tell you what matters operationally; they do not replace code evidence.", area: "Right pane → Incident chat", target: "chat" as const, action: "Open Incident chat", spotlight: true },
  { label: "07 / AI Pair", title: "AI Pair is your incident coach.", body: "Ask about the active code, the invariant, or a failed check. Repair options are drafts to inspect; tests—not AI—validate the behavior you ship.", area: "Right pane → AI Pair", target: "coach" as const, action: "Open AI Pair", spotlight: true },
  { label: "08 / Verify", title: "Verification runs the real suite.", body: "When your repair is ready, run the language-specific acceptance suite. Pager reports actual pass and fail results from the runner.", area: "Center pane → Run verification", target: "verify" as const, action: "Go to verification", spotlight: true },
  { label: "09 / Evidence", title: "Evidence explains the outcome.", body: "After a run, inspect every reported check here. A failure tells you what is still missing; a pass is the evidence needed to resolve the incident.", area: "Left rail → Evidence", target: "evidence" as const, action: "Show Evidence", spotlight: true },
];

export function WorkspaceGuide({ open, onClose, onSkip, onHighlight, onNavigate }: WorkspaceGuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight>();
  const dialogRef = useRef<HTMLElement>(null);
  const step = steps[stepIndex];

  useEffect(() => { if (open) setStepIndex(0); }, [open]);

  useEffect(() => {
    if (!open) return;
    onHighlight(step.target);
    if (!step.spotlight) { setSpotlight(undefined); return; }
    const measure = () => {
      const target = document.getElementById(`guide-${step.target}`);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setSpotlight({ top: Math.max(8, rect.top - 6), left: Math.max(8, rect.left - 6), width: rect.width + 12, height: rect.height + 12 });
    };
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.getElementById(`guide-${step.target}`)?.scrollIntoView({ block: "center", behavior: "auto" });
      window.requestAnimationFrame(measure);
    }));
    window.addEventListener("resize", measure);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", measure); };
  }, [onHighlight, open, step]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    focusable()[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", trapFocus);
    return () => { window.removeEventListener("keydown", trapFocus); previouslyFocused?.focus(); };
  }, [onClose, open]);

  if (!open) return null;
  const isLastStep = stepIndex === steps.length - 1;
  const spotlightStyle = spotlight ? { top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height } : undefined;
  return <div className="workspace-guide-backdrop" role="presentation">{spotlight && <div className="workspace-guide-spotlight" style={spotlightStyle} />}<section ref={dialogRef} className="workspace-guide" role="dialog" aria-modal="true" aria-labelledby="workspace-guide-title" tabIndex={-1}><div className="workspace-guide-header"><span>{step.label}</span><button onClick={onClose} aria-label="Close guide">×</button></div><div className="workspace-guide-content"><span className="workspace-guide-area">{step.area}</span><h2 id="workspace-guide-title">{step.title}</h2><p>{step.body}</p></div><div className="workspace-guide-progress" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>{steps.map((item, index) => <span key={item.label} className={index <= stepIndex ? "active" : ""} />)}</div><footer className="workspace-guide-actions"><button className="workspace-guide-skip" onClick={onSkip}>Skip tutorial</button><div>{stepIndex > 0 && <button className="workspace-guide-back" onClick={() => setStepIndex((current) => current - 1)}>Back</button>}<button className="workspace-guide-jump" onClick={() => onNavigate(step.target)}>{step.action}</button><button className="workspace-guide-next" onClick={() => isLastStep ? onClose() : setStepIndex((current) => current + 1)}>{isLastStep ? "Finish guide" : "Next"}</button></div></footer></section></div>;
}
