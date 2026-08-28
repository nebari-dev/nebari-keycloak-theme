import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { ReactNode } from "react";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Button } from "@/components/shadcn/button";
import { Field, FieldError, FieldLabel } from "@/components/shadcn/field";
import { Input } from "@/components/shadcn/input";
import { PasswordInput } from "../PasswordInput";

export default function Register(
    props: PageProps<Extract<KcContext, { pageId: "register.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const {
        url,
        messagesPerField,
        realm,
        passwordRequired,
        recaptchaRequired,
        recaptchaSiteKey
    } = kcContext;
    const { msg, msgStr } = i18n;

    /** Every field on this page follows the same shape. */
    const labelFor = (fieldId: string, label: ReactNode) => (
        <FieldLabel htmlFor={fieldId}>
            {label} <span aria-hidden="true">*</span>
        </FieldLabel>
    );

    const errorFor = (fieldId: string, ...alsoConsider: string[]) =>
        messagesPerField.existsError(fieldId, ...alsoConsider) && (
            <FieldError aria-live="polite">
                {messagesPerField.getFirstError(fieldId, ...alsoConsider)}
            </FieldError>
        );

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={messagesPerField.exists("global")}
            displayRequiredFields
            displayInfo
            headerNode={msg("templateRegisterTitle")}
            infoNode={
                <span>
                    {msg("alreadyHaveAnAccount")}{" "}
                    <a
                        href={url.loginUrl}
                        className="text-foreground underline underline-offset-4"
                    >
                        {msg("doLogIn")}
                    </a>
                </span>
            }
        >
            <form
                id="kc-register-form"
                action={url.registrationAction}
                method="post"
                className="flex flex-col gap-6"
            >
                <Field>
                    {labelFor("firstName", msg("firstName"))}
                    <Input
                        className="bg-muted"
                        aria-invalid={messagesPerField.existsError("firstName")}
                        autoComplete="given-name"
                        id="firstName"
                        name="firstName"
                        type="text"
                    />
                    {errorFor("firstName")}
                </Field>

                <Field>
                    {labelFor("lastName", msg("lastName"))}
                    <Input
                        className="bg-muted"
                        aria-invalid={messagesPerField.existsError("lastName")}
                        autoComplete="family-name"
                        id="lastName"
                        name="lastName"
                        type="text"
                    />
                    {errorFor("lastName")}
                </Field>

                <Field>
                    {labelFor("email", msg("email"))}
                    <Input
                        className="bg-muted"
                        aria-invalid={messagesPerField.existsError("email")}
                        autoComplete="email"
                        id="email"
                        name="email"
                        type="email"
                    />
                    {errorFor("email")}
                </Field>

                {!realm.registrationEmailAsUsername && (
                    <Field>
                        {labelFor("username", msg("username"))}
                        <Input
                            className="bg-muted"
                            aria-invalid={messagesPerField.existsError("username")}
                            autoComplete="username"
                            id="username"
                            name="username"
                            type="text"
                        />
                        {errorFor("username")}
                    </Field>
                )}

                {passwordRequired && (
                    <>
                        <Field>
                            {labelFor("password", msg("password"))}
                            <PasswordInput
                                aria-invalid={messagesPerField.existsError(
                                    "password",
                                    "password-confirm"
                                )}
                                autoComplete="new-password"
                                hideLabel={msgStr("hidePassword")}
                                id="password"
                                name="password"
                                showLabel={msgStr("showPassword")}
                            />
                            {errorFor("password")}
                        </Field>

                        <Field>
                            {labelFor("password-confirm", msg("passwordConfirm"))}
                            <PasswordInput
                                aria-invalid={messagesPerField.existsError("password-confirm")}
                                autoComplete="new-password"
                                hideLabel={msgStr("hidePassword")}
                                id="password-confirm"
                                name="password-confirm"
                                showLabel={msgStr("showPassword")}
                            />
                            {errorFor("password-confirm")}
                        </Field>
                    </>
                )}

                {recaptchaRequired && (
                    <div
                        className="g-recaptcha"
                        data-size="compact"
                        data-sitekey={recaptchaSiteKey}
                    />
                )}

                <Button className="w-full" type="submit">
                    {msgStr("doRegister")}
                </Button>
            </form>
        </Template>
    );
}
