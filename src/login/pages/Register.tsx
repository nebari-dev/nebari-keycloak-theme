// src/login/pages/Register.tsx
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { ReactNode } from "react";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { PasswordField } from "@/components/nebari/PasswordField";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function Register(
    props: PageProps<Extract<KcContext, { pageId: "register.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, messagesPerField, realm, passwordRequired, recaptchaRequired, recaptchaSiteKey } = kcContext;

    const { msg, msgStr } = i18n;

    /**
     * Every field on this page follows the same shape, and repeating it eight
     * times is how the markup drifted out of step with the rest of the theme in
     * the first place.
     */
    const labelFor = (fieldId: string, label: ReactNode) => (
        <FieldLabel htmlFor={fieldId}>
            {label} <span className="nebari-required-asterisk">*</span>
        </FieldLabel>
    );

    const errorFor = (fieldId: string, ...alsoConsider: string[]) =>
        messagesPerField.existsError(fieldId, ...alsoConsider) && (
            <FieldError aria-live="polite" match={true}>
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
            headerNode={msg("registerTitle")}
            infoNode={
                <div>
                    <span>
                        {msg("alreadyHaveAnAccount")}{" "}
                        <a href={url.loginUrl}>{msg("doLogIn")}</a>
                    </span>
                </div>
            }
        >
            <form id="kc-register-form" action={url.registrationAction} method="post">
                <Field>
                    {labelFor("firstName", msg("firstName"))}
                    <Input
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
                            <PasswordField
                                aria-invalid={messagesPerField.existsError("password", "password-confirm")}
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
                            <PasswordField
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
                    <div className="nebari-form-group">
                        <div className="g-recaptcha" data-size="compact" data-sitekey={recaptchaSiteKey} />
                    </div>
                )}

                <div className="nebari-form-actions">
                    {/* `type` is baked into the render element: Base UI merges the
                        render element's props last, so `Button`'s default
                        `<button type="button" />` would win over a `type` prop. */}
                    <Button className="w-full" render={<button type="submit" />}>
                        {msgStr("doRegister")}
                    </Button>
                </div>
            </form>
        </Template>
    );
}
