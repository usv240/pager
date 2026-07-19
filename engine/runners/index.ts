import type { WebContainer } from "@webcontainer/api";
import { runWebContainerNode } from "@/engine/runners/webcontainer-node";
import type { Incident, TestResult } from "@/lib/types";

export type RunnerRuntime = WebContainer;

export function isRunnerAvailable(incident: Incident): boolean {
  return incident.execution.runner === "webcontainer-node";
}

export async function executeIncident(incident: Incident, runtime: RunnerRuntime | null): Promise<{ result: TestResult; runtime: RunnerRuntime }> {
  if (incident.execution.runner === "webcontainer-node") return runWebContainerNode(incident, runtime);
  throw new Error(`No verified runner is available for ${incident.execution.language}.`);
}
