import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import { useSetClassName } from "keycloakify/tools/useSetClassName";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";
import {
    getBrandingImage,
    getBrandingCssVariables,
    type BrandingColorScheme
} from "../../branding/brandingConfig";
import { getThemeDefinition, parseThemeBrandingConfig } from "../../themes/themeCatalog";

/** A realm pinned to one appearance overrides the visitor's preference. */
function getInitialTheme(colorScheme: BrandingColorScheme): "dark" | "light" {
    if (colorScheme !== "system") return colorScheme;

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * The `template` theme's shell.
 *
 * This is the file to edit first when adapting the theme: it owns the page
 * background, the card, and where a logo would go. It renders no artwork of its
 * own — a deployment supplies one through Theme customization, or replaces the
 * placeholder below with its own markup.
 *
 * Unlike the `nebari` theme this uses no `.nebari-*` stylesheet classes. Styling
 * is Tailwind utilities over the shadcn token set. The only stylesheet rule it
 * needs is the scoped border default that stock shadcn installs globally; see
 * the documented `[data-login-theme="template"]` rule in `theme.css`.
 */
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

    /* Read once: the token overrides below key off this, so the appearance must
       not change under the user mid-session. */
    const [mode] = useState<"dark" | "light">(() => getInitialTheme(branding.colorScheme));

    useLayoutEffect(() => {
        document.documentElement.dataset.theme = mode;
    }, [mode]);

    useEffect(() => {
        document.title = documentTitle ?? msgStr("loginTitle", kcContext.realm.displayName);
    }, [documentTitle, kcContext.realm.displayName, msgStr]);

    useSetClassName({ qualifiedName: "html", className: kcClsx("kcHtmlClass") });
    useSetClassName({
        qualifiedName: "body",
        className: bodyClassName ?? kcClsx("kcBodyClass")
    });

    /* Always applied, unlike the `nebari` theme's branding gate. The shared
       stylesheet's :root tokens are Nebari's brand colours, so the shadcn
       neutral palette has to be declared here for an unconfigured realm to
       render as stock shadcn rather than inheriting purple. */
    const paletteVariables = getBrandingCssVariables(branding, mode);
    /* The shared Nebari token sheet models `destructive` as a pale alert
       surface. Stock shadcn uses the same token as legible text and a button
       fill, so the template supplies neutral-theme red-700/red-400 values.
       They retain text contrast in their respective colour schemes, while the
       component's existing dark fill opacity keeps white button text readable. */
    const semanticVariables = {
        "--destructive": mode === "dark" ? "#f87171" : "#b91c1c"
    } as CSSProperties;
    const logo = getBrandingImage(branding.logo, mode);
    const background = getBrandingImage(branding.backgroundImage, mode);
    const backgroundImage =
        background !== ""
            ? `linear-gradient(${branding[mode].pageBackground}d9, ${branding[mode].pageBackground}d9), url(${JSON.stringify(background)})`
            : undefined;

    return (
        <main
            data-login-theme="template"
            className="flex min-h-screen w-full items-center justify-center bg-background bg-cover bg-center p-6 text-foreground"
            style={{
                ...paletteVariables,
                ...semanticVariables,
                ...(backgroundImage ? { backgroundImage } : {})
            }}
        >
            <div className="w-full max-w-sm">
                <Card
                    className="gap-6"
                    style={{ borderRadius: `${branding.cardRadius}px` }}
                >
                    <CardHeader className="text-center">
                        {/* No default artwork: a template theme ships unbranded
                            on purpose. A logo appears only once a deployment
                            uploads one, so nothing has to be removed first. */}
                        {logo !== "" && (
                            <div className="mb-4 flex justify-center">
                                <img
                                    src={logo}
                                    alt={
                                        branding.companyName !== ""
                                            ? `${branding.companyName} logo`
                                            : ""
                                    }
                                    className="h-10 w-auto object-contain"
                                />
                            </div>
                        )}
                        <CardTitle>
                            <h1 className="text-xl">
                                {headerNode ?? msg("loginTitleHtml", kcContext.realm.displayNameHtml)}
                            </h1>
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-6">
                        {displayMessage && kcContext.message !== undefined && (
                            <Alert
                                variant={
                                    kcContext.message.type === "error"
                                        ? "destructive"
                                        : "default"
                                }
                            >
                                <AlertDescription
                                    dangerouslySetInnerHTML={{
                                        __html: kcSanitize(kcContext.message.summary)
                                    }}
                                />
                            </Alert>
                        )}

                        {children}

                        {displayRequiredFields && (
                            <p className="text-muted-foreground text-sm">
                                <span aria-hidden="true">*</span> {msg("requiredFields")}
                            </p>
                        )}

                        {socialProvidersNode}

                        {displayInfo && infoNode && (
                            <div className="text-muted-foreground text-center text-sm">
                                {infoNode}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
