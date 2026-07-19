import type { Incident, TestResult } from "@/lib/types";

const runtimeIndexUrl = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

export interface PyodideRuntime {
  FS: { writeFile(path: string, content: string): void };
  runPython(code: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(options: { batched(line: string): void }): void;
  setStderr(options: { batched(line: string): void }): void;
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
  }
}

let runtimePromise: Promise<PyodideRuntime> | null = null;

function loadRuntime(): Promise<PyodideRuntime> {
  if (runtimePromise) return runtimePromise;
  runtimePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${runtimeIndexUrl}pyodide.js`;
    script.onload = () => window.loadPyodide ? window.loadPyodide({ indexURL: runtimeIndexUrl }).then(resolve, reject) : reject(new Error("Pyodide failed to initialize."));
    script.onerror = () => reject(new Error("Pyodide runtime could not load."));
    document.head.append(script);
  });
  return runtimePromise;
}

function resultFromOutput(output: string, passed: boolean): TestResult {
  const tests = output.split("\n").filter((line) => /\b(ok|FAIL|ERROR)\b/.test(line));
  return {
    passed,
    summary: passed ? "The Python incident test suite passed. The alert is clear." : "The Python incident test suite found a remaining failure.",
    tests: tests.map((line, index) => ({ name: line.trim() || `Test ${index + 1}`, passed: /\bok\b/.test(line), detail: /\bok\b/.test(line) ? "Passed" : "Failed" })),
  };
}

function setupFiles(pyodide: PyodideRuntime, incident: Incident): void {
  for (const file of incident.files) {
    const directory = file.path.split("/").slice(0, -1).join("/");
    if (directory) pyodide.runPython(`import os\nos.makedirs(${JSON.stringify(`/${directory}`)}, exist_ok=True)`);
    pyodide.FS.writeFile(`/${file.path}`, file.content);
  }
}

export async function runPyodide(incident: Incident, runtime: PyodideRuntime | null): Promise<{ result: TestResult; runtime: PyodideRuntime }> {
  const pyodide = runtime ?? await loadRuntime();
  let output = "";
  pyodide.setStdout({ batched: (line) => { output += `${line}\n`; } });
  pyodide.setStderr({ batched: (line) => { output += `${line}\n`; } });
  setupFiles(pyodide, incident);
  try {
    await pyodide.runPythonAsync(`
import os
import sys
import unittest
os.chdir("/")
sys.path.insert(0, "/src")
loader = unittest.defaultTestLoader
suite = loader.discover(${JSON.stringify(incident.execution.testCommand.at(-1) ?? "tests")})
result = unittest.TextTestRunner(verbosity=2).run(suite)
if not result.wasSuccessful():
    raise SystemExit(1)
`);
    return { result: resultFromOutput(output, true), runtime: pyodide };
  } catch {
    return { result: resultFromOutput(output, false), runtime: pyodide };
  }
}
