export type FaultTag = "symptom-not-cause" | "partial-fix" | "new-regression" | "verified";
export type StakeholderRole = "pm" | "senior" | "ai-pair";
export interface IncidentFile { path: string; content: string; }
export interface Incident { id: string; title: string; service: string; severity: "SEV-1" | "SEV-2" | "SEV-3"; alert: string; files: IncidentFile[]; activeFile: string; }
export interface FixCandidate { id: string; title: string; rationale: string; faultTag: FaultTag; targetFile: string; patch: string; }
export interface StakeholderMessage { id: string; role: StakeholderRole; author: string; body: string; timestamp: string; }
export interface TestResult { passed: boolean; summary: string; tests: Array<{ name: string; passed: boolean; detail: string }>; }
export interface SessionLog { incidentId: string; startedAt: string; selectedFixIds: string[]; caughtIncorrectAiFix: boolean; testResult?: TestResult; }
export interface Credential { id: string; title: string; summary: string; issuedAt: string; }
export interface FixContext { files: IncidentFile[]; messages: StakeholderMessage[]; }
