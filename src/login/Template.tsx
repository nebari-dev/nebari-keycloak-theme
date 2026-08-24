import { isValidElement, useEffect } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import { useSetClassName } from "keycloakify/tools/useSetClassName";
import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    const isCollabTheme = kcContext.themeName === "openteams-collab";

    return (
        <main className="nebari-login-wrapper">
            <Card className="nebari-login-card gap-0 py-0">
                <div className="nebari-logo-header">
                    {isCollabTheme ? (
                        <div className="collab-brand">
                            <img
                                src={publicAssetUrl("logo/openteams-collab-mark.svg")}
                                alt="OpenTeams Collab"
                                className="collab-brand-mark"
                            />
                            <div className="collab-brand-name" aria-hidden="true">
                                <span>OpenTeams</span>
                                <strong>Collab</strong>
                            </div>
                        </div>
                    ) : (
                        <>
                            <img
                                src={publicAssetUrl("logo/nebari-logo-light.svg")}
                                alt="Nebari"
                                className="nebari-logo nebari-logo-light"
                            />
                            <img
                                src={publicAssetUrl("logo/nebari-logo-dark.svg")}
                                alt="Nebari"
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
