import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Incident, IncidentFile } from "@/lib/types";

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".json"]);

function toTitle(value: string): string {
  return value.split(/[-_]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

async function collectFiles(root: string, current = root): Promise<IncidentFile[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(current, entry.name);
    if (entry.isDirectory()) return collectFiles(root, entryPath);
    if (!sourceExtensions.has(path.extname(entry.name))) return [];
    return [{ path: path.relative(root, entryPath).replaceAll("\\", "/"), content: await readFile(entryPath, "utf8") }];
  }));
  return nested.flat();
}

async function resolveServiceRoot(incidentRoot: string): Promise<string> {
  const entries = await readdir(incidentRoot, { withFileTypes: true });
  const service = entries.find((entry) => entry.isDirectory());
  if (!service) throw new Error("No service directory found for incident.");
  return path.join(incidentRoot, service.name);
}

export async function loadIncident(): Promise<Incident> {
  const incidentsRoot = path.join(process.cwd(), "incidents");
  const incidentDirectories = await readdir(incidentsRoot, { withFileTypes: true });
  const requestedId = process.env.PAGER_INCIDENT_ID;
  const incidentDirectory = incidentDirectories.find((entry) => entry.isDirectory() && entry.name === requestedId)
    ?? incidentDirectories.find((entry) => entry.isDirectory());
  if (!incidentDirectory) throw new Error("No incident artifact is available.");

  const incidentRoot = path.join(incidentsRoot, incidentDirectory.name);
  const serviceRoot = await resolveServiceRoot(incidentRoot);
  const packageInfo = JSON.parse(await readFile(path.join(serviceRoot, "package.json"), "utf8")) as { name?: string };
  const files = await collectFiles(serviceRoot);
  const activeFile = files.find((file) => file.path.includes("services/"))?.path ?? files[0]?.path;
  if (!activeFile) throw new Error("Incident artifact contains no source files.");

  const service = packageInfo.name ?? path.basename(serviceRoot);
  return { id: incidentDirectory.name, title: toTitle(incidentDirectory.name), service, severity: "SEV-1", alert: `A production anomaly is active in ${service}. Investigate before shipping a fix.`, files, activeFile };
}
