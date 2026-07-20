import { afterEach, describe, expect, test, vi } from "vitest";
import { checkout2pmCandidates } from "../lib/agents/candidates/checkout-2pm";
import { candidatesForFiles } from "../lib/agents/candidates";
import { pythonInvoiceQueueCandidates } from "../lib/agents/candidates/python-invoice-queue";
import { requestAgentText } from "../lib/agents/openai";
import { mayaMessages } from "../lib/agents/personas/maya";
import { jonMessages } from "../lib/agents/personas/jon";
import { proposeFix } from "../lib/agents/propose-fix";
import { stakeholderReply } from "../lib/agents/stakeholder-reply";
import type { AgentGamePhase, AgentStakeholderContext } from "../lib/agents/types";
import { POST as fixesPost } from "../app/api/agents/fixes/route";
import { POST as revealPost } from "../app/api/agents/reveal/route";

const originalMockMode = process.env.MOCK_MODE;
const originalApiKey = process.env.OPENAI_API_KEY;
const originalTimeout = process.env.PAGER_AGENT_TIMEOUT_MS;
const originalFetch = globalThis.fetch;

const phases: AgentGamePhase[] = ["start", "mid", "after-wrong-fix", "after-tests-fail"];
const emptyContext = { files: [], messages: [] };

function stakeholderContext(phase: AgentGamePhase): AgentStakeholderContext {
  return { ...emptyContext, phase, elapsedSeconds: 120 };
}

