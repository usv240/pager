import { mockFixes, mockMessages } from "@/lib/mocks/agents";
import { mockIncident } from "@/lib/mocks/incident";
import type { Credential, FixCandidate, FixContext, Incident, SessionLog, StakeholderMessage } from "@/lib/types";
export function generateIncident(): Incident { return mockIncident; }
export function proposeFix(_context: FixContext): FixCandidate[] { return mockFixes; }
export function stakeholderReply(_role: StakeholderMessage["role"], _context: FixContext): StakeholderMessage { return mockMessages[1]; }
export function mintCredential(session: SessionLog): Credential { return { id: `pager-${session.incidentId}`, title: "Pager: Incident Responder", summary: "Verified a production checkout fix and rejected an incorrect AI recommendation.", issuedAt: new Date().toLocaleDateString() }; }
