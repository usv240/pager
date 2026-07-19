import { WebContainer } from "@webcontainer/api";
import type { Incident, TestResult } from "@/lib/types";

function fileTree(files: Incident["files"]) {
  const tree: Record<string, unknown> = {};
  for (const file of files) {
    const pathParts = file.path.split("/");
    const filename = pathParts.pop();
    if (!filename) continue;
    let directory = tree;
    for (const part of pathParts) {
      const current = directory[part];
      directory[part] = current ?? { directory: {} };
      directory = (directory[part] as { directory: Record<string, unknown> }).directory;
    }
    directory[filename] = { file: { contents: file.content } };
  }
  return tree;
}

function resultFromOutput(output: string, passed: boolean): TestResult {
  const testLines = output.split("\n").filter((line) => line.includes("✓") || line.includes("×"));
  return {
    passed,
    summary: passed ? "The incident test suite passed. The alert is clear." : "The incident test suite found a remaining failure.",
    tests: testLines.map((line, index) => ({ name: line.replace(/[✓×]/g, "").trim() || `Test ${index + 1}`, passed: !line.includes("×"), detail: line.includes("×") ? "Failed" : "Passed" })),
  };
}

export async function runTests(incident: Incident, source: string, runtime: WebContainer | null): Promise<{ result: TestResult; runtime: WebContainer }> {
  const webcontainer = runtime ?? await WebContainer.boot();
  if (!runtime) await webcontainer.mount(fileTree(incident.files) as Parameters<typeof webcontainer.mount>[0]);
  await webcontainer.fs.writeFile(incident.activeFile, source);
  const install = await webcontainer.spawn("npm", ["install"]);
  await install.exit;
  const testProcess = await webcontainer.spawn("npm", ["test"]);
  let output = "";
  const outputDone = testProcess.output.pipeTo(new WritableStream({ write(chunk) { output += chunk; } }));
  const exitCode = await testProcess.exit;
  await outputDone;
  return { result: resultFromOutput(output, exitCode === 0), runtime: webcontainer };
}
