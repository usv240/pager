import { listIncidents } from "@/engine/incident-loader";

export async function GET() {
  try {
    return Response.json(await listIncidents());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load incident catalog.";
    return Response.json({ error: message }, { status: 500 });
  }
}
