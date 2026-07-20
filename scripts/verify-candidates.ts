import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { checkout2pmCandidates } from "../lib/agents/candidates/checkout-2pm";
import type { FaultTag } from "../lib/types";

interface AuthoredFixCandidate {
  id: string;
  title: string;
  rationale: string;
  faultTag: FaultTag;
  targetFile: string;
  patch: string;
}

const expectedCandidateIds = [
  "handle-confirmation-failure",
  "send-clearwater-idempotency-key",
  "claim-order-before-charging",
] as const;
const concurrencyTest = "tests/concurrency.test.ts";
const observationTest = "tests/candidate-observation.test.ts";
const childTimeoutMs = 120_000;

interface ExpectedOutcome {
  faultTag: AuthoredFixCandidate["faultTag"];
  testExitCode: 0 | 1;
  outcomes: string[];
  chargeCount: number;
  finalStatus: string;
  failedFiles: string[];
}

const expectedOutcomes: Record<(typeof expectedCandidateIds)[number], ExpectedOutcome> = {
  "handle-confirmation-failure": {
    faultTag: "symptom-not-cause",
    testExitCode: 1,
    outcomes: ["fulfilled", "fulfilled"],
    chargeCount: 2,
    finalStatus: "paid",
    failedFiles: [concurrencyTest],
  },
  "send-clearwater-idempotency-key": {
    faultTag: "partial-fix",
    testExitCode: 1,
    outcomes: ["fulfilled", "rejected:PAYMENT_GATEWAY_ERROR"],
    chargeCount: 2,
    finalStatus: "paid",
    failedFiles: [concurrencyTest],
  },
  "claim-order-before-charging": {
    faultTag: "verified",
    testExitCode: 0,
    outcomes: ["fulfilled", "fulfilled"],
    chargeCount: 1,
    finalStatus: "paid",
    failedFiles: [],
  },
};

function expectedOutcomeFor(candidateId: string): ExpectedOutcome {
  if (!expectedCandidateIds.some((expectedId) => expectedId === candidateId)) {
    throw new Error(`Unexpected candidate ID ${candidateId}.`);
  }
  return expectedOutcomes[candidateId as (typeof expectedCandidateIds)[number]];
}

interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

interface VitestAssertionResult {
  fullName: string;
  status: string;
}

interface VitestFileResult {
  name: string;
  status: string;
  assertionResults: VitestAssertionResult[];
}

interface VitestReport {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults: VitestFileResult[];
}

interface CheckoutObservation {
  outcomes: string[];
  chargeCount: number;
  finalStatus: string | null;
}

interface VerificationResult {
  candidateId: string;
  passed: boolean;
  errors: string[];
  expected: ExpectedOutcome;
  observation?: CheckoutObservation;
  failedFiles: string[];
  ordinaryPassed: number;
  ordinaryTotal: number;
  totalTests: number;
  durationMs: number;
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const serviceRoot = join(repositoryRoot, "incidents", "checkout-2pm", "checkout-service");
const verificationRoot = join(repositoryRoot, ".candidate-verification");

function normalizePath(value: string): string {
  return value.split(sep).join("/");
}

function formatList(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number") throw new Error(`Vitest report field ${key} is not a number.`);
  return value;
}

function parseVitestReport(value: unknown): VitestReport {
  if (!isRecord(value) || !Array.isArray(value.testResults)) {
    throw new Error("Vitest report is missing testResults.");
  }

  const testResults = value.testResults.map((entry, fileIndex): VitestFileResult => {
    if (!isRecord(entry) || typeof entry.name !== "string" || typeof entry.status !== "string") {
      throw new Error(`Vitest file result ${fileIndex} is malformed.`);
    }
    if (!Array.isArray(entry.assertionResults)) {
      throw new Error(`Vitest file result ${entry.name} is missing assertionResults.`);
    }
    const assertionResults = entry.assertionResults.map(
      (assertion, assertionIndex): VitestAssertionResult => {
        if (
          !isRecord(assertion) ||
          typeof assertion.fullName !== "string" ||
          typeof assertion.status !== "string"
        ) {
          throw new Error(`Vitest assertion ${assertionIndex} in ${entry.name} is malformed.`);
        }
        return { fullName: assertion.fullName, status: assertion.status };
      },
    );
    return { name: entry.name, status: entry.status, assertionResults };
  });

  return {
    numTotalTestSuites: readNumber(value, "numTotalTestSuites"),
    numPassedTestSuites: readNumber(value, "numPassedTestSuites"),
    numFailedTestSuites: readNumber(value, "numFailedTestSuites"),
    numTotalTests: readNumber(value, "numTotalTests"),
    numPassedTests: readNumber(value, "numPassedTests"),
    numFailedTests: readNumber(value, "numFailedTests"),
    testResults,
  };
}

function parseObservation(value: unknown): CheckoutObservation {
  if (!isRecord(value) || !Array.isArray(value.outcomes)) {
    throw new Error("Candidate observation is malformed.");
  }
  if (!value.outcomes.every((outcome) => typeof outcome === "string")) {
    throw new Error("Candidate observation outcomes are malformed.");
  }
  if (typeof value.chargeCount !== "number") {
    throw new Error("Candidate observation chargeCount is malformed.");
  }
  if (value.finalStatus !== null && typeof value.finalStatus !== "string") {
    throw new Error("Candidate observation finalStatus is malformed.");
  }
  return {
    outcomes: value.outcomes,
    chargeCount: value.chargeCount,
    finalStatus: value.finalStatus,
  };
}

async function runProcess(
  command: string,
  args: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<ProcessResult> {
  const startedAt = performance.now();

  return new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(command, args, {
      cwd,
      env: environment,
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, childTimeoutMs);

    child.on("error", (error) => {
      clearTimeout(timeout);
      rejectProcess(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolveProcess({
        exitCode,
        stdout,
        stderr,
        durationMs: performance.now() - startedAt,
        timedOut,
      });
    });
  });
}

async function npmInvocation(): Promise<{ command: string; argsPrefix: string[] }> {
  if (process.platform !== "win32") return { command: "npm", argsPrefix: [] };

  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) {
        return { command: process.execPath, argsPrefix: [candidate] };
      }
    } catch {
      continue;
    }
  }

  throw new Error("Could not locate npm-cli.js for shell-free execution on Windows.");
}

