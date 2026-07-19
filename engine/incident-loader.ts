import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseManifest } from "@/engine/incident-manifest";
import type { Incident, IncidentFile } from "@/lib/types";

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".json", ".py", ".java", ".c", ".cc", ".cpp", ".h", ".hpp"]);

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

export async function loadIncident(): Promise<Incident> {
  const incidentsRoot = path.join(process.cwd(), "incidents");
  const incidentDirectories = await readdir(incidentsRoot, { withFileTypes: true });
  const requestedId = process.env.PAGER_INCIDENT_ID;
  const incidentDirectory = incidentDirectories.find((entry) => entry.isDirectory() && entry.name === requestedId)
    ?? incidentDirectories.find((entry) => entry.isDirectory());
  if (!incidentDirectory) throw new Error("No incident artifact is available.");

  const incidentRoot = path.join(incidentsRoot, incidentDirectory.name);
  const manifest = parseManifest(JSON.parse(await readFile(path.join(incidentRoot, "manifest.json"), "utf8")));
  const serviceRoot = path.join(incidentRoot, manifest.serviceDirectory);
  const files = await collectFiles(serviceRoot);
  if (!files.some((file) => file.path === manifest.activeFile)) throw new Error("Incident manifest references a missing active file.");

  return { id: incidentDirectory.name, title: manifest.title, service: manifest.service, severity: manifest.severity, alert: manifest.alert, timeLimitSeconds: manifest.timeLimitSeconds, files, activeFile: manifest.activeFile, execution: manifest.execution };
}
