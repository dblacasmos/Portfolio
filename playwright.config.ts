import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    reporter: [["list"], ["html", { outputFolder: "build-reports/playwright" }]],
    use: {
        baseURL: process.env.APP_URL ?? "http://localhost:5173/",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure"
    },
    outputDir: "artifacts",
});
