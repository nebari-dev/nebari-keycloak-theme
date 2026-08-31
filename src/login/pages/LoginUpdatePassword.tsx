import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { PasswordField } from "@/components/nebari/PasswordField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

export default function LoginUpdatePassword(props: PageProps<Extract<KcContext, { pageId: "login-update-password.ftl" }>, I18n>) {
    const { kcContext, i18n, Template } = props;
    const { url, messagesPerField, isAppInitiatedAction } = kcContext;
    const { msg, msgStr } = i18n;

    const newPasswordError = messagesPerField.existsError("password", "password-confirm")
        ? messagesPerField.get("password")
        : undefined;
    const confirmError = messagesPerField.existsError("password-confirm")
        ? messagesPerField.get("password-confirm")
        : undefined;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            classes={undefined}
            displayMessage={!messagesPerField.existsError("password", "password-confirm")}
            headerNode={
                <div className="nebari-heading-group">
                    <h1 className="nebari-title">{msg("updatePasswordTitle")}</h1>
                    <p className="nebari-subtitle">Change your password to activate your account.</p>
                </div>
            }
        >
            <form id="kc-passwd-update-form" action={url.loginAction} method="post">
                {/* Hidden username for password managers */}
                <input name="username" readOnly style={{ display: "none" }} type="text" />

                <Field>
                    <FieldLabel htmlFor="password-new">{msgStr("passwordNew")}</FieldLabel>
                    <PasswordField
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
                            match={true}
                        />
                    )}
                </Field>

                <Field>
                    <FieldLabel htmlFor="password-confirm">{msgStr("passwordConfirm")}</FieldLabel>
                    <PasswordField
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
                            match={true}
                        />
                    )}
                </Field>

                <div className="nebari-form-options">
                    <Checkbox defaultChecked id="logout-sessions" name="logout-sessions" value="on">
                        {msg("logoutOtherSessions")}
                    </Checkbox>
                </div>

                {/* `type` is baked into each render element: Base UI merges the render
                    element's props last, so `Button`'s default `<button type="button" />`
                    would win over a `type` prop and neither action would submit. */}
                <div className="nebari-form-actions">
                    {isAppInitiatedAction && (
                        <Button
                            render={<button name="cancel-aia" type="submit" value="true" />}
                            variant="outline"
                        >
                            {msgStr("doCancel")}
                        </Button>
                    )}
                    <Button
                        className={isAppInitiatedAction ? undefined : "w-full"}
                        render={<button type="submit" />}
                    >
                        {msgStr("doSubmit")}
                    </Button>
                </div>
            </form>
        </Template>
    );
}
