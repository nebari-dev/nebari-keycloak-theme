import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { keycloakify } from "keycloakify/vite-plugin";
import path from "node:path";
// Shared with scripts/build-keycloak-themes.mjs so a new theme is added in one
// place. The two lists silently disagreeing would mean a theme that builds in
// dev but never gets packaged, or the reverse.
import themeNames from "./themes.json";

const packagedThemeName = process.env.KEYCLOAKIFY_THEME_NAME;

if (packagedThemeName !== undefined && !themeNames.includes(packagedThemeName)) {
    throw new Error(
        `Unknown KEYCLOAKIFY_THEME_NAME "${packagedThemeName}". Expected one of: ${themeNames.join(", ")}`
    );
}

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
            // Development exposes every variant. The packaging script sets the
            // environment variable so each published JAR contains one theme.
            themeName: packagedThemeName ?? themeNames,
            extraThemeProperties: [
                "parentTheme=keycloak.v2"
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
