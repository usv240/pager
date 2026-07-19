import type { IncidentAvailability, IncidentBriefing, IncidentExecution, IncidentLanguage, IncidentRunner } from "@/lib/types";

export interface IncidentManifest {
  title: string;
  service: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  alert: string;
  timeLimitSeconds: number;
  availability: IncidentAvailability;
  briefing: IncidentBriefing;
  serviceDirectory: string;
  activeFile: string;
  execution: IncidentExecution;
}

const languages = new Set<IncidentLanguage>(["typescript", "javascript", "python", "java", "cpp"]);
const runners = new Set<IncidentRunner>(["webcontainer-node", "pyodide", "sandbox-java", "sandbox-cpp"]);
const availability = new Set<IncidentAvailability>(["complete", "experimental"]);

export function parseManifest(value: unknown): IncidentManifest {
  if (!value || typeof value !== "object") throw new Error("Incident manifest must be an object.");
  const manifest = value as Partial<IncidentManifest>;
  if (!manifest.title || !manifest.service || !manifest.severity || !manifest.alert || !manifest.timeLimitSeconds || !manifest.availability || !manifest.briefing || !manifest.serviceDirectory || !manifest.activeFile || !manifest.execution) throw new Error("Incident manifest is missing required fields.");
  const { execution } = manifest;
  if (!languages.has(execution.language) || !runners.has(execution.runner) || !Array.isArray(execution.testCommand)) throw new Error("Incident manifest has an invalid execution configuration.");
  if (!Number.isInteger(manifest.timeLimitSeconds) || manifest.timeLimitSeconds < 1) throw new Error("Incident manifest has an invalid time limit.");
  if (!availability.has(manifest.availability)) throw new Error("Incident manifest has an invalid availability.");
  if (!manifest.briefing.objective || !manifest.briefing.successCriterion || !manifest.briefing.rootCause || !manifest.briefing.evidence) throw new Error("Incident manifest has an invalid briefing.");
  return manifest as IncidentManifest;
}
