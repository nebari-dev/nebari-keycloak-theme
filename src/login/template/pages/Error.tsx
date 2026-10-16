import type { PageProps } from "keycloakify/login/pages/PageProps";
import { TriangleAlert } from "lucide-react";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";

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
            <div id="kc-error-message" className="flex flex-col gap-6">
                <Alert variant="destructive">
                    <TriangleAlert aria-hidden />
                    <AlertDescription>{message.summary}</AlertDescription>
                </Alert>
                {!skipLink && client !== undefined && client.baseUrl !== undefined && (
                    <Button className="w-full" asChild>
                        <a href={client.baseUrl}>{msg("backToApplication")}</a>
                    </Button>
                )}
            </div>
        </Template>
    );
}
