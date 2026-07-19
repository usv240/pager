import type { FixCandidate, FixContext } from "../types";
import { checkout2pmCandidates } from "./candidates/checkout-2pm";
import { requestAgentText } from "./openai";
import { buildAiPairPrompt } from "./prompts/ai-pair";
import type { CandidatePresentation } from "./types";

function isMockMode(): boolean {
  return process.env.MOCK_MODE === "1";
}

function parsePresentations(text: string): CandidatePresentation[] | null {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return null;
    const candidates = (value as { candidates?: unknown }).candidates;
    if (!Array.isArray(candidates) || candidates.length !== checkout2pmCandidates.length) return null;
    if (text.includes("```")) return null;
    const parsed = candidates.map((candidate): CandidatePresentation | null => {
      if (typeof candidate !== "object" || candidate === null) return null;
      const { id, rationale } = candidate as { id?: unknown; rationale?: unknown };
      if (typeof id !== "string" || typeof rationale !== "string" || !rationale.trim()) return null;
      if (rationale.length > 900 || /\b(faultTag|verified|wrong fix|hidden test)\b/i.test(rationale)) return null;
      return { id, rationale: rationale.trim() };
    });
    if (parsed.some((candidate): candidate is null => candidate === null)) return null;
    const presentations = parsed as CandidatePresentation[];
    if (!presentations.every((candidate, index) => candidate.id === checkout2pmCandidates[index]?.id)) {
      return null;
    }
    return presentations;
  } catch {
    return null;
  }
}

export async function proposeFix(_context: FixContext): Promise<FixCandidate[]> {
  const authored = checkout2pmCandidates.map((candidate) => ({ ...candidate }));
  if (isMockMode()) return authored;

  const text = await requestAgentText(buildAiPairPrompt(checkout2pmCandidates));
  const presentations = text ? parsePresentations(text) : null;
  if (!presentations) return authored;

  return authored.map((candidate, index) => ({
    ...candidate,
    rationale: presentations[index]?.rationale ?? candidate.rationale,
  }));
}
