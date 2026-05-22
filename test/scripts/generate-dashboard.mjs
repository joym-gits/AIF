import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const testRoot = path.join(repoRoot, "test");
const outputRoot = path.join(testRoot, "test-output");
const junitRoot = path.join(outputRoot, "junit");
const coverageRoot = path.join(outputRoot, "coverage");
const dashboardPath = path.join(outputRoot, "index.html");
const workspaces = ["backend", "shared", "reader", "publisher", "extension", "agent-runner"];

fs.mkdirSync(outputRoot, { recursive: true });

function readFileIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : "";
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function percent(covered, total) {
  return total > 0 ? (covered / total) * 100 : 100;
}

function pctText(value) {
  return `${value.toFixed(1)}%`;
}

function statusClass(value) {
  if (value >= 85) return "good";
  if (value >= 70) return "warn";
  return "bad";
}

function parseJunit(workspace) {
  const file = path.join(junitRoot, workspace, "results.xml");
  const xml = readFileIfExists(file);
  if (!xml) {
    return { workspace, tests: 0, failures: 0, errors: 0, skipped: 0, time: 0, suites: [], cases: [], missing: true };
  }

  const root = xml.match(/<testsuites\b[^>]*>/)?.[0] ?? "";
  const suites = [...xml.matchAll(/<testsuite\b[^>]*>/g)].map((m) => ({
    name: attr(m[0], "name"),
    tests: toNumber(attr(m[0], "tests")),
    failures: toNumber(attr(m[0], "failures")),
    errors: toNumber(attr(m[0], "errors")),
    skipped: toNumber(attr(m[0], "skipped")),
    time: toNumber(attr(m[0], "time")),
  }));
  const cases = [...xml.matchAll(/<testcase\b[^>]*>/g)].map((m) => ({
    classname: attr(m[0], "classname"),
    name: attr(m[0], "name").replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&"),
    time: toNumber(attr(m[0], "time")),
  }));

  return {
    workspace,
    tests: toNumber(attr(root, "tests")) || suites.reduce((sum, s) => sum + s.tests, 0),
    failures: toNumber(attr(root, "failures")) || suites.reduce((sum, s) => sum + s.failures, 0),
    errors: toNumber(attr(root, "errors")) || suites.reduce((sum, s) => sum + s.errors, 0),
    skipped: suites.reduce((sum, s) => sum + s.skipped, 0),
    time: toNumber(attr(root, "time")) || suites.reduce((sum, s) => sum + s.time, 0),
    suites,
    cases,
    missing: false,
  };
}

function metricCounts(fileCoverage, metric) {
  const values = fileCoverage[metric] ?? {};
  let covered = 0;
  let total = 0;

  if (metric === "b") {
    for (const hits of Object.values(values)) {
      for (const hit of hits) {
        total += 1;
        if (hit > 0) covered += 1;
      }
    }
    return { covered, total };
  }

  for (const hit of Object.values(values)) {
    total += 1;
    if (hit > 0) covered += 1;
  }
  return { covered, total };
}

function parseCoverage(workspace) {
  const file = path.join(coverageRoot, workspace, "coverage-final.json");
  const raw = readFileIfExists(file);
  if (!raw) {
    return {
      workspace,
      missing: true,
      summary: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      files: [],
    };
  }

  const data = JSON.parse(raw);
  const totals = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 },
  };

  const files = Object.values(data).map((entry) => {
    const s = metricCounts(entry, "s");
    const b = metricCounts(entry, "b");
    const f = metricCounts(entry, "f");
    const linesCovered = new Set();
    const linesTotal = new Set();
    for (const [id, loc] of Object.entries(entry.statementMap ?? {})) {
      if (!loc?.start?.line) continue;
      linesTotal.add(loc.start.line);
      if ((entry.s?.[id] ?? 0) > 0) linesCovered.add(loc.start.line);
    }
    const l = { covered: linesCovered.size, total: linesTotal.size };

    totals.statements.covered += s.covered;
    totals.statements.total += s.total;
    totals.branches.covered += b.covered;
    totals.branches.total += b.total;
    totals.functions.covered += f.covered;
    totals.functions.total += f.total;
    totals.lines.covered += l.covered;
    totals.lines.total += l.total;

    return {
      path: path.relative(repoRoot, entry.path ?? "").replaceAll("\\", "/"),
      statements: percent(s.covered, s.total),
      branches: percent(b.covered, b.total),
      functions: percent(f.covered, f.total),
      lines: percent(l.covered, l.total),
    };
  });

  return {
    workspace,
    missing: false,
    summary: {
      statements: percent(totals.statements.covered, totals.statements.total),
      branches: percent(totals.branches.covered, totals.branches.total),
      functions: percent(totals.functions.covered, totals.functions.total),
      lines: percent(totals.lines.covered, totals.lines.total),
    },
    files: files.sort((a, b) => a.lines - b.lines),
  };
}

const junit = workspaces.map(parseJunit);
const coverage = workspaces.map(parseCoverage);
const totalTests = junit.reduce((sum, item) => sum + item.tests, 0);
const totalFailures = junit.reduce((sum, item) => sum + item.failures + item.errors, 0);
const totalSkipped = junit.reduce((sum, item) => sum + item.skipped, 0);
const totalTime = junit.reduce((sum, item) => sum + item.time, 0);
const avgLines = coverage.reduce((sum, item) => sum + item.summary.lines, 0) / Math.max(coverage.length, 1);
const generatedAt = new Date().toLocaleString();

function metricPill(label, value) {
  return `<span class="metric ${statusClass(value)}"><span>${label}</span><strong>${pctText(value)}</strong></span>`;
}

