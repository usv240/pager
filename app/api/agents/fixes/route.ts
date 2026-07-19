import { proposeFix } from "@/lib";
import type { FixCandidate, FixContext } from "@/lib/types";

type LearnerFix = {
  id: string;
  title: string;
  rationale: string;
  targetFile?: string;
  patch: string;
};

function isFixContext(value: unknown): value is FixContext {
  if (typeof value !== "object" || value === null) return false;
  const { files, messages } = value as { files?: unknown; messages?: unknown };
  return Array.isArray(files) && Array.isArray(messages);
}

function toLearnerFix(candidate: FixCandidate): LearnerFix {
  return {
    id: candidate.id,
    title: candidate.title,
    rationale: candidate.rationale,
    targetFile: candidate.targetFile,
    patch: candidate.patch,
  };
}

export async function POST(request: Request) {
  try {
    const context: unknown = await request.json();
    if (!isFixContext(context)) return Response.json({ error: "Invalid agent context." }, { status: 400 });
    return Response.json((await proposeFix(context)).map(toLearnerFix));
  } catch {
    return Response.json({ error: "Unable to prepare AI-pair recommendations." }, { status: 500 });
  }
}
