// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getKcContextMock } from "./login/KcContext";
import type { KcContext } from "./login/KcContext";
import KcPage from "./login/KcPage";
import "./theme.css";

const result = getKcContextMock({
    pageId: "login.ftl"
});

const kcContext = result as KcContext | undefined;

if (!kcContext) {
    throw new Error("kcContext is undefined");
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <KcPage kcContext={kcContext} />
    </StrictMode>
);
