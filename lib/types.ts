export type FaultTag = "symptom-not-cause" | "partial-fix" | "new-regression" | "verified";
export type StakeholderRole = "pm" | "senior" | "ai-pair";
export type IncidentLanguage = "typescript" | "javascript" | "python" | "java" | "cpp";
export type IncidentRunner = "webcontainer-node" | "pyodide" | "sandbox-java" | "sandbox-cpp";
export interface IncidentFile { path: string; content: string; }
export interface IncidentExecution { language: IncidentLanguage; runner: IncidentRunner; installCommand?: string[]; testCommand: string[]; }
export interface Incident { id: string; title: string; service: string; severity: "SEV-1" | "SEV-2" | "SEV-3"; alert: string; timeLimitSeconds: number; files: IncidentFile[]; activeFile: string; execution: IncidentExecution; }
export interface IncidentSummary { id: string; title: string; language: IncidentLanguage; }
export interface FixCandidate { id: string; title: string; rationale: string; faultTag: FaultTag; patch: string; }
export interface StakeholderMessage { id: string; role: StakeholderRole; author: string; body: string; timestamp: string; }
export interface TestResult { passed: boolean; summary: string; tests: Array<{ name: string; passed: boolean; detail: string }>; }
export interface SessionLog { incidentId: string; startedAt: string; selectedFixIds: string[]; caughtIncorrectAiFix: boolean; testResult?: TestResult; }
export interface Credential { id: string; title: string; summary: string; issuedAt: string; }
export interface FixContext { files: IncidentFile[]; messages: StakeholderMessage[]; }
