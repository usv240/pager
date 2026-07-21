import type { Incident, TestResult } from "@/lib/types";

const runtimeIndexUrl = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

const progressEvent = "pager:webcontainer-progress";

function emitProgress(message: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<string>(progressEvent, { detail: message }));
  }
}

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
  const failureDetails = output.split(/\n={5,}\n(?:FAIL|ERROR): /).slice(1).map((block) => {
    const assertion = block.split("\n").find((line) => line.includes("AssertionError:"));
    return assertion?.replace(/^.*AssertionError:\s*/, "").trim() || "The assertion failed. Inspect the expected and received values in this test.";
  });
  let failureIndex = 0;
  const tests = output.split("\n").filter((line) => /\.\.\. (ok|FAIL|ERROR)$/.test(line.trim()));
  return {
    passed,
    summary: passed ? "The Python incident test suite passed. The alert is clear." : "The Python incident test suite found a remaining failure.",
    tests: tests.map((line, index) => {
      const testPassed = /\.\.\. ok$/.test(line.trim());
      return { name: line.trim() || `Test ${index + 1}`, passed: testPassed, detail: testPassed ? "Passed" : failureDetails[failureIndex++] ?? "Failed" };
    }),
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
  if (!runtime) emitProgress("Loading Python runtime (first run only)…");
  const pyodide = runtime ?? await loadRuntime();
  let output = "";
  pyodide.setStdout({ batched: (line) => { output += `${line}\n`; } });
  pyodide.setStderr({ batched: (line) => { output += `${line}\n`; } });
  setupFiles(pyodide, incident);
  emitProgress("Running the real acceptance suite…");
  try {
    await pyodide.runPythonAsync(`
import importlib
import os
import sys
import unittest
os.chdir("/")
if "/src" not in sys.path:
    sys.path.insert(0, "/src")
importlib.invalidate_caches()
for module_name, module in list(sys.modules.items()):
    module_path = getattr(module, "__file__", "") or ""
    if module_path.startswith("/src/") or module_path.startswith("/tests/"):
        del sys.modules[module_name]
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
