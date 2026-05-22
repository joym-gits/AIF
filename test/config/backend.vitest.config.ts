import { defineConfig } from "vitest/config";
import { ensureOutputDirs, outputPath, testPath, workspaceRoot } from "./paths";

ensureOutputDirs("backend");

export default defineConfig({
  root: workspaceRoot("backend"),
  test: {
    environment: "node",
    include: ["../test/backend/**/*.test.ts"],
    setupFiles: [testPath("backend", "setup", "env.ts")],
    reporters: ["default", "junit"],
    outputFile: {
      junit: outputPath("junit", "backend", "results.xml"),
    },
    env: {
      TEST_OUTPUT_DIR: outputPath("artifacts", "backend"),
      TEST_LOG_DIR: outputPath("logs", "backend"),
      TEST_SCREENSHOT_DIR: outputPath("screenshots", "backend"),
    },
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: outputPath("coverage", "backend"),
      include: [
        "src/app.ts",
        "src/lib/apiKeys.ts",
        "src/middleware/auth.ts",
        "src/services/feedFetcher.ts",
        "src/routes/auth.ts",
        "src/routes/publicFeed.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 60,
        statements: 80,
      },
    },
  },
});
