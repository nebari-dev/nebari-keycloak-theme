import type { PageProps } from "keycloakify/login/pages/PageProps";
import { InfoIcon } from "lucide-react";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";

export default function Info(
    props: PageProps<Extract<KcContext, { pageId: "info.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { msgStr, msg } = i18n;
    const {
        messageHeader,
        message,
        requiredActions,
        skipLink,
        pageRedirectUri,
        actionUri,
        client
    } = kcContext;

    /* Keycloak offers at most one continue target, in this order of preference. */
    const continueHref =
        !skipLink && pageRedirectUri !== undefined
            ? pageRedirectUri
            : actionUri !== undefined
              ? actionUri
              : !skipLink
                ? client.baseUrl
                : undefined;
    const continueLabel =
        actionUri !== undefined && pageRedirectUri === undefined
            ? msg("proceedWithAction")
            : msg("backToApplication");

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={
                messageHeader !== undefined ? <>{messageHeader}</> : <>{message.summary}</>
            }
        >
            <div id="kc-info-message" className="flex flex-col gap-6">
                <Alert>
                    <InfoIcon aria-hidden />
                    <AlertDescription>
                        {message.summary}
                        {requiredActions !== undefined && (
                            <b>
                                {" "}
                                {requiredActions
                                    .map((requiredAction: string) =>
                                        // The key is only known at runtime, so it is
                                        // asserted to the message-key union rather
                                        // than widened to `any`.
                                        msgStr(
                                            `requiredAction.${requiredAction}` as Parameters<
                                                typeof msgStr
                                            >[0]
                                        )
                                    )
                                    .join(", ")}
                            </b>
                        )}
                    </AlertDescription>
                </Alert>
                {continueHref !== undefined && (
                    <Button className="w-full" asChild>
                        <a href={continueHref}>{continueLabel}</a>
                    </Button>
                )}
            </div>
        </Template>
    );
}
