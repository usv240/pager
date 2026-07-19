import { mockIncident } from "@/lib/mocks/incident";
import { mintCredential } from "@/lib/credentials";
import { proposeFix as authoredProposeFix, stakeholderReply as authoredStakeholderReply } from "@/lib/agents";
import type { FixCandidate, FixContext, Incident, StakeholderMessage } from "@/lib/types";
import type { AgentStakeholderContext, AgentStakeholderRole } from "@/lib/agents";
export function generateIncident(): Incident { return mockIncident; }
export async function proposeFix(context: FixContext): Promise<FixCandidate[]> { return authoredProposeFix(context); }
export async function stakeholderReply(
  role: AgentStakeholderRole,
  context: AgentStakeholderContext,
): Promise<StakeholderMessage> { return authoredStakeholderReply(role, context); }
export { mintCredential };
