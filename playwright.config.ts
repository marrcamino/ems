import { defineConfig, devices } from "@playwright/test";

// Playwright doesn't read .env on its own; this picks up E2E_USERNAME and
// E2E_PASSWORD along with the database settings the dev server needs.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env — rely on variables already set in the shell.
}

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Starts `npm run dev` for the run, or uses the one you already have open.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
