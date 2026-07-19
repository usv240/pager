import type { WebContainer } from "@webcontainer/api";
import { runPyodide, type PyodideRuntime } from "@/engine/runners/pyodide";
import { runWebContainerNode } from "@/engine/runners/webcontainer-node";
import type { Incident, TestResult } from "@/lib/types";

export type RunnerRuntime = WebContainer | PyodideRuntime;

function isWebContainer(runtime: RunnerRuntime | null): runtime is WebContainer {
  return Boolean(runtime && "spawn" in runtime);
}

function isPyodide(runtime: RunnerRuntime | null): runtime is PyodideRuntime {
  return Boolean(runtime && "runPythonAsync" in runtime);
}

export function isRunnerAvailable(incident: Incident): boolean {
  return incident.execution.runner === "webcontainer-node" || incident.execution.runner === "pyodide";
}

export async function executeIncident(incident: Incident, runtime: RunnerRuntime | null): Promise<{ result: TestResult; runtime: RunnerRuntime }> {
  if (incident.execution.runner === "webcontainer-node") return runWebContainerNode(incident, isWebContainer(runtime) ? runtime : null);
  if (incident.execution.runner === "pyodide") return runPyodide(incident, isPyodide(runtime) ? runtime : null);
  throw new Error(`No verified runner is available for ${incident.execution.language}.`);
}
