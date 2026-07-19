import "server-only";

import type { AgentFetchOptions } from "./types";

const responsesEndpoint = "https://api.openai.com/v1/responses";
const defaultTimeoutMs = 4_000;

function configuredTimeout(): number {
  const value = Number(process.env.PAGER_AGENT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : defaultTimeoutMs;
}

function outputText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const text = (payload as { output_text?: unknown }).output_text;
  return typeof text === "string" && text.trim() ? text : null;
}

export async function requestAgentText(
  prompt: string,
  options: AgentFetchOptions = {},
): Promise<string | null> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? configuredTimeout());
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  try {
    const response = await fetchImpl(responsesEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-terra",
        reasoning: { effort: "low" },
        input: prompt,
        max_output_tokens: 500,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return outputText(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
