import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { ensureOutputDirs, outputPath, testPath, workspaceRoot } from "./paths";

ensureOutputDirs("publisher");

export default defineConfig({
  root: workspaceRoot("publisher"),
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["../test/publisher/**/*.test.ts", "../test/publisher/**/*.test.tsx"],
    setupFiles: [testPath("publisher", "setup", "setup.ts")],
    reporters: ["default", "junit"],
    outputFile: {
      junit: outputPath("junit", "publisher", "results.xml"),
    },
    env: {
      TEST_OUTPUT_DIR: outputPath("artifacts", "publisher"),
      TEST_LOG_DIR: outputPath("logs", "publisher"),
      TEST_SCREENSHOT_DIR: outputPath("screenshots", "publisher"),
    },
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: outputPath("coverage", "publisher"),
      include: ["src/lib/api.ts", "src/pages/Dashboard.tsx"],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 50,
        statements: 60,
      },
    },
  },
});
