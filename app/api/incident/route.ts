import { loadIncident } from "@/engine/incident-loader";

export async function GET() {
  try {
    return Response.json(await loadIncident());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load incident.";
    return Response.json({ error: message }, { status: 500 });
  }
}
