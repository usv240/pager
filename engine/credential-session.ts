import type { Credential, IncidentBriefing, TestResult } from "@/lib/types";

const storageKey = "pager.credential";
const maxTests = 100;

export interface CredentialSession {
  credential: Credential;
  incidentId: string;
  incidentTitle: string;
  briefing: IncidentBriefing;
  caughtIncorrectAiFix: boolean;
  testResult: TestResult;
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isCredential(value: unknown): value is Credential {
  if (!value || typeof value !== "object") return false;
  const credential = value as Partial<Credential>;
  return isText(credential.id, 300) && isText(credential.title, 300) && isText(credential.summary, 2_000) && isText(credential.issuedAt, 100);
}

function isBriefing(value: unknown): value is IncidentBriefing {
  if (!value || typeof value !== "object") return false;
  const briefing = value as Partial<IncidentBriefing>;
  return isText(briefing.objective, 4_000) && isText(briefing.successCriterion, 4_000) && isText(briefing.rootCause, 4_000) && isText(briefing.evidence, 4_000);
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
      && typeof (test as TestResult["tests"][number]).detail === "string"
      && (test as TestResult["tests"][number]).detail.length <= 8_000);
}

export function saveCredentialSession(session: CredentialSession): boolean {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function loadCredentialSession(): CredentialSession | null {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as Partial<CredentialSession>;
    if (!isCredential(session.credential) || !isText(session.incidentId, 300) || !isText(session.incidentTitle, 300) || !isBriefing(session.briefing) || !isTestResult(session.testResult) || typeof session.caughtIncorrectAiFix !== "boolean") return null;
    return session as CredentialSession;
  } catch {
    return null;
  }
}
