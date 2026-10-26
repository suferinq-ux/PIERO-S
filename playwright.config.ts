import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright para flujos críticos.
 * Requiere `.env.local` configurado y `npm run dev` levantado (o lo levanta el
 * webServer automáticamente). Los flujos de venta, cierre de caja y
 * transferencia se implementan en sus fases (ver docs/ARQUITECTURA.md).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
