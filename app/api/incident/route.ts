import type { NextRequest } from "next/server";
import { loadIncident } from "@/engine/incident-loader";

export async function GET(request: NextRequest) {
  try {
    return Response.json(await loadIncident(request.nextUrl.searchParams.get("incident") ?? undefined));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load incident.";
    return Response.json({ error: message }, { status: 500 });
  }
}
