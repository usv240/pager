"use client";

import { useEffect, useState } from "react";

type WorkspaceGuideProps = {
  open: boolean;
  onClose: () => void;
};

const steps = [
  {
    label: "01 / Orient",
    title: "You are in a live incident.",
    body: "The red alert tells you what production symptom is active. Your job is not to trust the first plausible explanation—it is to prove the repair holds.",
    area: "Mission control → incident alert",
  },
  {
    label: "02 / Investigate",
    title: "Start with the brief, then trace the code.",
    body: "Use Brief for the objective and success condition. Open Files to inspect the unfamiliar project. The active file always appears in the center editor.",
    area: "Left rail → Brief and Files",
  },
  {
    label: "03 / Judge",
    title: "AI guidance is a hypothesis, not a verdict.",
    body: "Read the Incident chat for context. In AI Pair, review each proposal and apply or reject it before you run the suite. You can also ask the live AI Pair for investigative guidance.",
    area: "Right console → Incident chat and AI Pair",
  },
  {
    label: "04 / Prove",
    title: "Execution decides what ships.",
    body: "Edit the code in the center, then run verification. Evidence records the actual suite result. A credential requires a passing suite and a correctly rejected flawed recommendation.",
    area: "Center editor → Run verification",
  },
];

export function WorkspaceGuide({ open, onClose }: WorkspaceGuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const isLastStep = stepIndex === steps.length - 1;
  return (
    <div className="workspace-guide-backdrop" role="presentation">
      <section className="workspace-guide" role="dialog" aria-modal="true" aria-labelledby="workspace-guide-title">
        <div className="workspace-guide-header"><span>{step.label}</span><button onClick={onClose} aria-label="Close guide">×</button></div>
        <div className="workspace-guide-content"><span className="workspace-guide-area">{step.area}</span><h2 id="workspace-guide-title">{step.title}</h2><p>{step.body}</p></div>
        <div className="workspace-guide-progress" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>{steps.map((item, index) => <span key={item.label} className={index <= stepIndex ? "active" : ""} />)}</div>
        <footer className="workspace-guide-actions"><button className="workspace-guide-skip" onClick={onClose}>Skip tutorial</button><div>{stepIndex > 0 && <button className="workspace-guide-back" onClick={() => setStepIndex((current) => current - 1)}>Back</button>}<button className="workspace-guide-next" onClick={() => isLastStep ? onClose() : setStepIndex((current) => current + 1)}>{isLastStep ? "Start investigating" : "Next"}</button></div></footer>
      </section>
    </div>
  );
}