function printProcessOutput(label: string, result: ProcessResult): void {
  console.log(`${label} exit: ${result.exitCode ?? "null"} (${Math.round(result.durationMs)} ms)`);
  if (result.stdout.trim()) {
    console.log(`${label} stdout:`);
    console.log(result.stdout.trimEnd());
  }
  if (result.stderr.trim()) {
    console.log(`${label} stderr:`);
    console.log(result.stderr.trimEnd());
  }
}

async function validateArtifacts(): Promise<void> {
  if (checkout2pmCandidates.length !== expectedCandidateIds.length) {
    throw new Error(
      `Expected ${expectedCandidateIds.length} candidates, found ${checkout2pmCandidates.length}.`,
    );
  }

  const ids = checkout2pmCandidates.map((candidate) => candidate.id);
  if (!arraysEqual(ids, expectedCandidateIds)) {
    throw new Error(`Candidate IDs/order mismatch: ${ids.join(", ")}.`);
  }
  if (new Set(ids).size !== ids.length) throw new Error("Candidate IDs must be unique.");

  for (const candidate of checkout2pmCandidates) {
    const expected = expectedOutcomeFor(candidate.id);
    if (candidate.faultTag !== expected.faultTag) {
      throw new Error(
        `${candidate.id} has faultTag ${candidate.faultTag}; expected ${expected.faultTag}.`,
      );
    }
    if (isAbsolute(candidate.targetFile)) {
      throw new Error(`${candidate.id} targetFile must be relative.`);
    }

    const resolvedTarget = resolve(serviceRoot, candidate.targetFile);
    const targetRelative = relative(serviceRoot, resolvedTarget);
    if (
      targetRelative === "" ||
      targetRelative === ".." ||
      targetRelative.startsWith(`..${sep}`) ||
      isAbsolute(targetRelative)
    ) {
      throw new Error(`${candidate.id} targetFile escapes the service root.`);
    }
    const targetStats = await stat(resolvedTarget);
    if (!targetStats.isFile()) throw new Error(`${candidate.id} targetFile is not a file.`);
    if (
      !candidate.patch.includes("export class CheckoutService") ||
      !candidate.patch.includes("async processCheckout")
    ) {
      throw new Error(`${candidate.id} patch is not a complete CheckoutService source file.`);
    }
  }
}

