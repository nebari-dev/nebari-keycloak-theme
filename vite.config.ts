import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { keycloakify } from "keycloakify/vite-plugin";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        keycloakify({
            accountThemeImplementation: "Single-Page",
            themeName: "nebari",
            themeVersion: "1.0.0",
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
