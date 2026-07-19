import type { IncidentExecution, IncidentLanguage, IncidentRunner } from "@/lib/types";

export interface IncidentManifest {
  title: string;
  service: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  alert: string;
  timeLimitSeconds: number;
  serviceDirectory: string;
  activeFile: string;
  execution: IncidentExecution;
}

const languages = new Set<IncidentLanguage>(["typescript", "javascript", "python", "java", "cpp"]);
const runners = new Set<IncidentRunner>(["webcontainer-node", "pyodide", "sandbox-java", "sandbox-cpp"]);

export function parseManifest(value: unknown): IncidentManifest {
  if (!value || typeof value !== "object") throw new Error("Incident manifest must be an object.");
  const manifest = value as Partial<IncidentManifest>;
  if (!manifest.title || !manifest.service || !manifest.severity || !manifest.alert || !manifest.timeLimitSeconds || !manifest.serviceDirectory || !manifest.activeFile || !manifest.execution) throw new Error("Incident manifest is missing required fields.");
  const { execution } = manifest;
  if (!languages.has(execution.language) || !runners.has(execution.runner) || !Array.isArray(execution.testCommand)) throw new Error("Incident manifest has an invalid execution configuration.");
  if (!Number.isInteger(manifest.timeLimitSeconds) || manifest.timeLimitSeconds < 1) throw new Error("Incident manifest has an invalid time limit.");
  return manifest as IncidentManifest;
}
