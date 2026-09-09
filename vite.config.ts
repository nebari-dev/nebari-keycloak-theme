import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { keycloakify } from "keycloakify/vite-plugin";
import path from "node:path";
// The single registry of theme names, shared with scripts/build-keycloak-themes.mjs
// and src/themes/themeCatalog.ts so a new theme is added in one place. Separate
// lists silently disagreeing would mean a theme that builds in dev but never
// gets packaged, or the reverse.
import themeNames from "./themes.json";
/* Imported for its side effect: the catalog checks itself against themes.json
   at module load, and pulling it in here promotes that from a blank login page
   at runtime to a failed `vite build`. Only its type-erased branding modules
   come with it, so this stays loadable in Node. */
import { CUSTOM_THEME_NAMES, getThemeDefinition } from "./src/themes/themeCatalog";

/* Set by the packaging script to build one theme at a time. Each published JAR
   then contains exactly one theme, so a consumer downloads only what they use. */
const packagedThemeName = process.env.KEYCLOAKIFY_THEME_NAME;

if (packagedThemeName !== undefined && !themeNames.includes(packagedThemeName)) {
    throw new Error(
        `Unknown KEYCLOAKIFY_THEME_NAME "${packagedThemeName}". Expected one of: ${CUSTOM_THEME_NAMES.join(", ")}`
    );
}

/**
 * Baked into the packaged theme's `theme.properties`, which Keycloak hands to
 * the Admin Console as `kcContext.properties`. Per-theme rather than global
 * because each JAR is built on its own — a theme with no use for the editor
 * ships without it. A combined development build has no single answer, so it
 * exposes the page.
 *
 * `src/admin/themeCustomization.ts` reads this, and the environment variable
 * below overrides it per deployment.
 */
const themeCustomizationDefault =
    packagedThemeName === undefined
        ? true
        : getThemeDefinition(packagedThemeName).themeCustomization;

/**
 * PatternFly ships its stylesheets unlayered, and unlayered CSS outranks every
 * cascade layer. Its universal reset (`*, ::before, ::after { padding: 0 }`) and
 * its `:where(button, input, …)` font rule were therefore beating Tailwind's
 * `@layer utilities`, stripping the padding, font size and display off every
 * Nebari design-system component rendered inside the Admin Console.
 *
 * Wrapping each PatternFly stylesheet in a `patternfly` layer ranks it below
 * Tailwind's layers — the order is declared at the top of `src/theme.css` — so
 * design-system components style correctly while PatternFly still dresses its
 * own components. This has to be a transform rather than an `@import … layer()`
 * because PatternFly's component CSS is pulled in by `@patternfly/react-styles`
 * from inside `node_modules`, not from a stylesheet we control.
 */
const LAYER_ORDER = "@layer theme, base, patternfly, components, utilities;";

function patternflyCssLayer(): Plugin {
    return {
        name: "patternfly-css-layer",
        enforce: "pre",
        transform(code, id) {
            if (!/[\\/]@patternfly[\\/].*\.css(\?|$)/.test(id)) {
                return null;
            }

            // `@charset` is only valid as the very first token of a stylesheet,
            // so it cannot survive being wrapped. Every file here is UTF-8,
            // which is also the default, making the declaration redundant.
            const css = code.replace(/^\s*@charset\s+[^;]+;/i, "");

            // The order statement is repeated in every PatternFly stylesheet on
            // purpose. A layer's position is fixed the first time the browser
            // sees its name, and PatternFly's CSS is often injected before
            // src/theme.css — in which case `patternfly` would be registered as
            // the very first (weakest) layer and Tailwind's preflight would win.
            // Restating the full order here makes it hold whichever stylesheet
            // happens to arrive first. Statements after the first are no-ops.
            return {
                code: `${LAYER_ORDER}\n@layer patternfly {\n${css}\n}`,
                map: null
            };
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        patternflyCssLayer(),
        react(),
        tailwindcss(),
        keycloakify({
            accountThemeImplementation: "Single-Page",
            /* `template` is first in themes.json, so it is the theme
               keycloakify treats as primary: an unconfigured realm gets the
               unbranded starting point rather than Nebari's branding.

               Development exposes every theme so previews can switch between
               them; the packaging script pins one so each JAR ships alone. */
            themeName: packagedThemeName ?? themeNames,
            themeVersion: "1.0.0",
            kcContextExclusionsFtl: "src/login/kcContextExclusions.ftl",
            /* Resolved by Keycloak from the container environment when the page
               is rendered, so a deployment can flip this in its compose file or
               Helm values without rebuilding the JAR. Empty means "no override,
               use the theme's default". */
            environmentVariables: [
                { name: "NEBARI_THEME_CUSTOMIZATION", default: "" }
            ],
            extraThemeProperties: [
                "parentTheme=keycloak.v2",
                `themeCustomizationDefault=${themeCustomizationDefault ? "enabled" : "disabled"}`
            ]
        })
    ],
    resolve: {
        alias: {
            // Keep the Nebari registry's own "@/ui/*" specifiers resolvable so
            // components can be installed and updated without local edits.
            "@/ui": path.resolve(__dirname, "./src/components/ui"),
            "@": path.resolve(__dirname, "./src")
        }
    },
    build: {
        // Increase the chunk size warning limit (default is 500kb)
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ["react", "react-dom"]
                }
            }
        }
    }
});
