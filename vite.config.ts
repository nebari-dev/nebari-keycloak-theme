import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { keycloakify } from "keycloakify/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        keycloakify({
            accountThemeImplementation: "none",
            themeName: "nebari",
            themeVersion: "1.0.0",
            extraThemeProperties: [
                "parentTheme=keycloak.v2"
            ]
        })
    ],
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
