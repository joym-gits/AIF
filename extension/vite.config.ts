import { defineConfig, Plugin } from "vite";
import { resolve } from "node:path";
import fs from "node:fs";

// Reads public/manifest.template.json, substitutes the backend host pattern,
// and writes manifest.json into dist/. Lets us target different deploys without
// committing prod URLs.
function manifestPlugin(): Plugin {
  return {
    name: "aif-manifest",
    closeBundle() {
      const template = fs.readFileSync(
        resolve(__dirname, "public/manifest.template.json"),
        "utf-8",
      );
      const backendHost = process.env.AIF_BACKEND_HOST ?? "http://localhost:3001/*";
      const rendered = template.replaceAll("{{BACKEND_HOST}}", backendHost);
      fs.writeFileSync(resolve(__dirname, "dist/manifest.json"), rendered);
    },
  };
}

export default defineConfig({
  plugins: [manifestPlugin()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
        popup: resolve(__dirname, "src/popup.ts"),
      },
      output: { entryFileNames: "[name].js" },
    },
  },
  publicDir: "public",
});
