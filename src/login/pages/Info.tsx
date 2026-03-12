// src/login/pages/Error.tsx
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";

export default function Info(
    props: PageProps<Extract<KcContext, { pageId: "info.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { msgStr, msg } = i18n;

    const { messageHeader, message, requiredActions, skipLink, pageRedirectUri, actionUri, client } = kcContext;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={
                messageHeader !== undefined ? (
                    <>{messageHeader}</>
                ) : (
                    <>{message.summary}</>
                )
            }
        >
            <div id="kc-info-message">
                {/* Info icon */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "1.25rem",
                }}>
                    <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "rgba(155, 61, 204, 0.1)",
                        border: "1px solid rgba(155, 61, 204, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent)",
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="8" />
                            <line x1="12" y1="12" x2="12" y2="16" />
                        </svg>
                    </div>
                </div>
                <p style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9375rem",
                    lineHeight: "1.6",
                    fontWeight: 400,
                    textAlign: "center",
                    marginBottom: "1.5rem",
                }}>
                    {message.summary}

                    {requiredActions !== undefined && (
                        <b>
                            {" "}
                            {requiredActions
                                .map((requiredAction: string) =>
                                    msgStr(`requiredAction.${requiredAction}` as any)
                                )
                                .join(", ")}
                        </b>
                    )}
                </p>

                {!skipLink && pageRedirectUri !== undefined ? (
                    <div className="nebari-form-group">
                        <a href={pageRedirectUri} className="nebari-button nebari-button-primary">
                            {msg("backToApplication")}
                        </a>
                    </div>
                ) : actionUri !== undefined ? (
                    <div className="nebari-form-group">
                        <a href={actionUri} className="nebari-button nebari-button-primary">
                            {msg("proceedWithAction")}
                        </a>
                    </div>
                ) : (
                    client.baseUrl !== undefined && (
                        <div className="nebari-form-group">
                            <a href={client.baseUrl} className="nebari-button nebari-button-primary">
                                {msg("backToApplication")}
                            </a>
                        </div>
                    )
                )}
            </div>
        </Template>
    );
}
