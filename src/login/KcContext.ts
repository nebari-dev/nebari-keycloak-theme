import { createGetKcContextMock } from "keycloakify/login/KcContext";
import type { KcContext as KcContextBase } from "keycloakify/login/KcContext";

export type KcContextExtension = {
    // Add any custom context properties here if needed
    // For example:
    // nebariVersion?: string;
};

export type KcContext = KcContextBase & KcContextExtension;

export const { getKcContextMock } = createGetKcContextMock({
    kcContextExtension: {},
    kcContextExtensionPerPage: {}
});

const previewPageIds = {
    login: "login.ftl",
    register: "register.ftl",
    "forgot-password": "login-reset-password.ftl",
    "update-password": "login-update-password.ftl",
    "verify-email": "login-verify-email.ftl",
    "update-profile": "login-update-profile.ftl",
    info: "info.ftl",
    error: "error.ftl"
} as const;

type PreviewName = keyof typeof previewPageIds | "login-providers" | "login-error";

export function getKcContextMockForPreview(previewName: string | null): KcContext {
    const name = (previewName ?? "login") as PreviewName;

    if (name === "login-providers") {
        return getKcContextMock({
            pageId: "login.ftl",
            overrides: {
                social: {
                    displayInfo: true,
                    providers: [
                        {
                            alias: "google",
                            displayName: "Google",
                            loginUrl: "#",
                            providerId: "google"
                        },
                        {
                            alias: "github",
                            displayName: "GitHub",
                            iconClasses: "fa fa-github",
                            loginUrl: "#",
                            providerId: "github"
                        }
                    ]
                }
            }
        });
    }

    if (name === "login-error") {
        return getKcContextMock({
            pageId: "login.ftl",
            overrides: {
                login: { username: "user@example.com" },
                messagesPerField: {
                    existsError: (fieldName: string) =>
                        fieldName === "username" || fieldName === "password",
                    get: (fieldName: string) =>
                        fieldName === "username" || fieldName === "password"
                            ? "Invalid username or password."
                            : ""
                }
            }
        });
    }

    return getKcContextMock({ pageId: previewPageIds[name] ?? "login.ftl" });
}
