import type { FixCandidate, FixContext, StakeholderMessage } from "../types";

export type AgentStakeholderRole = "pm" | "senior";
export type AgentGamePhase = "start" | "mid" | "after-wrong-fix" | "after-tests-fail";

export interface AgentStakeholderContext extends FixContext {
  phase: AgentGamePhase;
  elapsedSeconds: number;
}

export interface CandidatePresentation {
  id: string;
  rationale: string;
}

export interface AuthoredStakeholderMessage extends StakeholderMessage {
  role: AgentStakeholderRole;
}

export interface AgentFetchOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string | undefined;
  timeoutMs?: number;
}

export type AuthoredCandidates = readonly FixCandidate[];
