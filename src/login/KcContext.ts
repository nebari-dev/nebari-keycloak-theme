import { createGetKcContextMock } from "keycloakify/login/KcContext";
import type { KcContext as KcContextBase } from "keycloakify/login/KcContext";

// biome-ignore lint/complexity/noBannedTypes: an empty extension leaves KcContextBase unchanged
export type KcContextExtension = {};

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

/**
 * The mock's own `themeName` is a placeholder that matches no theme in the
 * catalog, so previews would always fall back to the default theme. Accepting an
 * explicit name lets every theme in the build be previewed and screenshotted.
 */
function withThemeName(kcContext: KcContext, themeName: string | null): KcContext {
    return themeName === null ? kcContext : { ...kcContext, themeName };
}

/**
 * A preview with a published branding config, as a realm would serve it: the
 * config reaches the login page as a realm localization message, which
 * Keycloakify exposes through `x-keycloakify.messages`. The value goes through
 * the same validation as a real one, so the preview cannot render anything a
 * realm could not. Only the standalone dev server uses this; Keycloak always
 * injects its own `kcContext`.
 */
export function getKcContextMockForPreview(
    previewName: string | null,
    themeName: string | null = null,
    publishedBranding: string | null = null
): KcContext {
    const kcContext = getUnbrandedKcContextMock(previewName, themeName);

    if (publishedBranding === null) return kcContext;

    return {
        ...kcContext,
        "x-keycloakify": {
            ...kcContext["x-keycloakify"],
            messages: {
                ...kcContext["x-keycloakify"].messages,
                nebariBrandingConfig: publishedBranding
            }
        }
    };
}

function getUnbrandedKcContextMock(previewName: string | null, themeName: string | null): KcContext {
    const name = (previewName ?? "login") as PreviewName;

    if (name === "login-providers") {
        return withThemeName(
            getKcContextMock({
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
            }),
            themeName
        );
    }

    if (name === "login-error") {
        return withThemeName(
            getKcContextMock({
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
            }),
            themeName
        );
    }

    /* Keycloakify's mock header is the literal `<Message header>`. The info page
       sanitizes headers as HTML, as Keycloak's own info.ftl does, so that
       placeholder is stripped as an unknown tag and the preview loses its
       heading. A plain-text header shows what a real one looks like. */
    if (name === "info") {
        return withThemeName(
            getKcContextMock({
                pageId: "info.ftl",
                overrides: { messageHeader: "Your account has been updated" }
            }),
            themeName
        );
    }

    return withThemeName(getKcContextMock({ pageId: previewPageIds[name] ?? "login.ftl" }), themeName);
}
