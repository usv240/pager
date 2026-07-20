import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseManifest } from "@/engine/incident-manifest";
import type { Incident, IncidentFile, IncidentSummary } from "@/lib/types";

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".json", ".py", ".java", ".c", ".cc", ".cpp", ".h", ".hpp"]);
const ignoredDirectories = new Set(["node_modules", ".next", "coverage", "dist"]);

async function collectFiles(root: string, current = root): Promise<IncidentFile[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(current, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : collectFiles(root, entryPath);
    if (!sourceExtensions.has(path.extname(entry.name))) return [];
    return [{ path: path.relative(root, entryPath).replaceAll("\\", "/"), content: await readFile(entryPath, "utf8") }];
  }));
  return nested.flat();
}

export async function listIncidents(): Promise<IncidentSummary[]> {
  const incidentsRoot = path.join(process.cwd(), "incidents");
  const incidentDirectories = await readdir(incidentsRoot, { withFileTypes: true });
  return Promise.all(incidentDirectories.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const manifest = parseManifest(JSON.parse(await readFile(path.join(incidentsRoot, entry.name, "manifest.json"), "utf8")));
    return { id: entry.name, title: manifest.title, difficulty: manifest.difficulty, language: manifest.execution.language, availability: manifest.availability };
  }));
}

export async function loadIncident(requestedId?: string): Promise<Incident> {
  const incidentsRoot = path.join(process.cwd(), "incidents");
  const incidentDirectories = await readdir(incidentsRoot, { withFileTypes: true });
  const selectedId = requestedId ?? process.env.PAGER_INCIDENT_ID ?? "python-invoice-queue";
  const incidentDirectory = incidentDirectories.find((entry) => entry.isDirectory() && entry.name === selectedId)
    ?? incidentDirectories.find((entry) => entry.isDirectory());
  if (!incidentDirectory) throw new Error("No incident artifact is available.");

  const incidentRoot = path.join(incidentsRoot, incidentDirectory.name);
  const manifest = parseManifest(JSON.parse(await readFile(path.join(incidentRoot, "manifest.json"), "utf8")));
  const serviceRoot = path.join(incidentRoot, manifest.serviceDirectory);
  const files = await collectFiles(serviceRoot);
  if (!files.some((file) => file.path === manifest.activeFile)) throw new Error("Incident manifest references a missing active file.");

  return { id: incidentDirectory.name, title: manifest.title, difficulty: manifest.difficulty, service: manifest.service, severity: manifest.severity, alert: manifest.alert, timeLimitSeconds: manifest.timeLimitSeconds, availability: manifest.availability, briefing: manifest.briefing, telemetry: manifest.telemetry, stakeholderMessages: manifest.stakeholderMessages, files, activeFile: manifest.activeFile, execution: manifest.execution };
}
