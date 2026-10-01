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

type ImplementedPageId = (typeof previewPageIds)[keyof typeof previewPageIds];

function isImplementedPageId(pageId: string): pageId is ImplementedPageId {
    return (Object.values(previewPageIds) as string[]).includes(pageId);
}

/**
 * The mock for a Keycloak page id, such as `login-reset-password.ftl`, so the
 * dev server and tests can address a page by the name Keycloak gives it. Only
 * the pages this theme implements are accepted; anything else returns
 * undefined, and the caller falls back to the `?preview=` mocks.
 */
export function getKcContextMockForPageId(pageId: string | null): KcContext | undefined {
    if (pageId === null) {
        return undefined;
    }

    if (!isImplementedPageId(pageId)) {
        console.warn(
            `Unknown pageId "${pageId}"; showing the sign-in page. Implemented: ${Object.values(previewPageIds).join(", ")}`
        );
        return undefined;
    }

    return getKcContextMock({ pageId });
}

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
