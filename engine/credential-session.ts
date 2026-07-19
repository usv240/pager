import type { Credential, TestResult } from "@/lib/types";

const storageKey = "pager.credential";

export interface CredentialSession {
  credential: Credential;
  incidentTitle: string;
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
    return JSON.parse(stored) as CredentialSession;
  } catch {
    return null;
  }
}