function restoreEnvironment(name: "MOCK_MODE" | "OPENAI_API_KEY" | "PAGER_AGENT_TIMEOUT_MS", value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function candidateResponse(rationales: readonly string[] = checkout2pmCandidates.map((candidate) => candidate.rationale)): Response {
  return new Response(
    JSON.stringify({
      output_text: JSON.stringify({
        candidates: checkout2pmCandidates.map((candidate, index) => ({
          id: candidate.id,
          rationale: rationales[index],
        })),
      }),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function stakeholderResponse(message: string): Response {
  return new Response(
    JSON.stringify({ output_text: JSON.stringify({ message }) }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

afterEach(() => {
  restoreEnvironment("MOCK_MODE", originalMockMode);
  restoreEnvironment("OPENAI_API_KEY", originalApiKey);
  restoreEnvironment("PAGER_AGENT_TIMEOUT_MS", originalTimeout);
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("authored checkout candidates", () => {
  test("have the six required fields, canonical order, and executable full-file patches", () => {
    expect(checkout2pmCandidates.map((candidate) => candidate.id)).toEqual([
      "handle-confirmation-failure",
      "send-clearwater-idempotency-key",
      "claim-order-before-charging",
    ]);
    for (const candidate of checkout2pmCandidates) {
      expect(candidate).toEqual(expect.objectContaining({
        id: expect.any(String),
        title: expect.any(String),
        rationale: expect.any(String),
        faultTag: expect.any(String),
        targetFile: "src/services/checkout-service.ts",
        patch: expect.stringContaining("export class CheckoutService"),
      }));
      expect(candidate.patch).toContain("async processCheckout");
      expect(candidate.teaching.split(".").filter(Boolean).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("authored Python candidates", () => {
  test("use complete queue replacements and are selected for the Python incident", () => {
    expect(pythonInvoiceQueueCandidates.map((candidate) => candidate.id)).toEqual([
      "normalize-invoice-id",
      "sort-pending-invoices",
      "deduplicate-pending-invoice",
    ]);
    expect(candidatesForFiles(["src/invoice_queue.py"])).toEqual(pythonInvoiceQueueCandidates);
    for (const candidate of pythonInvoiceQueueCandidates) {
      expect(candidate.targetFile).toBe("src/invoice_queue.py");
      expect(candidate.patch).toContain("class InvoiceQueue");
      expect(candidate.teaching.split(".").filter(Boolean).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("candidate reveal API", () => {
  test("keeps fault tags and teaching out of learner-facing fixes", async () => {
    process.env.MOCK_MODE = "1";

    const response = await fixesPost(new Request("http://pager.test/api/agents/fixes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emptyContext),
    }));
    const fixes = await response.json() as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(fixes).toHaveLength(3);
    for (const fix of fixes) {
      expect(fix).not.toHaveProperty("faultTag");
      expect(fix).not.toHaveProperty("teaching");
    }
  });

  test("reveals the authored fault tag and teaching after a decision", async () => {
    const candidate = checkout2pmCandidates[0];
    const response = await revealPost(new Request("http://pager.test/api/agents/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: candidate.id, decision: "rejected" }),
    }));

    await expect(response.json()).resolves.toEqual({
      id: candidate.id,
      faultTag: candidate.faultTag,
      teaching: candidate.teaching,
    });
  });

  test("rejects an unknown candidate ID", async () => {
    const response = await revealPost(new Request("http://pager.test/api/agents/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: "unknown", decision: "applied" }),
    }));

    expect(response.status).toBe(400);
  });
});

describe("proposeFix", () => {
  test("is async and returns canonical authored candidates in mock mode without fetching", async () => {
    process.env.MOCK_MODE = "1";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as typeof fetch;

    const result = proposeFix(emptyContext);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual(checkout2pmCandidates);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("uses only validated presentation text and preserves immutable candidate fields", async () => {
    process.env.MOCK_MODE = "0";
    process.env.OPENAI_API_KEY = "test-key";
    const fetchSpy = vi.fn().mockResolvedValue(candidateResponse([
      "Return the completed order with the provider receipt.",
      "Use one stable payment identity for every checkout submission.",
      "Establish ownership before the external charge and join duplicate callers.",
    ]));
    globalThis.fetch = fetchSpy as typeof fetch;

    const result = await proposeFix(emptyContext);

    expect(result.map(({ id, title, faultTag, targetFile, patch }) => ({ id, title, faultTag, targetFile, patch })))
      .toEqual(checkout2pmCandidates.map(({ id, title, faultTag, targetFile, patch }) => ({ id, title, faultTag, targetFile, patch })));
    expect(result.map((candidate) => candidate.rationale)).not.toEqual(
      checkout2pmCandidates.map((candidate) => candidate.rationale),
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(JSON.parse(String(options.body))).toMatchObject({
      model: "gpt-5.6-terra",
      reasoning: { effort: "low" },
    });
  });

  test.each([
    "not json",
    JSON.stringify({ candidates: [] }),
    JSON.stringify({ candidates: [...checkout2pmCandidates].reverse().map((candidate) => ({ id: candidate.id, rationale: candidate.rationale })) }),
    JSON.stringify({ candidates: checkout2pmCandidates.map((candidate) => ({ id: candidate.id, rationale: `${candidate.rationale} hidden test` })) }),
  ])("falls back to authored candidates for invalid presentation: %s", async (outputText) => {
    process.env.MOCK_MODE = "0";
    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: outputText }), { status: 200 }),
    ) as typeof fetch;

    await expect(proposeFix(emptyContext)).resolves.toEqual(checkout2pmCandidates);
  });

  test("falls back when the API key is missing without a network call", async () => {
    process.env.MOCK_MODE = "0";
    delete process.env.OPENAI_API_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as typeof fetch;

    await expect(proposeFix(emptyContext)).resolves.toEqual(checkout2pmCandidates);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test.each([
    () => Promise.reject(new Error("network unavailable")),
    () => Promise.resolve(new Response("{}", { status: 429 })),
    () => Promise.resolve(new Response("not json", { status: 200 })),
    () => Promise.resolve(new Response(JSON.stringify({ output_text: "" }), { status: 200 })),
  ])("falls back for provider and response failures", async (responseFactory) => {
    process.env.MOCK_MODE = "0";
    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockImplementation(responseFactory) as typeof fetch;

    await expect(proposeFix(emptyContext)).resolves.toEqual(checkout2pmCandidates);
  });
});

describe("stakeholderReply", () => {
  test("is async, returns every exact authored mock message, and makes zero network calls", async () => {
    process.env.MOCK_MODE = "1";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as typeof fetch;

    for (const phase of phases) {
      const maya = stakeholderReply("pm", stakeholderContext(phase));
      expect(maya).toBeInstanceOf(Promise);
      await expect(maya).resolves.toEqual(mayaMessages[phase]);
      await expect(stakeholderReply("senior", stakeholderContext(phase))).resolves.toEqual(jonMessages[phase]);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("uses a safe real-mode rendering while retaining authored identity and phase", async () => {
    process.env.MOCK_MODE = "0";
    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue(
      stakeholderResponse("Which operation completed before the error was created?"),
    ) as typeof fetch;

    await expect(stakeholderReply("senior", stakeholderContext("start"))).resolves.toEqual({
      ...jonMessages.start,
      body: "Which operation completed before the error was created?",
    });
  });

  test.each([
    ["senior", "Use a mutex to fix this race."],
    ["pm", "Change the processCheckout code and deploy the patch."],
  ] as const)("falls back when %s rendering crosses a persona boundary", async (role, message) => {
    process.env.MOCK_MODE = "0";
    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue(stakeholderResponse(message)) as typeof fetch;

    const expected = role === "pm" ? mayaMessages.mid : jonMessages.mid;
    await expect(stakeholderReply(role, stakeholderContext("mid"))).resolves.toEqual(expected);
  });
});

describe("Responses fallback timeout", () => {
  test("returns null when the request timeout aborts", async () => {
    const fetchSpy = vi.fn((_url: string, options?: RequestInit) => new Promise<never>((_resolve, reject) => {
      (options?.signal as AbortSignal).addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));

    await expect(requestAgentText("test", {
      apiKey: "test-key",
      fetchImpl: fetchSpy as typeof fetch,
      timeoutMs: 1,
    })).resolves.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
