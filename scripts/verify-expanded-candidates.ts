import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pythonInventoryReservationCandidates } from "../lib/agents/candidates/python-inventory-reservation";
import { typescriptWebhookReplayCandidates } from "../lib/agents/candidates/typescript-webhook-replay";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const verificationRoot = join(repositoryRoot, ".candidate-verification");

function run(command: string, args: string[], cwd: string, extraEnvironment: Record<string, string> = {}): Promise<number | null> {
  return new Promise((resolveProcess, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnvironment },
      shell: false,
      windowsHide: true,
      stdio: "ignore",
    });
    child.on("error", reject);
    child.on("close", resolveProcess);
  });
}

function runVitest(cwd: string): Promise<number | null> {
  return process.platform === "win32"
    ? run("cmd.exe", ["/d", "/s", "/c", "npx vitest run"], cwd)
    : run("npx", ["vitest", "run"], cwd);
}

async function verifyPythonCandidates(): Promise<boolean> {
  const serviceRoot = join(repositoryRoot, "incidents", "python-inventory-reservation", "inventory-reservation");
  const results = await Promise.all(pythonInventoryReservationCandidates.map(async (candidate) => {
    const temporaryRoot = await mkdtemp(join(verificationRoot, `${candidate.id}-`));
    const temporaryServiceRoot = join(temporaryRoot, "inventory-reservation");
    try {
      await cp(serviceRoot, temporaryServiceRoot, { recursive: true });
      await writeFile(join(temporaryServiceRoot, candidate.targetFile), candidate.patch, "utf8");
      const pythonPath = [join(temporaryServiceRoot, "src"), process.env.PYTHONPATH].filter(Boolean).join(delimiter);
      const exitCode = await run("python", ["-m", "unittest", "discover", "tests"], temporaryServiceRoot, { PYTHONPATH: pythonPath });
      const expected = candidate.faultTag === "verified" ? 0 : 1;
      console.log(`${candidate.id}: ${exitCode === expected ? "MATCH" : "MISMATCH"}`);
      return exitCode === expected;
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }));
  return results.every(Boolean);
}

async function verifyTypeScriptCandidates(): Promise<boolean> {
  const serviceRoot = join(repositoryRoot, "incidents", "typescript-webhook-replay", "webhook-replay");
  const results = await Promise.all(typescriptWebhookReplayCandidates.map(async (candidate) => {
    const temporaryRoot = await mkdtemp(join(verificationRoot, `${candidate.id}-`));
    const temporaryServiceRoot = join(temporaryRoot, "webhook-replay");
    try {
      await cp(serviceRoot, temporaryServiceRoot, { recursive: true });
      await writeFile(join(temporaryServiceRoot, candidate.targetFile), candidate.patch, "utf8");
      const exitCode = await runVitest(temporaryServiceRoot);
      const expected = candidate.faultTag === "verified" ? 0 : 1;
      console.log(`${candidate.id}: ${exitCode === expected ? "MATCH" : "MISMATCH"}`);
      return exitCode === expected;
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }));
  return results.every(Boolean);
}

async function main(): Promise<void> {
  await mkdir(verificationRoot, { recursive: true });
  const passed = await Promise.all([verifyPythonCandidates(), verifyTypeScriptCandidates()]);
  if (passed.some((result) => !result)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
