// src/login/pages/Error.tsx
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { TriangleAlert } from "lucide-react";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Error(
    props: PageProps<Extract<KcContext, { pageId: "error.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { msg } = i18n;

    const { message, client, skipLink } = kcContext;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={msg("errorTitle")}
        >
            <div id="kc-error-message">
                <Alert variant="destructive">
                    <TriangleAlert aria-hidden />
                    <AlertDescription>{message.summary}</AlertDescription>
                </Alert>

                {!skipLink && client !== undefined && client.baseUrl !== undefined && (
                    <div className="nebari-form-actions">
                        <Button className="w-full" render={<a href={client.baseUrl} />}>
                            {msg("backToApplication")}
                        </Button>
                    </div>
                )}
            </div>
        </Template>
    );
}
