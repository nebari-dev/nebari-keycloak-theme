// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getKcContextMock } from "./login/KcContext";
import type { KcContext } from "./login/KcContext";
import KcPage from "./login/KcPage";
import "./theme.css";

// Read ?page=register.ftl from the URL, default to login.ftl
const supportedPages = ["login.ftl", "register.ftl", "info.ftl", "error.ftl"] as const;
type PageId = typeof supportedPages[number];

const urlPage = new URLSearchParams(window.location.search).get("page");
const pageId: PageId = supportedPages.includes(urlPage as PageId)
    ? (urlPage as PageId)
    : "login.ftl";

const result = getKcContextMock({ pageId });

const kcContext = result as KcContext | undefined;

if (!kcContext) {
    throw new Error("kcContext is undefined");
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <KcPage kcContext={kcContext} />
    </StrictMode>
);
