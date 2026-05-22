import { defineConfig } from "vitest/config";
import { ensureOutputDirs, outputPath, testPath, workspaceRoot } from "./paths";

ensureOutputDirs("agent-runner");

export default defineConfig({
  root: workspaceRoot("agent-runner"),
  test: {
    environment: "node",
    include: ["../test/agent-runner/**/*.test.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: outputPath("junit", "agent-runner", "results.xml"),
    },
    env: {
      TEST_OUTPUT_DIR: outputPath("artifacts", "agent-runner"),
      TEST_LOG_DIR: outputPath("logs", "agent-runner"),
      TEST_SCREENSHOT_DIR: outputPath("screenshots", "agent-runner"),
    },
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: outputPath("coverage", "agent-runner"),
      include: ["src/config.ts", "src/publisher.ts"],
      thresholds: {
        lines: 75,
        functions: 65,
        branches: 65,
        statements: 75,
      },
    },
  },
});
