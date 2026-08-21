import { isValidElement, useEffect, useLayoutEffect, useState } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import { useSetClassName } from "keycloakify/tools/useSetClassName";
import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    getBrandingCssVariables,
    isBrandingCustomized,
    type BrandingColorScheme
} from "../branding/brandingConfig";
import { getThemeDefinition, parseThemeBrandingConfig } from "../themes/themeCatalog";

/** A realm pinned to one appearance overrides the visitor's preference. */
function getInitialTheme(colorScheme: BrandingColorScheme): "dark" | "light" {
    if (colorScheme !== "system") return colorScheme;

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

export default function Template(props: TemplateProps<KcContext, I18n>) {
    const {
        displayInfo = false,
        displayMessage = true,
        displayRequiredFields = false,
        headerNode,
        socialProvidersNode = null,
        infoNode = null,
        documentTitle,
        bodyClassName,
        kcContext,
        i18n,
        doUseDefaultCss,
        classes,
        children
    } = props;

    const { kcClsx } = getKcClsx({ doUseDefaultCss, classes });
    const { msg, msgStr } = i18n;
    const themeDefinition = getThemeDefinition(kcContext.themeName);
    const branding = parseThemeBrandingConfig(
        themeDefinition,
        msgStr(themeDefinition.brandingMessageKey)
    );
    /* Read once: the stylesheet's light/dark rules key off `data-theme`, so the
       appearance must not change under the user mid-session. */
    const [theme] = useState<"dark" | "light">(() =>
        getInitialTheme(branding.colorScheme)
    );
    const paletteMode = theme;
    /* Gate for the whole branding layer — see `isBrandingCustomized`. */
    const isBranded = isBrandingCustomized(branding, themeDefinition.defaultBranding);

    useLayoutEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        document.title = documentTitle ?? msgStr("loginTitle", kcContext.realm.displayName);
    }, [documentTitle, kcContext.realm.displayName, msgStr]);

    useSetClassName({ qualifiedName: "html", className: kcClsx("kcHtmlClass") });
    useSetClassName({ qualifiedName: "body", className: bodyClassName ?? kcClsx("kcBodyClass") });

    const headerHasOwnTitleMarkup =
        isValidElement<{ className?: string }>(headerNode) &&
        (headerNode.props.className?.includes("nebari-title") ||
            headerNode.props.className?.includes("nebari-heading-group"));
    const publicAssetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

    return (
        <main
            className="nebari-login-wrapper"
            data-branded={isBranded ? "" : undefined}
            data-has-custom-background={
                isBranded && branding.backgroundImage !== "" ? "" : undefined
            }
            style={
                isBranded
                    ? {
                          ...getBrandingCssVariables(branding, paletteMode),
                          ...(branding.backgroundImage !== ""
                              ? {
                                    backgroundImage: `linear-gradient(${branding[paletteMode].pageBackground}d9, ${branding[paletteMode].pageBackground}d9), url(${JSON.stringify(branding.backgroundImage)})`
                                }
                              : {})
                      }
                    : undefined
            }
        >
            <Card
                className="nebari-login-card gap-0 py-0"
                style={isBranded ? { borderRadius: `${branding.cardRadius}px` } : undefined}
            >
                <div className="nebari-logo-header">
                    {/* The default is a light/dark pair swapped by CSS. A branded
                        realm has one logo for both, so it replaces the pair rather
                        than being sized by JS — which keeps an unbranded realm
                        rendering exactly as it did before branding existed. */}
                    {isBranded && branding.logo !== "" ? (
                        <img
                            src={branding.logo}
                            alt={`${branding.companyName} logo`}
                            className="nebari-logo"
                        />
                    ) : (
                        <>
                            <img
                                src={publicAssetUrl("logo/nebari-logo-light.svg")}
                                alt={branding.companyName}
                                className="nebari-logo nebari-logo-light"
                            />
                            <img
                                src={publicAssetUrl("logo/nebari-logo-dark.svg")}
                                alt={branding.companyName}
                                className="nebari-logo nebari-logo-dark"
                            />
                        </>
                    )}
                </div>

                <CardHeader className="nebari-header px-0">
                    {headerNode !== undefined ? (
                        headerHasOwnTitleMarkup ? headerNode : <h1 className="nebari-title">{headerNode}</h1>
                    ) : (
                        <h1 className="nebari-title">{msg("loginTitleHtml", kcContext.realm.displayNameHtml)}</h1>
                    )}
                </CardHeader>

                {displayMessage && kcContext.message !== undefined && (
                    <Alert
                        variant={
                            kcContext.message.type === "error"
                                ? "destructive"
                                : kcContext.message.type === "info"
                                  ? "default"
                                  : kcContext.message.type
                        }
                        className="mb-5"
                    >
                        <AlertDescription
                            dangerouslySetInnerHTML={{ __html: kcSanitize(kcContext.message.summary) }}
                        />
                    </Alert>
                )}

                <CardContent className="nebari-form-container px-0">{children}</CardContent>

                {displayRequiredFields && (
                    <div className="nebari-required-notice">
                        <span className="nebari-required-asterisk">*</span> {msg("requiredFields")}
                    </div>
                )}

                {socialProvidersNode && (
                    <div className="nebari-social-section">{socialProvidersNode}</div>
                )}

                {displayInfo && infoNode && (
                    <div className="nebari-info-section">{infoNode}</div>
                )}
            </Card>
        </main>
    );
}
