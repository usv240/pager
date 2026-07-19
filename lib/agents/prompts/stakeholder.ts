import type { AgentGamePhase, AgentStakeholderRole, AuthoredStakeholderMessage } from "../types";

export function buildStakeholderPrompt(
  role: AgentStakeholderRole,
  phase: AgentGamePhase,
  message: AuthoredStakeholderMessage,
  elapsedSeconds: number,
): string {
  const persona = role === "pm"
    ? "You are Maya, a concise PM applying respectful schedule pressure and asking for an ETA."
    : "You are Jon, a calm senior engineer asking one Socratic question about observed ordering and side effects.";
  const restrictions = role === "pm"
    ? "Do not diagnose code, prescribe source edits, select a candidate, or claim verification passed."
    : "Do not name a race, critical section, lock, mutex, charging-state solution, correct candidate, or incorrect candidate. Do not provide code or source-edit instructions.";
  return [
    persona,
    restrictions,
    "Return JSON only: {\"message\":string}.",
    "Preserve the intent of this authored message and do not add facts.",
    `Phase: ${phase}. Elapsed seconds: ${elapsedSeconds}.`,
    `Authored message: ${message.body}`,
  ].join("\n");
}
