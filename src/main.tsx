// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { KcContext } from "./kc.gen";
import { KcPage } from "./kc.gen";
import { getKcContextMock } from "./login/KcContext";
import "./theme.css";

// window.kcContext is declared (with the full union type) in kc.gen.tsx.
// In production Keycloak injects it before this script runs.
// In dev mode (no real context) fall back to the login mock so the dev
// preview always shows a fully-populated context — prevents HMR crashes.
const kcContext: KcContext =
    (window.kcContext as KcContext | undefined) ??
    (getKcContextMock({ pageId: "login.ftl" }) as KcContext);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <KcPage kcContext={kcContext} />
    </StrictMode>
);
