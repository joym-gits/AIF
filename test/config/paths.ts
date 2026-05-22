import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const testOutputRoot = path.join(repoRoot, "test", "test-output");

export function workspaceRoot(name: string): string {
  return path.join(repoRoot, name);
}

export function testPath(...parts: string[]): string {
  return path.join(repoRoot, "test", ...parts);
}

export function outputPath(...parts: string[]): string {
  return path.join(testOutputRoot, ...parts);
}

export function ensureOutputDirs(workspace: string): void {
  for (const kind of ["artifacts", "coverage", "junit", "logs", "screenshots"]) {
    fs.mkdirSync(path.join(testOutputRoot, kind, workspace), { recursive: true });
  }
}