function observationSource(): string {
  return `import { writeFileSync } from "node:fs";
import { expect, test } from "vitest";
import { ClearwaterPayments, getChargesForReference } from "../src/gateway/clearwater-payments.js";
import { OrderRepository } from "../src/repos/order-repository.js";
import { CheckoutService } from "../src/services/checkout-service.js";
import { Logger } from "../src/utils/logger.js";
import { createPendingPaymentOrder } from "../src/utils/fixtures.js";

test("records candidate checkout observation", async () => {
  const orders = new OrderRepository();
  const order = createPendingPaymentOrder(orders);
  const service = new CheckoutService(orders, new ClearwaterPayments(), new Logger());
  const results = await Promise.allSettled([
    service.processCheckout(order.id),
    service.processCheckout(order.id),
  ]);
  const outcomes = results.map((result) =>
    result.status === "fulfilled"
      ? "fulfilled"
      : \`rejected:\${(result.reason as { code?: string }).code ?? "UNKNOWN"}\`,
  );
  const outputPath = process.env.CANDIDATE_OBSERVATION_PATH;
  expect(outputPath).toBeTruthy();
  writeFileSync(
    outputPath!,
    JSON.stringify({
      outcomes,
      chargeCount: getChargesForReference(order.paymentReference).length,
      finalStatus: orders.findById(order.id)?.status ?? null,
    }),
    "utf8",
  );
});
`;
}

function collectReportFacts(
  report: VitestReport,
  temporaryServiceRoot: string,
): { failedFiles: string[]; ordinaryPassed: number; ordinaryTotal: number; probePassed: boolean } {
  const normalizedResults = report.testResults.map((result) => ({
    ...result,
    relativeName: normalizePath(relative(temporaryServiceRoot, result.name)),
  }));
  const failedFiles = normalizedResults
    .filter((result) => result.status === "failed")
    .map((result) => result.relativeName)
    .sort();
  const ordinaryAssertions = normalizedResults
    .filter(
      (result) => result.relativeName !== concurrencyTest && result.relativeName !== observationTest,
    )
    .flatMap((result) => result.assertionResults);
  const probe = normalizedResults.find((result) => result.relativeName === observationTest);

  return {
    failedFiles,
    ordinaryPassed: ordinaryAssertions.filter((assertion) => assertion.status === "passed").length,
    ordinaryTotal: ordinaryAssertions.length,
    probePassed:
      probe !== undefined &&
      probe.status === "passed" &&
      probe.assertionResults.length === 1 &&
      probe.assertionResults[0]?.status === "passed",
  };
}

