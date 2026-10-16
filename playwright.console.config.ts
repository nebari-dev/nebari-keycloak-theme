import { defineConfig, devices } from "@playwright/test";

/**
 * Captures the Admin Console images in docs/theme-customization.md. The
 * consoles need a real Keycloak, so this runs against the compose loop rather
 * than the dev server, and it is not part of CI: `npm run docs:console-images`
 * after `docker compose up -d --build keycloak`.
 */
export default defineConfig({
    testDir: "./tests/console",
    testMatch: "*.capture.ts",
    workers: 1,
    reporter: "list",
    outputDir: "test-results-console",
    use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.KEYCLOAK_URL ?? "http://localhost:8080",
        colorScheme: "light",
        locale: "en-US",
        reducedMotion: "reduce",
        viewport: { width: 1440, height: 1000 }
    }
});
