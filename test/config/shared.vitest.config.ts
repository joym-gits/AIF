import { defineConfig } from "vitest/config";
import { ensureOutputDirs, outputPath, testPath, workspaceRoot } from "./paths";

ensureOutputDirs("shared");

export default defineConfig({
  root: workspaceRoot("shared"),
  test: {
    environment: "node",
    include: ["../test/shared/**/*.test.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: outputPath("junit", "shared", "results.xml"),
    },
    env: {
      TEST_OUTPUT_DIR: outputPath("artifacts", "shared"),
      TEST_LOG_DIR: outputPath("logs", "shared"),
      TEST_SCREENSHOT_DIR: outputPath("screenshots", "shared"),
    },
    coverage: {
      provider: "v8",
      reportsDirectory: outputPath("coverage", "shared"),
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
