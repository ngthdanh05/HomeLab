import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/** monocart resolves paths from the working directory, so anchor them here. */
const COVERAGE_DIR = path.join(__dirname, "coverage");
const FRONTEND_DIR = path.join(__dirname, "..");

/**
 * Source-mapped paths look like "_N_E/src/hooks/useGovernance.ts"; libraries map to
 * "_N_E/src/…" too (wagmi, react-query), so keep only files that exist in our src/.
 */
function isAppSource(sourcePath: string) {
  const rel = sourcePath.replace(/\\/g, "/").replace(/^.*?_N_E\//, "");
  return rel.startsWith("src/") && !rel.endsWith(".css") && existsSync(path.join(FRONTEND_DIR, rel));
}

const PORT = Number(process.env.E2E_PORT ?? 3210);
const BASE_URL = `http://localhost:${PORT}`;
const CI = Boolean(process.env.CI);

/**
 * E2E suite: a production build of the frontend pointed at Anvil (chain 31337),
 * fresh contracts deployed by global-setup, one mock-MetaMask account per test.
 *
 *   npm run e2e            # build + run (needs Foundry: anvil, forge)
 *   E2E_SKIP_BUILD=1 npm run e2e   # reuse the last .next-e2e build
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  globalSetup: "./fixtures/global-setup.ts",
  // One chain shared by all tests (snapshot/revert per test) → run serially.
  fullyParallel: false,
  workers: 1,
  // DoD: no flaky tests, at most one retry.
  retries: 1,
  forbidOnly: CI,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [
    [CI ? "github" : "list"],
    ["html", { outputFolder: "./playwright-report", open: "never" }],
    [
      "monocart-reporter",
      {
        name: "MyHomeLab E2E",
        outputFile: path.join(COVERAGE_DIR, "report.html"),
        coverage: {
          name: "MyHomeLab E2E coverage",
          outputDir: COVERAGE_DIR,
          // App chunks only (skip Next/React runtime); with source maps this maps back to src/.
          entryFilter: (entry: { url: string }) => entry.url.includes("/_next/static/chunks/"),
          sourceFilter: isAppSource,
          reports: ["v8", "console-summary", "lcovonly", "json-summary"],
        },
      },
    ],
  ],
  use: {
    baseURL: BASE_URL,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.E2E_SKIP_BUILD
      ? `npm run start -- -p ${PORT}`
      : `npm run build && npm run start -- -p ${PORT}`,
    cwd: "..",
    url: BASE_URL,
    // Building takes a while; never reuse a server that may be built for Sepolia.
    timeout: 600_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NEXT_PUBLIC_CHAIN_ID: "31337",
      NEXT_DIST_DIR: ".next-e2e",
      E2E_SOURCEMAPS: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
