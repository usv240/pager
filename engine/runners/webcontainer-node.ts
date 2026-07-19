import { WebContainer } from "@webcontainer/api";
import type { Incident, TestResult } from "@/lib/types";

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
  const testLines = cleanOutput.split("\n").filter((line) => line.includes("\u2713") || line.includes("\u00d7"));
  return {
    passed,
    summary: passed ? "The incident test suite passed. The alert is clear." : "The incident test suite found a remaining failure.",
    tests: testLines.map((line, index) => ({ name: line.replace(/[\u2713\u00d7]/g, "").trim() || `Test ${index + 1}`, passed: !line.includes("\u00d7"), detail: line.includes("\u00d7") ? "Failed" : "Passed" })),
  };
}

async function execute(webcontainer: WebContainer, command: string[]): Promise<{ exitCode: number; output: string }> {
  const process = await webcontainer.spawn(command[0], command.slice(1));
  let output = "";
  const outputDone = process.output.pipeTo(new WritableStream({ write(chunk) { output += chunk; } }));
  const exitCode = await process.exit;
  await outputDone;
  return { exitCode, output };
}

export async function runWebContainerNode(incident: Incident, runtime: WebContainer | null): Promise<{ result: TestResult; runtime: WebContainer }> {
  const webcontainer = runtime ?? await WebContainer.boot();
  if (!runtime) await webcontainer.mount(fileTree(incident.files) as Parameters<typeof webcontainer.mount>[0]);
  await Promise.all(incident.files.map((file) => webcontainer.fs.writeFile(file.path, file.content)));
  if (incident.execution.installCommand) await execute(webcontainer, incident.execution.installCommand);
  const test = await execute(webcontainer, incident.execution.testCommand);
  return { result: resultFromOutput(test.output, test.exitCode === 0), runtime: webcontainer };
}
