import { askAiPair } from "@/lib/agents/ask-ai-pair";

function isRequest(value: unknown): value is { question: string; activeFile: string; source: string } {
  if (typeof value !== "object" || value === null) return false;
  const { question, activeFile, source } = value as Record<string, unknown>;
  return typeof question === "string" && question.trim().length > 0 && question.length <= 700
    && typeof activeFile === "string" && activeFile.length <= 300
    && typeof source === "string" && source.length <= 30_000;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isRequest(body)) return Response.json({ error: "Invalid AI Pair question." }, { status: 400 });
    const answer = await askAiPair(body.question, body.activeFile, body.source);
    if (!answer) return Response.json({ error: "Live AI Pair is unavailable. Add OPENAI_API_KEY and disable MOCK_MODE to enable it." }, { status: 503 });
    return Response.json({ answer });
  } catch {
    return Response.json({ error: "AI Pair could not answer right now. Keep investigating and try again." }, { status: 502 });
  }
}
