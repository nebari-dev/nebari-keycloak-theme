import type { PageProps } from "keycloakify/login/pages/PageProps";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function LoginResetPassword(props: PageProps<Extract<KcContext, { pageId: "login-reset-password.ftl" }>, I18n>) {
    const { kcContext, i18n, Template } = props;
    const { url, realm, auth, messagesPerField } = kcContext;
    const { msg, msgStr } = i18n;
    const backToLoginLabel = msgStr("backToLogin").replace(/^(?:«|&laquo;)\s*/i, "");

    const labelKey = !realm.loginWithEmailAllowed
        ? "username"
        : !realm.registrationEmailAsUsername
            ? "usernameOrEmail"
            : "email";

    const hasError = messagesPerField.existsError("username");

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            classes={undefined}
            displayInfo
            displayMessage={!hasError}
            headerNode={msg("emailForgotTitle")}
            infoNode={
                realm.duplicateEmailsAllowed
                    ? msg("emailInstructionUsername")
                    : msg("emailInstruction")
            }
        >
            <form id="kc-reset-password-form" action={url.loginAction} method="post">
                <Field>
                    <FieldLabel htmlFor="username">{msg(labelKey)}</FieldLabel>
                    <Input
                        aria-invalid={hasError}
                        autoFocus
                        defaultValue={auth.attemptedUsername ?? ""}
                        id="username"
                        name="username"
                        type="text"
                    />
                    {hasError && (
                        <FieldError
                            aria-live="polite"
                            dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("username")) }}
                            match={true}
                        />
                    )}
                </Field>

                <div className="nebari-form-actions">
                    <a className="nebari-link" href={url.loginUrl}>
                        {backToLoginLabel}
                    </a>
                    {/* `type` is baked into the render element: Base UI merges the
                        render element's props last, so `Button`'s default
                        `<button type="button" />` would win over a `type` prop. */}
                    <Button className="w-full" render={<button type="submit" />}>
                        {msgStr("doSubmit")}
                    </Button>
                </div>
            </form>
        </Template>
    );
}
