import type { IncidentFile, TestResult } from "@/lib/types";

const storagePrefix = "pager.incident-workspace.v2:";
const maxFiles = 200;
const maxFileBytes = 250_000;
const maxTests = 100;

type Decision = "applied" | "rejected";

export interface WorkspaceSession {
  files: IncidentFile[];
  activeFile: string;
  decisions: Record<string, Decision>;
  activeAppliedFixId: string;
  result?: TestResult;
  completionMessage: string;
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isTestResult(value: unknown): value is TestResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<TestResult>;
  return typeof result.passed === "boolean"
    && isText(result.summary, 2_000)
    && Array.isArray(result.tests)
    && result.tests.length <= maxTests
    && result.tests.every((test) => Boolean(test)
      && typeof test === "object"
      && isText((test as TestResult["tests"][number]).name, 1_000)
      && typeof (test as TestResult["tests"][number]).passed === "boolean"
      && isText((test as TestResult["tests"][number]).detail, 8_000));
}

function isWorkspaceSession(value: unknown): value is WorkspaceSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<WorkspaceSession>;
  if (!Array.isArray(session.files) || session.files.length > maxFiles || !isText(session.activeFile, 300) || !isText(session.activeAppliedFixId, 300) || !isText(session.completionMessage, 1_000)) return false;
  if (!session.files.every((file) => Boolean(file) && isText(file.path, 300) && isText(file.content, maxFileBytes))) return false;
  if (!session.decisions || typeof session.decisions !== "object" || Array.isArray(session.decisions) || Object.keys(session.decisions).length > 20) return false;
  if (!Object.entries(session.decisions).every(([id, decision]) => isText(id, 300) && (decision === "applied" || decision === "rejected"))) return false;
  return session.result === undefined || isTestResult(session.result);
}

export function saveWorkspaceSession(incidentId: string, session: WorkspaceSession): boolean {
  try {
    window.localStorage.setItem(`${storagePrefix}${incidentId}`, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function loadWorkspaceSession(incidentId: string): WorkspaceSession | null {
  const stored = window.localStorage.getItem(`${storagePrefix}${incidentId}`);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as unknown;
    return isWorkspaceSession(session) ? session : null;
  } catch {
    return null;
  }
}

export function clearWorkspaceSession(incidentId: string): void {
  try {
    window.localStorage.removeItem(`${storagePrefix}${incidentId}`);
  } catch {
  }
}
