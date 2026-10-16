// src/login/pages/Register.tsx
import { useState } from "react";
import { clsx } from "keycloakify/tools/clsx";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { kcClassesMap } from "../userProfileClasses";
import { useRecaptchaSubmitCallback } from "../recaptcha";

type Props = PageProps<Extract<KcContext, { pageId: "register.ftl" }>, I18n> & {
    UserProfileFormFields: LazyOrNot<
        (props: UserProfileFormFieldsProps) => React.ReactElement
    >;
    doMakeUserConfirmPassword: boolean;
};

/**
 * The fields are rendered by `UserProfileFormFields` rather than written out
 * here. Which fields a registration form has is realm configuration — the User
 * Profile — so a hand-written form silently drops any required custom attribute
 * the realm declares, which makes registration impossible to complete: the
 * server keeps rejecting the submission for a field the page never showed.
 * Terms acceptance and the invisible/action reCAPTCHA variants are realm
 * configuration in the same way, and are handled below for the same reason.
 */
export default function Register(props: Props) {
    const {
        kcContext,
        i18n,
        doUseDefaultCss,
        Template,
        classes,
        UserProfileFormFields,
        doMakeUserConfirmPassword
    } = props;

    const {
        messageHeader,
        url,
        messagesPerField,
        recaptchaRequired,
        recaptchaVisible,
        recaptchaSiteKey,
        recaptchaAction,
        termsAcceptanceRequired
    } = kcContext;

    const { msg, msgStr, advancedMsg } = i18n;

    const { kcClsx } = getKcClsx({ doUseDefaultCss: false, classes: kcClassesMap });

    const [isFormSubmittable, setIsFormSubmittable] = useState(false);
    const [areTermsAccepted, setAreTermsAccepted] = useState(false);

    useRecaptchaSubmitCallback("kc-register-form");

    const isInvisibleRecaptcha =
        recaptchaRequired && !recaptchaVisible && recaptchaAction !== undefined;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={messagesPerField.exists("global")}
            displayRequiredFields
            headerNode={
                messageHeader !== undefined
                    ? advancedMsg(messageHeader)
                    : msg("registerTitle")
            }
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
                <UserProfileFormFields
                    kcContext={kcContext}
                    i18n={i18n}
                    kcClsx={kcClsx}
                    onIsFormSubmittableValueChange={setIsFormSubmittable}
                    doMakeUserConfirmPassword={doMakeUserConfirmPassword}
                />

                {termsAcceptanceRequired && (
                    <div className="nebari-form-group">
                        <div className="nebari-label">{msg("termsTitle")}</div>
                        <div id="kc-registration-terms-text">{msg("termsText")}</div>
                        <Checkbox
                            id="termsAccepted"
                            name="termsAccepted"
                            checked={areTermsAccepted}
                            onCheckedChange={checked =>
                                setAreTermsAccepted(checked === true)
                            }
                            aria-invalid={messagesPerField.existsError("termsAccepted")}
                        >
                            {msg("acceptTerms")}
                        </Checkbox>
                        {messagesPerField.existsError("termsAccepted") && (
                            <FieldError aria-live="polite" match={true}>
                                {messagesPerField.get("termsAccepted")}
                            </FieldError>
                        )}
                    </div>
                )}

                {recaptchaRequired &&
                    (recaptchaVisible || recaptchaAction === undefined) && (
                        <div className="nebari-form-group">
                            <div
                                className="g-recaptcha"
                                data-size="compact"
                                data-sitekey={recaptchaSiteKey}
                                data-action={recaptchaAction}
                            />
                        </div>
                    )}

                <div className="nebari-form-group">
                    {/* `type` has to be baked into the render element rather than
                        passed as a prop. Base UI merges the render element's own
                        props last, so `Button`'s default `<button type="button" />`
                        wins over a `type` prop and the form never submits. */}
                    {isInvisibleRecaptcha ? (
                        <Button
                            className={clsx("w-full", "g-recaptcha")}
                            data-sitekey={recaptchaSiteKey}
                            data-callback="onSubmitRecaptcha"
                            data-action={recaptchaAction}
                            render={<button type="submit" />}
                        >
                            {msgStr("doRegister")}
                        </Button>
                    ) : (
                        <Button
                            className="w-full"
                            disabled={
                                !isFormSubmittable ||
                                (termsAcceptanceRequired && !areTermsAccepted)
                            }
                            render={<button type="submit" />}
                        >
                            {msgStr("doRegister")}
                        </Button>
                    )}
                </div>
            </form>
        </Template>
    );
}
