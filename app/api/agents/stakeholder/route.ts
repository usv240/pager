import { stakeholderReply } from "@/lib";
import type { AgentGamePhase, AgentStakeholderRole } from "@/lib/agents";
import type { FixContext } from "@/lib/types";

const roles: AgentStakeholderRole[] = ["pm", "senior"];
const phases: AgentGamePhase[] = ["start", "mid", "after-wrong-fix", "after-tests-fail"];

function isFixContext(value: unknown): value is FixContext {
  if (typeof value !== "object" || value === null) return false;
  const { files, messages } = value as { files?: unknown; messages?: unknown };
  return Array.isArray(files) && Array.isArray(messages);
}

export async function POST(request: Request) {
  try {
    const value: unknown = await request.json();
    if (typeof value !== "object" || value === null || !isFixContext(value)) {
      return Response.json({ error: "Invalid stakeholder context." }, { status: 400 });
    }
    const { role, phase, elapsedSeconds } = value as { role?: unknown; phase?: unknown; elapsedSeconds?: unknown };
    if (!roles.includes(role as AgentStakeholderRole) || !phases.includes(phase as AgentGamePhase) || typeof elapsedSeconds !== "number") {
      return Response.json({ error: "Invalid stakeholder request." }, { status: 400 });
    }
    return Response.json(await stakeholderReply(role as AgentStakeholderRole, {
      ...value,
      phase: phase as AgentGamePhase,
      elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)),
    }));
  } catch {
    return Response.json({ error: "Unable to prepare stakeholder message." }, { status: 500 });
  }
}
