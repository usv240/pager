import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pythonInventoryReservationCandidates } from "../lib/agents/candidates/python-inventory-reservation";
import { pythonInvoiceQueueCandidates } from "../lib/agents/candidates/python-invoice-queue";
import { pythonSettlementReplayCandidates } from "../lib/agents/candidates/python-settlement-replay";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const verificationRoot = join(repositoryRoot, ".candidate-verification");

const labs = [
  { id: "easy-invoice-queue", directory: "python-invoice-queue", service: "invoice-queue", candidates: pythonInvoiceQueueCandidates },
  { id: "medium-inventory-reservation", directory: "python-inventory-reservation", service: "inventory-reservation", candidates: pythonInventoryReservationCandidates },
  { id: "advanced-settlement-replay", directory: "python-settlement-replay", service: "settlement-replay", candidates: pythonSettlementReplayCandidates },
] as const;

function runPython(cwd: string, pythonPath: string): Promise<number | null> {
  return new Promise((resolveProcess, reject) => {
    const child = spawn("python", ["-m", "unittest", "discover", "tests"], {
      cwd,
      env: { ...process.env, PYTHONPATH: [pythonPath, process.env.PYTHONPATH].filter(Boolean).join(delimiter) },
      shell: false,
      windowsHide: true,
      stdio: "ignore",
    });
    child.on("error", reject);
    child.on("close", resolveProcess);
  });
}

async function verifyLab(lab: (typeof labs)[number]): Promise<boolean> {
  const serviceRoot = join(repositoryRoot, "incidents", lab.directory, lab.service);
  const results = await Promise.all(lab.candidates.map(async (candidate) => {
    const temporaryRoot = await mkdtemp(join(verificationRoot, `${lab.id}-${candidate.id}-`));
    const temporaryServiceRoot = join(temporaryRoot, lab.service);
    try {
      await cp(serviceRoot, temporaryServiceRoot, { recursive: true });
      await writeFile(join(temporaryServiceRoot, candidate.targetFile), candidate.patch, "utf8");
      const exitCode = await runPython(temporaryServiceRoot, join(temporaryServiceRoot, "src"));
      const expected = candidate.faultTag === "verified" ? 0 : 1;
      const passed = exitCode === expected;
      console.log(`${lab.id}/${candidate.id}: ${passed ? "MATCH" : "MISMATCH"}`);
      return passed;
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }));
  return results.every(Boolean);
}

async function main(): Promise<void> {
  await mkdir(verificationRoot, { recursive: true });
  const results = await Promise.all(labs.map(verifyLab));
  if (results.some((passed) => !passed)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});