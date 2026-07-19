import type { Incident, TestResult } from "@/lib/types";
import { executeIncident, type RunnerRuntime } from "@/engine/runners";

export async function runTests(incident: Incident, runtime: RunnerRuntime | null): Promise<{ result: TestResult; runtime: RunnerRuntime }> {
  return executeIncident(incident, runtime);
}
