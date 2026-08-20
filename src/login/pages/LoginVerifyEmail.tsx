import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { MailIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginVerifyEmail(props: PageProps<Extract<KcContext, { pageId: "login-verify-email.ftl" }>, I18n>) {
    const { kcContext, i18n, Template } = props;
    const { url, user } = kcContext;
    const { msg, msgStr } = i18n;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            classes={undefined}
            displayInfo
            headerNode={msg("emailVerifyTitle")}
            infoNode={
                <p>
                    {msg("emailVerifyInstruction2")}{" "}
                    <a href={url.loginAction} className="nebari-link">
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
