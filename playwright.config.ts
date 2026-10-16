import { defineConfig, devices } from "@playwright/test";

// PR artifacts must contain fresh renders, even when baseline comparison fails.
const captureCurrent = process.env.PLAYWRIGHT_CAPTURE_CURRENT === "1";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: captureCurrent ? "line" : process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
    outputDir: captureCurrent ? "test-results-capture" : "test-results",
    // Baselines are rasterised per OS, so they are stored per platform. Without
    // this, updating snapshots on macOS or Windows silently overwrites the Linux
    // baselines that CI compares against.
    snapshotPathTemplate: captureCurrent
        ? "{testDir}/../theme-screenshots/{platform}/{arg}{ext}"
        : "{testDir}/screenshots/{platform}/{arg}{ext}",
    expect: {
        toHaveScreenshot: {
            // Per-pixel sensitivity. The default of 0.2 is far too loose for a
            // dark theme: a colour shift of 35/255 across a third of the page
            // still measured as "no difference", so a rewritten background went
            // undetected. Keep this tight and let the ratio below absorb noise.
            threshold: 0.05,
            // Font hinting differs slightly between a contributor's machine and
            // the CI runner. This budget covers that antialiasing without
            // hiding a real layout or colour change.
            maxDiffPixelRatio: 0.01
        }
    },
    use: {
        baseURL: "http://127.0.0.1:4173",
        colorScheme: "light",
        locale: "en-US",
        reducedMotion: "reduce",
        serviceWorkers: "block"
    },
    webServer: {
        command: "npm run dev -- --host 127.0.0.1 --port 4173",
        reuseExistingServer: !process.env.CI,
        url: "http://127.0.0.1:4173"
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
