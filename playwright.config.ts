import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:8080";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 300000,
  use: {
    baseURL,
    trace: "on-first-retry",
    actionTimeout: 30000,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
    reuseExistingServer: true,
    timeout: 120000,
  },
});
