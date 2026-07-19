import { jonMessages } from "./personas/jon";
import { mayaMessages } from "./personas/maya";
import { requestAgentText } from "./openai";
import { buildStakeholderPrompt } from "./prompts/stakeholder";
import type {
  AgentStakeholderContext,
  AgentStakeholderRole,
  AuthoredStakeholderMessage,
} from "./types";

function isMockMode(): boolean {
  return process.env.MOCK_MODE === "1";
}

function authoredMessage(
  role: AgentStakeholderRole,
  context: AgentStakeholderContext,
): AuthoredStakeholderMessage {
  return (role === "pm" ? mayaMessages : jonMessages)[context.phase];
}

function parseMessage(text: string): string | null {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return null;
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" && message.trim() && message.length <= 600
      ? message.trim()
      : null;
  } catch {
    return null;
  }
}

function isSafeMessage(role: AgentStakeholderRole, message: string): boolean {
  if (message.includes("```")) return false;
  if (role === "pm") {
    return !/\b(processCheckout|checkout-service|transitionStatus|edit the code|change the code|patch)\b/i.test(message);
  }
  return !/\b(race|critical section|mutex|lock|charging state|claim the order|correct candidate|wrong candidate)\b/i.test(message)
    && !/\b(use|add|change|move|transition)\b[^.?!]{0,80}\b(code|mutex|lock|charging|pending_payment)\b/i.test(message);
}

export async function stakeholderReply(
  role: AgentStakeholderRole,
  context: AgentStakeholderContext,
): Promise<AuthoredStakeholderMessage> {
  const authored = authoredMessage(role, context);
  if (isMockMode()) return { ...authored };

  const text = await requestAgentText(
    buildStakeholderPrompt(role, context.phase, authored, context.elapsedSeconds),
  );
  const message = text ? parseMessage(text) : null;
  if (!message || !isSafeMessage(role, message)) return { ...authored };

  return { ...authored, body: message };
}
