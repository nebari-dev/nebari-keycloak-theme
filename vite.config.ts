import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { keycloakify } from "keycloakify/vite-plugin";
import path from "node:path";

const themeNames = ["nebari", "openteams-collab"];

const packagedThemeName = process.env.KEYCLOAKIFY_THEME_NAME;

if (packagedThemeName !== undefined && !themeNames.includes(packagedThemeName)) {
    throw new Error(
        `Unknown KEYCLOAKIFY_THEME_NAME "${packagedThemeName}". Expected one of: ${themeNames.join(", ")}`
    );
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
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
