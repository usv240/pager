import "server-only";

import { requestAgentText } from "./openai";

const maxQuestionLength = 700;
const maxSourceLength = 7_000;

function safeAnswer(answer: string): string | null {
  const trimmed = answer.trim();
  if (!trimmed || trimmed.length > 1_200 || trimmed.includes("```")) return null;
  return trimmed;
}

export async function askAiPair(question: string, activeFile: string, source: string): Promise<string | null> {
  if (process.env.MOCK_MODE === "1" || !process.env.OPENAI_API_KEY?.trim()) return null;
  const prompt = [
    "You are AI Pair in Pager, an incident-response judgment simulator.",
    "Answer the learner's question as a concise Socratic senior pairing partner.",
    "Do not reveal which recommendation is correct or incorrect. Do not provide a paste-ready patch, code block, or exact line-by-line solution.",
    "Instead, point to observations, invariants, interleavings, and files the learner should inspect. Be candid about uncertainty.",
    "Keep the reply under 140 words and use plain text only.",
    `Active file: ${activeFile}`,
    `Active source:\n${source.slice(0, maxSourceLength)}`,
    `Learner question: ${question.slice(0, maxQuestionLength)}`,
  ].join("\n\n");
  const answer = await requestAgentText(prompt, { timeoutMs: 8_000 });
  return answer ? safeAnswer(answer) : null;
}
