import { defineConfig } from "vitest/config";
import { ensureOutputDirs, outputPath, testPath, workspaceRoot } from "./paths";

ensureOutputDirs("extension");

export default defineConfig({
  root: workspaceRoot("extension"),
  test: {
    environment: "jsdom",
    include: ["../test/extension/**/*.test.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: outputPath("junit", "extension", "results.xml"),
    },
    env: {
      TEST_OUTPUT_DIR: outputPath("artifacts", "extension"),
      TEST_LOG_DIR: outputPath("logs", "extension"),
      TEST_SCREENSHOT_DIR: outputPath("screenshots", "extension"),
    },
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: outputPath("coverage", "extension"),
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 50,
        statements: 60,
      },
    },
  },
});
