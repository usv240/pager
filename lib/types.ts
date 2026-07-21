export type FaultTag = "symptom-not-cause" | "partial-fix" | "new-regression" | "verified";
export type IncidentFaultClass = "idempotency" | "concurrency" | "ordering" | "replay-safety";
export type StakeholderRole = "pm" | "senior" | "sre" | "support" | "finance" | "ai-pair";
export type IncidentLanguage = "typescript" | "javascript" | "python" | "java" | "cpp";
export type IncidentRunner = "webcontainer-node" | "pyodide" | "sandbox-java" | "sandbox-cpp";
export type IncidentAvailability = "complete" | "experimental";
export type IncidentDifficulty = "easy" | "medium" | "advanced";
export interface IncidentFile { path: string; content: string; }
export interface IncidentBriefing { objective: string; successCriterion: string; rootCause: string; evidence: string; }
export interface IncidentTelemetry { impact: string; services: Array<{ name: string; status: "degraded" | "investigating" | "healthy" }>; events: Array<{ timestamp: string; source: string; message: string }>; }
export interface IncidentExecution { language: IncidentLanguage; runner: IncidentRunner; installCommand?: string[]; testCommand: string[]; }
export interface Incident { id: string; title: string; difficulty: IncidentDifficulty; service: string; severity: "SEV-1" | "SEV-2" | "SEV-3"; alert: string; timeLimitSeconds: number; availability: IncidentAvailability; faultClass?: IncidentFaultClass; briefing: IncidentBriefing; telemetry: IncidentTelemetry; stakeholderMessages: StakeholderMessage[]; files: IncidentFile[]; activeFile: string; execution: IncidentExecution; }
export interface IncidentSummary { id: string; title: string; difficulty: IncidentDifficulty; language: IncidentLanguage; availability: IncidentAvailability; }
export interface FixCandidate { id: string; title: string; rationale: string; faultTag: FaultTag; patch: string; targetFile?: string; }
export interface StakeholderMessage { id: string; role: StakeholderRole; author: string; body: string; timestamp: string; }
export interface TestResult { passed: boolean; summary: string; tests: Array<{ name: string; passed: boolean; detail: string }>; }
export interface SessionLog { incidentId: string; startedAt: string; selectedFixIds: string[]; caughtIncorrectAiFix: boolean; testResult?: TestResult; }
export interface Credential { id: string; title: string; summary: string; issuedAt: string; }
export interface FixContext { files: IncidentFile[]; messages: StakeholderMessage[]; }
