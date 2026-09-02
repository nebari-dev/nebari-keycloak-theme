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
import { parseArgs } from "node:util";
import JSZip from "jszip";

// Shared with vite.config.ts — see themes.json.
const themes = JSON.parse(readFileSync(new URL("../themes.json", import.meta.url), "utf8"));
const generatedJars = [
    "keycloak-theme-for-kc-all-other-versions.jar",
    "keycloak-theme-for-kc-22-to-25.jar"
];
const outputDirectory = "dist_keycloak";
const generatedThemeNamesFile = "src/kc.gen.tsx";

const usage = `Usage: npm run build-keycloak-theme [-- --theme <name>]

Packages each theme into its own JAR, so a consumer installs only the theme they
want. With no --theme, every theme is built.

  --theme <name>  Build only this theme. Repeatable, and accepts a comma-separated
                  list. JARs already in ${outputDirectory}/ for themes you did not
                  select are left alone.
  --list          Print the available theme names and exit.
  --help          Print this message and exit.

Available themes: ${themes.join(", ")}`;

const { values } = parseArgs({
    options: {
        theme: { type: "string", multiple: true },
        list: { type: "boolean" },
        help: { type: "boolean" }
    },
    allowPositionals: false
});

if (values.help) {
    console.log(usage);
    process.exit(0);
}

if (values.list) {
    console.log(themes.join("\n"));
    process.exit(0);
}

// `--theme a --theme b` and `--theme a,b` are both accepted; npm needs the extra
// `--` separator, which is easy to drop, so an empty value is worth rejecting
// rather than quietly building everything.
const requestedThemes = (values.theme ?? [])
    .flatMap(value => value.split(","))
    .map(value => value.trim())
    .filter(value => value !== "");

const unknownThemes = requestedThemes.filter(theme => !themes.includes(theme));

if (unknownThemes.length !== 0) {
    console.error(
        `Unknown theme${unknownThemes.length === 1 ? "" : "s"} ${unknownThemes.join(", ")}.\n` +
            `Available themes: ${themes.join(", ")}`
    );
    process.exit(1);
}

const selectedThemes = requestedThemes.length === 0 ? themes : [...new Set(requestedThemes)];

const stagingDirectory = mkdtempSync(join(tmpdir(), "keycloak-theme-jars-"));
// Keycloakify writes straight into the output directory and the loop below clears
// it between themes, so JARs for themes that were not selected have to be held
// somewhere. The finally block puts them back.
const preservedDirectory = mkdtempSync(join(tmpdir(), "keycloak-theme-jars-kept-"));

if (existsSync(outputDirectory)) {
    for (const jar of readdirSync(outputDirectory).filter(name => name.endsWith(".jar"))) {
        copyFileSync(join(outputDirectory, jar), join(preservedDirectory, jar));
    }
}

const originalGeneratedThemeNames = readFileSync(generatedThemeNamesFile);
const executableSuffix = process.platform === "win32" ? ".cmd" : "";

let buildSucceeded = false;

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

    for (const themeName of selectedThemes) {
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

    console.log(
        `Wrote ${readdirSync(stagingDirectory).length} JAR(s) to ${outputDirectory}/ for: ${selectedThemes.join(", ")}`
    );

    buildSucceeded = true;
} finally {
    // Resolving the Vite config causes Keycloakify to regenerate this file for
    // the currently packaged theme. Restore the all-theme development version.
    if (existsSync(generatedThemeNamesFile)) {
        writeFileSync(generatedThemeNamesFile, originalGeneratedThemeNames);
    }

    mkdirSync(outputDirectory, { recursive: true });

    for (const jar of readdirSync(preservedDirectory)) {
        // On success the selected themes have just been written fresh, so their
        // previous JARs are dropped — otherwise one saved under a stale name (a
        // renamed theme, say) would come back alongside the new one. On failure
        // the output directory was cleared without being repopulated, so every
        // preserved JAR goes back and the build leaves nothing worse behind.
        const supersededByThisBuild =
            buildSucceeded && selectedThemes.some(theme => jar.startsWith(`${theme}-`));

        if (!supersededByThisBuild && !existsSync(join(outputDirectory, jar))) {
            copyFileSync(join(preservedDirectory, jar), join(outputDirectory, jar));
        }
    }

    rmSync(stagingDirectory, { recursive: true, force: true });
    rmSync(preservedDirectory, { recursive: true, force: true });
}
