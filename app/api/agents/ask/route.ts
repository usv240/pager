import { askAiPair } from "@/lib/agents/ask-ai-pair";

const requestWindowMs = 10 * 60 * 1_000;
const requestLimit = 12;
const requestLog = new Map<string, number[]>();

function isRequest(value: unknown): value is { question: string; activeFile: string; source: string } {
  if (typeof value !== "object" || value === null) return false;
  const { question, activeFile, source } = value as Record<string, unknown>;
  return typeof question === "string" && question.trim().length > 0 && question.length <= 700
    && typeof activeFile === "string" && activeFile.length <= 300
    && typeof source === "string" && source.length <= 30_000;
}

export async function POST(request: Request) {
  try {
    const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const now = Date.now();
    const requests = (requestLog.get(clientId) ?? []).filter((timestamp) => now - timestamp < requestWindowMs);
    if (requests.length >= requestLimit) {
      return Response.json({ error: "Live AI Pair request limit reached. Continue investigating and try again in a few minutes." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "600" } });
    }
    requestLog.set(clientId, [...requests, now]);
    const body: unknown = await request.json();
    if (!isRequest(body)) return Response.json({ error: "Invalid AI Pair question." }, { status: 400 });
    const answer = await askAiPair(body.question, body.activeFile, body.source);
    if (!answer) return Response.json({ error: "Live AI Pair is unavailable. Add OPENAI_API_KEY and disable MOCK_MODE to enable it." }, { status: 503 });
    return Response.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "AI Pair could not answer right now. Keep investigating and try again." }, { status: 502 });
  }
}
