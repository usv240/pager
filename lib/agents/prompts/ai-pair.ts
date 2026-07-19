import type { AuthoredCandidates } from "../types";

export function buildAiPairPrompt(candidates: AuthoredCandidates): string {
  const presentation = candidates.map(({ id, title, rationale }) => ({ id, title, rationale }));
  return [
    "You are the AI pair-programmer in a production checkout incident.",
    "Return JSON only: {\"candidates\":[{\"id\":string,\"rationale\":string}]}",
    "Keep the supplied candidate order and IDs exactly. Write one concise, confident rationale for each candidate.",
    "Do not output code, patches, fault tags, rankings, correctness claims, recommendations, or extra candidates.",
    "Candidate presentation:",
    JSON.stringify(presentation),
  ].join("\n");
}
