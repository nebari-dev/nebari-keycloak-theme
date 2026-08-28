import type { PageProps } from "keycloakify/login/pages/PageProps";
import { MailIcon } from "lucide-react";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Alert, AlertDescription } from "@/components/shadcn/alert";

export default function LoginVerifyEmail(
    props: PageProps<Extract<KcContext, { pageId: "login-verify-email.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { url, user } = kcContext;
    const { msg, msgStr } = i18n;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayInfo
            headerNode={msg("emailVerifyTitle")}
            infoNode={
                <p>
                    {msg("emailVerifyInstruction2")}{" "}
                    <a
                        href={url.loginAction}
                        className="text-foreground underline underline-offset-4"
                    >
                        {msgStr("doClickHere")}
                    </a>{" "}
                    {msg("emailVerifyInstruction3")}
                </p>
            }
        >
            <Alert>
                <MailIcon aria-hidden />
                <AlertDescription>
                    {msg("emailVerifyInstruction1", user?.email ?? "")}
                </AlertDescription>
            </Alert>
        </Template>
    );
}
