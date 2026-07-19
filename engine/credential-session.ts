import type { Credential, IncidentBriefing, TestResult } from "@/lib/types";

const storageKey = "pager.credential";

export interface CredentialSession {
  credential: Credential;
  incidentTitle: string;
  briefing: IncidentBriefing;
  caughtIncorrectAiFix: boolean;
  testResult: TestResult;
}

export function saveCredentialSession(session: CredentialSession): void {
  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

export function loadCredentialSession(): CredentialSession | null {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as Partial<CredentialSession>;
    if (!session.credential || !session.incidentTitle || !session.briefing || !session.testResult) return null;
    return session as CredentialSession;
  } catch {
    return null;
  }
}
