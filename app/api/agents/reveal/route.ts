import { allAuthoredCandidates } from "@/lib/agents/candidates";

type Decision = "applied" | "rejected";

function isRevealRequest(value: unknown): value is { candidateId: string; decision: Decision } {
  if (typeof value !== "object" || value === null) return false;
  const { candidateId, decision } = value as { candidateId?: unknown; decision?: unknown };
  return typeof candidateId === "string" && (decision === "applied" || decision === "rejected");
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    if (!isRevealRequest(payload)) return Response.json({ error: "Invalid reveal request." }, { status: 400 });

    const candidate = allAuthoredCandidates.find(({ id }) => id === payload.candidateId);
    if (!candidate) return Response.json({ error: "Unknown candidate." }, { status: 400 });

    // Ujwal: call this only after recording the learner's applied/rejected decision.
    return Response.json({ id: candidate.id, faultTag: candidate.faultTag, teaching: candidate.teaching });
  } catch {
    return Response.json({ error: "Unable to reveal candidate feedback." }, { status: 400 });
  }
}
