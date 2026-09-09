import type { PageProps } from "keycloakify/login/pages/PageProps";
import { InfoIcon } from "lucide-react";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import {
    getInfoContinueTarget,
    getInfoHeaderHtml,
    getInfoMessageHtml
} from "../../infoMessage";

export default function Info(
    props: PageProps<Extract<KcContext, { pageId: "info.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { msg } = i18n;

    /* Message resolution, sanitization and the `skipLink` rules are shared with
       the Nebari theme — see `src/login/infoMessage.ts`. */
    const continueTarget = getInfoContinueTarget(kcContext);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={
                <span
                    dangerouslySetInnerHTML={{
                        __html: getInfoHeaderHtml(kcContext, i18n)
                    }}
                />
            }
        >
            <div id="kc-info-message" className="flex flex-col gap-6">
                <Alert>
                    <InfoIcon aria-hidden />
                    <AlertDescription>
                        <span
                            dangerouslySetInnerHTML={{
                                __html: getInfoMessageHtml(kcContext, i18n)
                            }}
                        />
                    </AlertDescription>
                </Alert>
                {continueTarget !== undefined && (
                    <Button className="w-full" asChild>
                        <a href={continueTarget.href}>{msg(continueTarget.label)}</a>
                    </Button>
                )}
            </div>
        </Template>
    );
}
