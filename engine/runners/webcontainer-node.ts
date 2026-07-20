import { WebContainer } from "@webcontainer/api";
import type { Incident, TestResult } from "@/lib/types";

const progressEvent = "pager:webcontainer-progress";

type WebContainerSession = {
  files: Map<string, string>;
  dependenciesInstalled: boolean;
};

const sessions = new WeakMap<WebContainer, WebContainerSession>();

function fileTree(files: Incident["files"]) {
  const tree: Record<string, unknown> = {};
  for (const file of files) {
    const parts = file.path.split("/");
    const filename = parts.pop();
    if (!filename) continue;
    let directory = tree;
    for (const part of parts) {
      const current = directory[part];
      directory[part] = current ?? { directory: {} };
      directory = (directory[part] as { directory: Record<string, unknown> }).directory;
    }
    directory[filename] = { file: { contents: file.content } };
  }
  return tree;
}

function resultFromOutput(output: string, passed: boolean): TestResult {
  const cleanOutput = output.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
  const lines = cleanOutput.split("\n");
  const testLineIndexes = lines.reduce<number[]>((indexes, line, index) => {
    if (line.includes("\u2713") || line.includes("\u00d7")) indexes.push(index);
    return indexes;
  }, []);
  return {
    passed,
    summary: passed ? "The incident test suite passed. The alert is clear." : "The incident test suite found a remaining failure.",
    tests: testLineIndexes.map((lineIndex, index) => {
      const line = lines[lineIndex] ?? "";
      const testPassed = !line.includes("\u00d7");
      const nextTestLineIndex = testLineIndexes[index + 1] ?? lines.length;
      const failureReason = lines.slice(lineIndex + 1, nextTestLineIndex).find((candidate) => candidate.trim().startsWith("\u2192"))?.trim().replace(/^\u2192\s*/, "");
      return { name: line.replace(/[\u2713\u00d7]/g, "").trim() || `Test ${index + 1}`, passed: testPassed, detail: testPassed ? "Passed" : failureReason || "The assertion failed. Inspect the expected and received values in this test." };
    }),
  };
}

function setupFailureResult(output: string): TestResult {
  const cleanOutput = output.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "").trim();
  return {
    passed: false,
    summary: "Environment setup failed. Service dependencies could not be installed.",
    tests: [{
      name: "Environment setup",
      passed: false,
      detail: cleanOutput || "The install command exited with a nonzero status.",
    }],
  };
}

function emitProgress(message: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<string>(progressEvent, { detail: message }));
  }
}

async function execute(webcontainer: WebContainer, command: string[]): Promise<{ exitCode: number; output: string }> {
  const process = await webcontainer.spawn(command[0], command.slice(1));
  let output = "";
  const outputDone = process.output.pipeTo(new WritableStream({ write(chunk) { output += chunk; } }));
  const exitCode = await process.exit;
  await outputDone;
  return { exitCode, output };
}

async function startSession(incident: Incident, runtime: WebContainer | null): Promise<{ webcontainer: WebContainer; session: WebContainerSession }> {
  if (!runtime) {
    emitProgress("Booting incident sandbox…");
    const webcontainer = await WebContainer.boot();
    await webcontainer.mount(fileTree(incident.files) as Parameters<typeof webcontainer.mount>[0]);
    const session = { files: new Map(incident.files.map((file) => [file.path, file.content])), dependenciesInstalled: false };
    sessions.set(webcontainer, session);
    return { webcontainer, session };
  }

  const existingSession = sessions.get(runtime);
  if (existingSession) return { webcontainer: runtime, session: existingSession };

  await runtime.mount(fileTree(incident.files) as Parameters<typeof runtime.mount>[0]);
  const session = { files: new Map(incident.files.map((file) => [file.path, file.content])), dependenciesInstalled: false };
  sessions.set(runtime, session);
  return { webcontainer: runtime, session };
}

async function writeChangedFiles(webcontainer: WebContainer, session: WebContainerSession, files: Incident["files"]): Promise<void> {
  const changedFiles = files.filter((file) => session.files.get(file.path) !== file.content);
  await Promise.all(changedFiles.map(async (file) => {
    await webcontainer.fs.writeFile(file.path, file.content);
    session.files.set(file.path, file.content);
  }));
}

export async function runWebContainerNode(incident: Incident, runtime: WebContainer | null): Promise<{ result: TestResult; runtime: WebContainer }> {
  const { webcontainer, session } = await startSession(incident, runtime);
  await writeChangedFiles(webcontainer, session, incident.files);
  if (incident.execution.installCommand && !session.dependenciesInstalled) {
    emitProgress("Installing service dependencies (first run only)…");
    const install = await execute(webcontainer, incident.execution.installCommand);
    if (install.exitCode !== 0) return { result: setupFailureResult(install.output), runtime: webcontainer };
    session.dependenciesInstalled = true;
  }
  emitProgress("Running the real acceptance suite…");
  const test = await execute(webcontainer, incident.execution.testCommand);
  return { result: resultFromOutput(test.output, test.exitCode === 0), runtime: webcontainer };
}
