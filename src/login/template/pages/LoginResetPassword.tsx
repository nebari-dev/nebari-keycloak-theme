import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Button } from "@/components/shadcn/button";
import { Field, FieldError, FieldLabel } from "@/components/shadcn/field";
import { Input } from "@/components/shadcn/input";

export default function LoginResetPassword(
    props: PageProps<Extract<KcContext, { pageId: "login-reset-password.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
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
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayInfo
            displayMessage={!hasError}
            headerNode={msg("emailForgotTitle")}
            infoNode={
                realm.duplicateEmailsAllowed
                    ? msg("emailInstructionUsername")
                    : msg("emailInstruction")
            }
        >
            <form
                id="kc-reset-password-form"
                action={url.loginAction}
                method="post"
                className="flex flex-col gap-6"
            >
                <Field>
                    <FieldLabel htmlFor="username">{msg(labelKey)}</FieldLabel>
                    <Input
                        className="bg-muted"
                        aria-invalid={hasError}
                        autoFocus
                        defaultValue={auth.attemptedUsername ?? ""}
                        id="username"
                        name="username"
                        type="text"
                    />
                    {hasError && (
                        <FieldError aria-live="polite">
                                {/* shadcn's FieldError renders only `children` or
                                    `errors`; markup has to come in as a child. */}
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: kcSanitize(messagesPerField.get("username"))
                                    }}
                                />
                            </FieldError>
                    )}
                </Field>

                <div className="flex flex-col gap-4">
                    <Button className="w-full" type="submit">
                        {msgStr("doSubmit")}
                    </Button>
                    <a
                        className="text-muted-foreground hover:text-foreground text-center text-sm underline-offset-4 hover:underline"
                        href={url.loginUrl}
                    >
                        {backToLoginLabel}
                    </a>
                </div>
            </form>
        </Template>
    );
}
