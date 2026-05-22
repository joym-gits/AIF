import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { ensureOutputDirs, outputPath, testPath, workspaceRoot } from "./paths";

ensureOutputDirs("reader");

export default defineConfig({
  root: workspaceRoot("reader"),
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["../test/reader/**/*.test.ts", "../test/reader/**/*.test.tsx"],
    setupFiles: [testPath("reader", "setup", "setup.ts")],
    reporters: ["default", "junit"],
    outputFile: {
      junit: outputPath("junit", "reader", "results.xml"),
    },
    env: {
      TEST_OUTPUT_DIR: outputPath("artifacts", "reader"),
      TEST_LOG_DIR: outputPath("logs", "reader"),
      TEST_SCREENSHOT_DIR: outputPath("screenshots", "reader"),
    },
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: outputPath("coverage", "reader"),
      include: ["src/lib/api.ts"],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});
