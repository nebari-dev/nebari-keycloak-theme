import type { PageProps } from "keycloakify/login/pages/PageProps";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";

export default function LoginResetPassword(props: PageProps<Extract<KcContext, { pageId: "login-reset-password.ftl" }>, I18n>) {
    const { kcContext, i18n, Template } = props;
    const { url, realm, auth, messagesPerField } = kcContext;
    const { msg, msgStr } = i18n;

    const labelKey = !realm.loginWithEmailAllowed
        ? "username"
        : !realm.registrationEmailAsUsername
            ? "usernameOrEmail"
            : "email";

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            classes={undefined}
            displayInfo
            displayMessage={!messagesPerField.existsError("username")}
            headerNode={msg("emailForgotTitle")}
            infoNode={
                realm.duplicateEmailsAllowed
                    ? msg("emailInstructionUsername")
                    : msg("emailInstruction")
            }
        >
            <form id="kc-reset-password-form" action={url.loginAction} method="post">
                <div className="nebari-form-group">
                    <label className="nebari-label" htmlFor="username">
                        {msg(labelKey)}
                    </label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        className={`nebari-input${messagesPerField.existsError("username") ? " nebari-input-error" : ""}`}
                        autoFocus
                        defaultValue={auth.attemptedUsername ?? ""}
                        aria-invalid={messagesPerField.existsError("username")}
                    />
                    {messagesPerField.existsError("username") && (
                        <span
                            className="nebari-field-error"
                            aria-live="polite"
                            dangerouslySetInnerHTML={{ __html: kcSanitize(messagesPerField.get("username")) }}
                        />
                    )}
                </div>

                <div className="nebari-form-actions">
                    <a href={url.loginUrl} className="nebari-link">
                        ← {msgStr("backToLogin")}
                    </a>
                    <button type="submit" className="nebari-button nebari-button-primary nebari-button-full">
                        {msgStr("doSubmit")}
                    </button>
                </div>
            </form>
        </Template>
    );
}
