import { askAiPair, type CoachIncidentContext } from "@/lib/agents/ask-ai-pair";

const requestWindowMs = 10 * 60 * 1_000;
const requestLimit = 12;
const requestLog = new Map<string, number[]>();
const noStoreHeaders = { "Cache-Control": "no-store" };

type CoachRequest = { question: string; activeFile: string; source: string; context: CoachIncidentContext };

function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return (forwarded || realIp || "local").slice(0, 128);
}

function isContext(value: unknown): value is CoachIncidentContext {
  if (typeof value !== "object" || value === null) return false;
  const context = value as Partial<CoachIncidentContext>;
  return typeof context.id === "string" && context.id.length <= 100
    && typeof context.title === "string" && context.title.length <= 200
    && typeof context.service === "string" && context.service.length <= 200
    && typeof context.severity === "string" && context.severity.length <= 20
    && typeof context.alert === "string" && context.alert.length <= 1_000
    && typeof context.objective === "string" && context.objective.length <= 2_000
    && typeof context.successCriterion === "string" && context.successCriterion.length <= 2_000
    && typeof context.impact === "string" && context.impact.length <= 2_000
    && Array.isArray(context.services) && context.services.length <= 20
    && Array.isArray(context.events) && context.events.length <= 30
    && Array.isArray(context.messages) && context.messages.length <= 30
    && Array.isArray(context.filePaths) && context.filePaths.length <= 100;
}

function isRequest(value: unknown): value is CoachRequest {
  if (typeof value !== "object" || value === null) return false;
  const { question, activeFile, source, context } = value as Record<string, unknown>;
  return typeof question === "string" && question.trim().length > 0 && question.length <= 700
    && typeof activeFile === "string" && activeFile.length <= 300
    && typeof source === "string" && source.length <= 30_000
    && isContext(context);
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return Response.json({ error: "Coach requests must come from Pager." }, { status: 403, headers: noStoreHeaders });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid Coach question." }, { status: 400, headers: noStoreHeaders });
  }
  if (!isRequest(body)) return Response.json({ error: "Invalid Coach question." }, { status: 400, headers: noStoreHeaders });

  const clientId = clientIdentifier(request);
  const now = Date.now();
  const requests = (requestLog.get(clientId) ?? []).filter((timestamp) => now - timestamp < requestWindowMs);
  if (requests.length >= requestLimit) {
    return Response.json({ error: "Live Coach request limit reached. Continue investigating and try again in a few minutes." }, { status: 429, headers: { ...noStoreHeaders, "Retry-After": "600" } });
  }
  requestLog.set(clientId, [...requests, now]);

  try {
    const answer = await askAiPair(body.question, body.activeFile, body.source, body.context);
    if (!answer) return Response.json({ error: "Coach could not provide safe guidance right now. Continue with the incident evidence and try a narrower question." }, { status: 503, headers: noStoreHeaders });
    return Response.json({ answer }, { headers: noStoreHeaders });
  } catch {
    return Response.json({ error: "Coach could not answer right now. Keep investigating and try again." }, { status: 502, headers: noStoreHeaders });
  }
}
