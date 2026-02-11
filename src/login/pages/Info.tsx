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
                <p className="nebari-text-secondary" style={{ marginBottom: "16px" }}>
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
