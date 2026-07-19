import { proposeFix } from "@/lib";
import type { FixContext } from "@/lib/types";

function isFixContext(value: unknown): value is FixContext {
  if (typeof value !== "object" || value === null) return false;
  const { files, messages } = value as { files?: unknown; messages?: unknown };
  return Array.isArray(files) && Array.isArray(messages);
}

export async function POST(request: Request) {
  try {
    const context: unknown = await request.json();
    if (!isFixContext(context)) return Response.json({ error: "Invalid agent context." }, { status: 400 });
    return Response.json(await proposeFix(context));
  } catch {
    return Response.json({ error: "Unable to prepare AI-pair recommendations." }, { status: 500 });
  }
}
