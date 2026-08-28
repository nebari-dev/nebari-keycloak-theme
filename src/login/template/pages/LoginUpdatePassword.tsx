import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/shadcn/field";
import { Label } from "@/components/shadcn/label";
import { PasswordInput } from "../PasswordInput";

export default function LoginUpdatePassword(
    props: PageProps<Extract<KcContext, { pageId: "login-update-password.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { msg, msgStr } = i18n;
    const { url, messagesPerField, isAppInitiatedAction } = kcContext;

    const newPasswordError = messagesPerField.existsError("password")
        ? messagesPerField.get("password")
        : undefined;
    const confirmError = messagesPerField.existsError("password-confirm")
        ? messagesPerField.get("password-confirm")
        : undefined;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!messagesPerField.existsError("password", "password-confirm")}
            headerNode={msg("updatePasswordTitle")}
        >
            <form
                id="kc-passwd-update-form"
                action={url.loginAction}
                method="post"
                className="flex flex-col gap-6"
            >
                {/* Hidden username for password managers */}
                <input name="username" readOnly style={{ display: "none" }} type="text" />

                <Field>
                    <FieldLabel htmlFor="password-new">{msgStr("passwordNew")}</FieldLabel>
                    <PasswordInput
                        aria-invalid={newPasswordError !== undefined}
                        autoComplete="new-password"
                        hideLabel={msgStr("hidePassword")}
                        id="password-new"
                        name="password-new"
                        showLabel={msgStr("showPassword")}
                    />
                    {newPasswordError !== undefined && (
                        <FieldError
                            aria-live="polite"
                            dangerouslySetInnerHTML={{ __html: kcSanitize(newPasswordError) }}
                        />
                    )}
                </Field>

                <Field>
                    <FieldLabel htmlFor="password-confirm">
                        {msgStr("passwordConfirm")}
                    </FieldLabel>
                    <PasswordInput
                        aria-invalid={confirmError !== undefined}
                        autoComplete="new-password"
                        hideLabel={msgStr("hidePassword")}
                        id="password-confirm"
                        name="password-confirm"
                        showLabel={msgStr("showPassword")}
                    />
                    {confirmError !== undefined && (
                        <FieldError
                            aria-live="polite"
                            dangerouslySetInnerHTML={{ __html: kcSanitize(confirmError) }}
                        />
                    )}
                </Field>

                <div className="flex items-center gap-2">
                    <Checkbox defaultChecked id="logout-sessions" name="logout-sessions" value="on" />
                    <Label htmlFor="logout-sessions" className="font-normal">
                        {msg("logoutOtherSessions")}
                    </Label>
                </div>

                <div className="flex flex-col gap-3">
                    <Button className="w-full" type="submit">
                        {msgStr("doSubmit")}
                    </Button>
                    {isAppInitiatedAction && (
                        <Button
                            className="w-full"
                            name="cancel-aia"
                            type="submit"
                            value="true"
                            variant="outline"
                        >
                            {msgStr("doCancel")}
                        </Button>
                    )}
                </div>
            </form>
        </Template>
    );
}
