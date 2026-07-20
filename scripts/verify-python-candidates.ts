import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pythonInvoiceQueueCandidates } from "../lib/agents/candidates/python-invoice-queue";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const serviceRoot = join(repositoryRoot, "incidents", "python-invoice-queue", "invoice-queue");
const verificationRoot = join(repositoryRoot, ".candidate-verification");

const expectedExitCodes: Record<string, 0 | 1> = {
  "normalize-invoice-id": 1,
  "sort-pending-invoices": 1,
  "deduplicate-pending-invoice": 0,
};

function runPython(cwd: string): Promise<{ exitCode: number | null; output: string }> {
  return new Promise((resolveProcess, reject) => {
    const pythonPath = [join(cwd, "src"), process.env.PYTHONPATH].filter(Boolean).join(delimiter);
    const child = spawn("python", ["-m", "unittest", "discover", "tests"], {
      cwd,
      env: { ...process.env, PYTHONPATH: pythonPath },
      shell: false,
      windowsHide: true,
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { output += chunk; });
    child.stderr.on("data", (chunk: string) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (exitCode) => resolveProcess({ exitCode, output }));
  });
}

async function verify(candidate: (typeof pythonInvoiceQueueCandidates)[number]): Promise<boolean> {
  const expectedExitCode = expectedExitCodes[candidate.id];
  const temporaryRoot = await mkdtemp(join(verificationRoot, `${candidate.id}-`));
  const temporaryServiceRoot = join(temporaryRoot, "invoice-queue");
  try {
    await cp(serviceRoot, temporaryServiceRoot, { recursive: true });
    await writeFile(join(temporaryServiceRoot, candidate.targetFile), candidate.patch, "utf8");
    const result = await runPython(temporaryServiceRoot);
    const passed = result.exitCode === expectedExitCode;
    console.log(`${candidate.id}: ${passed ? "MATCH" : "MISMATCH"} (expected ${expectedExitCode}, got ${result.exitCode ?? "null"})`);
    if (!passed) console.error(result.output.trim());
    return passed;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  await mkdir(verificationRoot, { recursive: true });
  const requestedIds = process.argv.slice(2);
  const candidates = requestedIds.length === 0
    ? pythonInvoiceQueueCandidates
    : pythonInvoiceQueueCandidates.filter((candidate) => requestedIds.includes(candidate.id));
  if (requestedIds.length > 0 && candidates.length !== requestedIds.length) {
    throw new Error("Unknown Python candidate ID.");
  }
  const results = await Promise.all(candidates.map(verify));
  if (results.some((passed) => !passed)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
