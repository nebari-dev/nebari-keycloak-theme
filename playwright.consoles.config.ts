import { defineConfig, devices } from "@playwright/test";
import { KEYCLOAK_URL } from "./tests/a11y/environment";

/**
 * Everything that drives the Admin and Account consoles. They only run inside
 * Keycloak, so unlike playwright.config.ts this starts no dev server and
 * targets the compose loop, `docker compose up -d --build keycloak`, or
 * whatever KEYCLOAK_URL points at. See docs/development.md.
 *
 * - `a11y-admin` and `a11y-account`: the console accessibility suites
 *   (`npm run test:a11y:consoles`), run by CI.
 * - `docs-images`: recaptures the images in docs/theme-customization.md
 *   (`npm run docs:console-images`), run by hand.
 */
export default defineConfig({
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI
        ? [["line"], ["html", { open: "never", outputFolder: "playwright-report-consoles" }]]
        : "list",
    outputDir: "test-results-consoles",
    use: {
        ...devices["Desktop Chrome"],
        baseURL: KEYCLOAK_URL,
        colorScheme: "light",
        locale: "en-US",
        reducedMotion: "reduce",
        serviceWorkers: "block"
    },
    projects: [
        {
            // Creates a realm per theme and saves a signed-in session for each
            // console, so the suites below start signed in.
            name: "consoles-setup",
            testDir: "./tests/a11y",
            testMatch: "consoles.setup.ts"
        },
        {
            name: "a11y-admin",
            testDir: "./tests/a11y",
            testMatch: "admin.a11y.spec.ts",
            dependencies: ["consoles-setup"]
        },
        {
            name: "a11y-account",
            testDir: "./tests/a11y",
            testMatch: "account.a11y.spec.ts",
            dependencies: ["consoles-setup"]
        },
        {
            name: "docs-images",
            testDir: "./tests/console",
            testMatch: "*.capture.ts",
            use: { viewport: { width: 1440, height: 1000 } }
        }
    ]
});
