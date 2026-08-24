import { spawnSync } from "node:child_process";
import {
    copyFileSync,
    existsSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import JSZip from "jszip";

const themes = ["nebari", "openteams-collab"];
const generatedJars = [
    "keycloak-theme-for-kc-all-other-versions.jar",
    "keycloak-theme-for-kc-22-to-25.jar"
];
const outputDirectory = "dist_keycloak";
const generatedThemeNamesFile = "src/kc.gen.tsx";
const stagingDirectory = mkdtempSync(join(tmpdir(), "keycloak-theme-jars-"));
const originalGeneratedThemeNames = readFileSync(generatedThemeNamesFile);
const executableSuffix = process.platform === "win32" ? ".cmd" : "";

function run(command, args, environment = {}) {
    const result = spawnSync(`${command}${executableSuffix}`, args, {
        stdio: "inherit",
        env: { ...process.env, ...environment }
    });

    if (result.error !== undefined) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} exited with code ${result.status}`);
    }
}

async function assertIsolatedThemeJar(jarPath, expectedThemeName) {
    const zip = await JSZip.loadAsync(readFileSync(jarPath));
    const packagedThemeNames = new Set();

    for (const entryPath of Object.keys(zip.files)) {
        const match = /^theme\/([^/]+)\//.exec(entryPath);

        if (match !== null) {
            packagedThemeNames.add(match[1]);
        }
    }

    if (
        packagedThemeNames.size !== 1 ||
        !packagedThemeNames.has(expectedThemeName)
    ) {
        throw new Error(
            `${jarPath} contains theme directories [${[...packagedThemeNames].join(", ")}], expected only ${expectedThemeName}`
        );
    }

    const metadataEntry = zip.file("META-INF/keycloak-themes.json");

    if (metadataEntry === null) {
        throw new Error(`${jarPath} is missing META-INF/keycloak-themes.json`);
    }

    const metadata = JSON.parse(await metadataEntry.async("string"));
    const advertisedThemeNames = metadata.themes?.map(({ name }) => name) ?? [];

    if (
        advertisedThemeNames.length !== 1 ||
        advertisedThemeNames[0] !== expectedThemeName
    ) {
        throw new Error(
            `${jarPath} advertises themes [${advertisedThemeNames.join(", ")}], expected only ${expectedThemeName}`
        );
    }
}

try {
    // Compile once with all theme names so local previews and generated types
    // continue to support switching between variants.
    run("npm", ["run", "build"]);

    for (const themeName of themes) {
        // Do not allow files from the previous variant to satisfy the existence
        // checks below if Keycloakify ever produces an incomplete build.
        rmSync(outputDirectory, { recursive: true, force: true });

        run("npx", ["keycloakify", "build"], {
            KEYCLOAKIFY_THEME_NAME: themeName,
            KEYCLOAKIFY_ARTIFACT_ID: `${themeName}-keycloak-theme`
        });

        for (const jar of generatedJars) {
            if (!existsSync(join(outputDirectory, jar))) {
                throw new Error(`Keycloakify did not produce ${jar} for ${themeName}`);
            }

            await assertIsolatedThemeJar(join(outputDirectory, jar), themeName);

            copyFileSync(
                join(outputDirectory, jar),
                join(stagingDirectory, `${themeName}-${basename(jar)}`)
            );
        }

        console.log(`Verified isolated ${themeName} JARs`);
    }

    rmSync(outputDirectory, { recursive: true, force: true });
    mkdirSync(outputDirectory, { recursive: true });

    for (const jar of readdirSync(stagingDirectory)) {
        copyFileSync(join(stagingDirectory, jar), join(outputDirectory, jar));
    }
} finally {
    // Resolving the Vite config causes Keycloakify to regenerate this file for
    // the currently packaged theme. Restore the all-theme development version.
    if (existsSync(generatedThemeNamesFile)) {
        writeFileSync(generatedThemeNamesFile, originalGeneratedThemeNames);
    }

    rmSync(stagingDirectory, { recursive: true, force: true });
}
