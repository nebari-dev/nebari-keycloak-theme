import { useState } from "react";
import { clsx } from "keycloakify/tools/clsx";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import { FieldError } from "@/components/shadcn/field";
import { Label } from "@/components/shadcn/label";
import { kcClassesMap } from "../userProfileClasses";
import { useRecaptchaSubmitCallback } from "../../recaptcha";

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
            displayInfo
            headerNode={
                messageHeader !== undefined
                    ? advancedMsg(messageHeader)
                    : msg("templateRegisterTitle")
            }
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
                <UserProfileFormFields
                    kcContext={kcContext}
                    i18n={i18n}
                    kcClsx={kcClsx}
                    onIsFormSubmittableValueChange={setIsFormSubmittable}
                    doMakeUserConfirmPassword={doMakeUserConfirmPassword}
                />

                {termsAcceptanceRequired && (
                    <div className="flex flex-col gap-3">
                        <div className="text-sm font-medium">{msg("termsTitle")}</div>
                        <div
                            id="kc-registration-terms-text"
                            className="text-muted-foreground text-sm"
                        >
                            {msg("termsText")}
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="termsAccepted"
                                name="termsAccepted"
                                checked={areTermsAccepted}
                                onCheckedChange={checked =>
                                    setAreTermsAccepted(checked === true)
                                }
                                aria-invalid={messagesPerField.existsError(
                                    "termsAccepted"
                                )}
                            />
                            <Label htmlFor="termsAccepted" className="font-normal">
                                {msg("acceptTerms")}
                            </Label>
                        </div>
                        {messagesPerField.existsError("termsAccepted") && (
                            <FieldError aria-live="polite">
                                {messagesPerField.get("termsAccepted")}
                            </FieldError>
                        )}
                    </div>
                )}

                {recaptchaRequired &&
                    (recaptchaVisible || recaptchaAction === undefined) && (
                        <div
                            className="g-recaptcha"
                            data-size="compact"
                            data-sitekey={recaptchaSiteKey}
                            data-action={recaptchaAction}
                        />
                    )}

                {isInvisibleRecaptcha ? (
                    <Button
                        className={clsx("w-full", "g-recaptcha")}
                        data-sitekey={recaptchaSiteKey}
                        data-callback="onSubmitRecaptcha"
                        data-action={recaptchaAction}
                        type="submit"
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
                        type="submit"
                    >
                        {msgStr("doRegister")}
                    </Button>
                )}
            </form>
        </Template>
    );
}
