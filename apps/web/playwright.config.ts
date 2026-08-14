import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  webServer: [
    {
      command: "pnpm --filter @stream/api start:prod",
      url: "http://localhost:4000/api/v1/health/ready",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @stream/web start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