async function verifyCandidate(candidate: (typeof checkout2pmCandidates)[number]): Promise<VerificationResult> {
  const expected = expectedOutcomeFor(candidate.id);
  await mkdir(verificationRoot, { recursive: true });
  const temporaryRoot = await mkdtemp(join(verificationRoot, `${candidate.id}-`));
  const temporaryServiceRoot = join(temporaryRoot, "checkout-service");
  const reportPath = join(temporaryRoot, "vitest-report.json");
  const observationPath = join(temporaryRoot, "checkout-observation.json");
  const startedAt = performance.now();
  const errors: string[] = [];
  let observation: CheckoutObservation | undefined;
  let failedFiles: string[] = [];
  let ordinaryPassed = 0;
  let ordinaryTotal = 0;
  let totalTests = 0;

  console.log(`\n=== ${candidate.id} ===`);
  console.log(`Expected fault tag: ${expected.faultTag}`);

  try {
    await cp(serviceRoot, temporaryServiceRoot, {
      recursive: true,
      filter: (source) => {
        const name = normalizePath(relative(serviceRoot, source));
        return !(
          name === "node_modules" ||
          name.startsWith("node_modules/") ||
          name === "coverage" ||
          name.startsWith("coverage/") ||
          name === "dist" ||
          name.startsWith("dist/") ||
          name.endsWith("vitest-report.json")
        );
      },
    });
    await writeFile(resolve(temporaryServiceRoot, candidate.targetFile), candidate.patch, "utf8");
    await writeFile(join(temporaryServiceRoot, observationTest), observationSource(), "utf8");

    const npm = await npmInvocation();
    const installResult = await runProcess(
      npm.command,
      [...npm.argsPrefix, "ci", "--no-audit", "--no-fund"],
      temporaryServiceRoot,
    );
    printProcessOutput("npm ci", installResult);
    if (installResult.timedOut) throw new Error("npm ci timed out.");
    if (installResult.exitCode !== 0) throw new Error(`npm ci exited ${installResult.exitCode}.`);

    const testResult = await runProcess(
      npm.command,
      [...npm.argsPrefix, "test", "--", "--reporter=json", `--outputFile=${reportPath}`],
      temporaryServiceRoot,
      { ...process.env, CANDIDATE_OBSERVATION_PATH: observationPath },
    );
    printProcessOutput("npm test", testResult);
    if (testResult.timedOut) errors.push("npm test timed out.");
    if (testResult.exitCode !== expected.testExitCode) {
      errors.push(
        `npm test exit was ${testResult.exitCode ?? "null"}; expected ${expected.testExitCode}.`,
      );
    }

    const report = parseVitestReport(JSON.parse(await readFile(reportPath, "utf8")) as unknown);
    totalTests = report.numTotalTests;
    const facts = collectReportFacts(report, temporaryServiceRoot);
    failedFiles = facts.failedFiles;
    ordinaryPassed = facts.ordinaryPassed;
    ordinaryTotal = facts.ordinaryTotal;

    if (!arraysEqual(failedFiles, expected.failedFiles)) {
      errors.push(
        `Failed files were ${formatList(failedFiles)}; expected ${formatList(expected.failedFiles)}.`,
      );
    }
    if (ordinaryTotal === 0 || ordinaryPassed !== ordinaryTotal) {
      errors.push(`Ordinary tests passed ${ordinaryPassed}/${ordinaryTotal}; expected all green.`);
    }
    if (!facts.probePassed) errors.push("Verifier observation test did not pass exactly once.");
    if (
      report.numTotalTests !== report.numPassedTests + report.numFailedTests ||
      report.numTotalTestSuites !== report.numPassedTestSuites + report.numFailedTestSuites
    ) {
      errors.push("Vitest report totals are inconsistent or contain skipped suites/tests.");
    }

    observation = parseObservation(JSON.parse(await readFile(observationPath, "utf8")) as unknown);
    if (!arraysEqual(observation.outcomes, expected.outcomes)) {
      errors.push(
        `Settled outcomes were ${JSON.stringify(observation.outcomes)}; expected ${JSON.stringify(expected.outcomes)}.`,
      );
    }
    if (observation.chargeCount !== expected.chargeCount) {
      errors.push(
        `Charge count was ${observation.chargeCount}; expected ${expected.chargeCount}.`,
      );
    }
    if (observation.finalStatus !== expected.finalStatus) {
      errors.push(
        `Final status was ${observation.finalStatus ?? "null"}; expected ${expected.finalStatus}.`,
      );
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    try {
      await rm(temporaryRoot, { recursive: true, force: true });
    } catch (error) {
      errors.push(`Temporary cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const result: VerificationResult = {
    candidateId: candidate.id,
    passed: errors.length === 0,
    errors,
    expected,
    observation,
    failedFiles,
    ordinaryPassed,
    ordinaryTotal,
    totalTests,
    durationMs: performance.now() - startedAt,
  };

  console.log(`Observed failed files: ${formatList(result.failedFiles)}`);
  console.log(`Ordinary tests: ${result.ordinaryPassed}/${result.ordinaryTotal} passed`);
  console.log(`Total tests including verifier observation: ${result.totalTests}`);
  if (result.observation) {
    console.log(`Settled outcomes: ${JSON.stringify(result.observation.outcomes)}`);
    console.log(`Clearwater charges: ${result.observation.chargeCount}`);
    console.log(`Final order status: ${result.observation.finalStatus ?? "null"}`);
  }
  console.log(`Verification: ${result.passed ? "MATCH" : "MISMATCH"}`);
  for (const error of result.errors) console.error(`  - ${error}`);

  return result;
}

async function main(): Promise<void> {
  console.log("Checkout 2 PM candidate verification");
  console.log(`Service source: ${serviceRoot}`);
  await validateArtifacts();

  const requestedCandidateIds = process.argv.slice(2);
  const candidates =
    requestedCandidateIds.length === 0
      ? checkout2pmCandidates
      : checkout2pmCandidates.filter((candidate) => requestedCandidateIds.includes(candidate.id));
  if (requestedCandidateIds.length > 0 && candidates.length !== requestedCandidateIds.length) {
    throw new Error(`Unknown candidate ID. Expected one of: ${expectedCandidateIds.join(", ")}.`);
  }

  const results: VerificationResult[] = [];
  for (const candidate of candidates) {
    results.push(await verifyCandidate(candidate));
  }

  console.log("\n=== Summary ===");
  for (const result of results) {
    console.log(
      `${result.candidateId}: ${result.passed ? "MATCH" : "MISMATCH"} (${Math.round(result.durationMs)} ms)`,
    );
  }

  if (results.some((result) => !result.passed)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