function workspaceCard(name) {
  const j = junit.find((item) => item.workspace === name);
  const c = coverage.find((item) => item.workspace === name);
  const passed = Math.max(0, j.tests - j.failures - j.errors - j.skipped);
  const detailHref = `coverage/${name}/index.html`;

  return `
    <section class="workspace-card">
      <div class="workspace-head">
        <div>
          <h2>${escapeHtml(name)}</h2>
          <p>${j.missing ? "No JUnit report found" : `${passed}/${j.tests} passing tests`} · ${c.missing ? "No coverage report found" : "Coverage available"}</p>
        </div>
        <a class="coverage-link" href="${detailHref}">Coverage details</a>
      </div>
      <div class="test-counts">
        <div><strong>${j.tests}</strong><span>Total</span></div>
        <div><strong>${passed}</strong><span>Passed</span></div>
        <div><strong>${j.failures + j.errors}</strong><span>Failed</span></div>
        <div><strong>${j.skipped}</strong><span>Skipped</span></div>
      </div>
      <div class="metrics">
        ${metricPill("Lines", c.summary.lines)}
        ${metricPill("Statements", c.summary.statements)}
        ${metricPill("Branches", c.summary.branches)}
        ${metricPill("Functions", c.summary.functions)}
      </div>
      <details>
        <summary>Show test cases and lowest-covered files</summary>
        <div class="details-grid">
          <div>
            <h3>Test Cases</h3>
            <ul class="case-list">
              ${j.cases
                .map((test) => `<li><span>${escapeHtml(test.name)}</span><em>${test.time.toFixed(3)}s</em></li>`)
                .join("") || "<li>No test case data.</li>"}
            </ul>
          </div>
          <div>
            <h3>Coverage Focus</h3>
            <ul class="file-list">
              ${c.files
                .slice(0, 6)
                .map(
                  (file) =>
                    `<li><span>${escapeHtml(file.path)}</span><em class="${statusClass(file.lines)}">${pctText(file.lines)}</em></li>`,
                )
                .join("") || "<li>No coverage file data.</li>"}
            </ul>
          </div>
        </div>
      </details>
    </section>
  `;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AIF Test Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f1117;
      --panel: #171b24;
      --panel-soft: #1d2330;
      --line: #2a3342;
      --text: #eef2f8;
      --muted: #95a3b8;
      --good: #36c275;
      --warn: #e5b23f;
      --bad: #ef5d5d;
      --brand: #7c8cff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    main { width: min(1320px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 44px; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; margin-bottom: 22px; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 30px; letter-spacing: 0; }
    header p, .workspace-head p { color: var(--muted); }
    .summary {
      display: grid;
      grid-template-columns: repeat(5, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .summary-card, .workspace-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .summary-card { padding: 16px; }
    .summary-card span { color: var(--muted); display: block; font-size: 12px; text-transform: uppercase; }
    .summary-card strong { display: block; margin-top: 6px; font-size: 28px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .workspace-card { padding: 18px; }
    .workspace-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .workspace-head h2 { font-size: 20px; text-transform: capitalize; }
    .coverage-link {
      color: #ffffff;
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 7px 10px;
      text-decoration: none;
      white-space: nowrap;
      font-size: 13px;
    }
    .test-counts {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 16px 0;
    }
    .test-counts div {
      background: var(--panel-soft);
      border-radius: 6px;
      padding: 10px;
      min-width: 0;
    }
    .test-counts strong { display: block; font-size: 22px; }
    .test-counts span { color: var(--muted); font-size: 12px; }
    .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .metric {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-radius: 6px;
      padding: 9px 10px;
      background: var(--panel-soft);
      border-left: 4px solid var(--line);
    }
    .metric span { color: var(--muted); }
    .good { border-color: var(--good); color: var(--good); }
    .warn { border-color: var(--warn); color: var(--warn); }
    .bad { border-color: var(--bad); color: var(--bad); }
    details { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 12px; }
    summary { cursor: pointer; color: var(--brand); }
    .details-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-top: 12px; }
    h3 { font-size: 13px; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; }
    ul { list-style: none; padding: 0; margin: 0; }
    li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 7px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 13px;
    }
    li span { overflow-wrap: anywhere; }
    li em { color: var(--muted); font-style: normal; white-space: nowrap; }
    footer { color: var(--muted); margin-top: 20px; font-size: 13px; }
    @media (max-width: 920px) {
      header { display: block; }
      header p { margin-top: 8px; }
      .summary, .grid, .details-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>AIF Test Dashboard</h1>
        <p>One-screen view of test execution and coverage across all workspaces.</p>
      </div>
      <p>Generated ${escapeHtml(generatedAt)}</p>
    </header>

    <section class="summary">
      <div class="summary-card"><span>Total tests</span><strong>${totalTests}</strong></div>
      <div class="summary-card"><span>Failures</span><strong class="${totalFailures === 0 ? "good" : "bad"}">${totalFailures}</strong></div>
      <div class="summary-card"><span>Skipped</span><strong>${totalSkipped}</strong></div>
      <div class="summary-card"><span>Runtime</span><strong>${totalTime.toFixed(2)}s</strong></div>
      <div class="summary-card"><span>Avg line coverage</span><strong class="${statusClass(avgLines)}">${pctText(avgLines)}</strong></div>
    </section>

    <section class="grid">
      ${workspaces.map(workspaceCard).join("")}
    </section>

    <footer>
      Source: <code>test/test-output/junit</code> and <code>test/test-output/coverage</code>.
      Regenerate with <code>npm run test:report</code>.
    </footer>
  </main>
</body>
</html>`;

fs.writeFileSync(dashboardPath, html);
console.log(`Test dashboard written to ${dashboardPath}`);
