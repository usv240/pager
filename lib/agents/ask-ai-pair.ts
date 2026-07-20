import "server-only";

import { requestAgentText } from "./openai";

const maxQuestionLength = 700;
const maxSourceLength = 7_000;

export type CoachIncidentContext = {
  id: string;
  title: string;
  service: string;
  severity: string;
  alert: string;
  objective: string;
  successCriterion: string;
  impact: string;
  services: Array<{ name: string; status: string }>;
  events: Array<{ timestamp: string; source: string; message: string }>;
  messages: Array<{ author: string; body: string; timestamp: string }>;
  filePaths: string[];
  verification?: { summary: string; tests: Array<{ name: string; passed: boolean; detail: string }> };
};

function safeAnswer(answer: string): string | null {
  const trimmed = answer.trim();
  const answerLeak = /(repair option|option\s*0?\d|apply (?:the|option)|reject (?:the|option)|correct (?:repair|option)|verified (?:repair|option)|winning (?:repair|option))/i;
  if (!trimmed || trimmed.length > 1_200 || trimmed.includes("```") || answerLeak.test(trimmed)) return null;
  return trimmed;
}

export async function askAiPair(question: string, activeFile: string, source: string, context: CoachIncidentContext): Promise<string | null> {
  if (process.env.MOCK_MODE === "1" || !process.env.OPENAI_API_KEY?.trim()) return null;
  const prompt = [
    "You are the Live Coach in Pager, an incident-response judgment simulator.",
    "Your job is to improve the learner's investigation, not choose or implement their repair.",
    "Hard boundaries: never identify a correct/incorrect/verified repair option; never name, rank, apply, or reject an option; never provide a patch, code block, exact condition, or line-by-line solution.",
    "If asked for the answer, explain that the learner must compare the invariant against the diff and then run the suite. Redirect them to a concrete observation, question, or artifact.",
    "Use only the factual incident context below. Do not invent production data. Be concise, calm, Socratic, and under 140 words.",
    "Return three short plain-text parts: Observation, Question, Next step.",
    `Incident: ${context.severity} ${context.title} in ${context.service}`,
    `Alert: ${context.alert}`,
    `Objective: ${context.objective}`,
    `Success criterion: ${context.successCriterion}`,
    `Impact: ${context.impact}`,
    `Service health: ${context.services.map((service) => `${service.name}=${service.status}`).join(", ")}`,
    `Timeline: ${context.events.map((event) => `${event.timestamp} ${event.source}: ${event.message}`).join(" | ")}`,
    `Incident chat: ${context.messages.map((message) => `${message.timestamp} ${message.author}: ${message.body}`).join(" | ")}`,
    `Files available: ${context.filePaths.join(", ")}`,
    context.verification ? `Latest verification: ${context.verification.summary}. Checks: ${context.verification.tests.map((test) => `${test.passed ? "PASS" : "FAIL"} ${test.name}: ${test.detail}`).join(" | ")}` : "Verification has not run yet.",
    `Active file: ${activeFile}`,
    `Active source:
${source.slice(0, maxSourceLength)}`,
    `Learner question: ${question.slice(0, maxQuestionLength)}`,
  ].join("\n\n");
  const answer = await requestAgentText(prompt, { timeoutMs: 8_000 });
  return answer ? safeAnswer(answer) : null;
}
