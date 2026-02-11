// src/login/pages/Register.tsx
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";

export default function Register(
    props: PageProps<Extract<KcContext, { pageId: "register.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { url, messagesPerField, realm, passwordRequired, recaptchaRequired, recaptchaSiteKey } = kcContext;

    const { msg, msgStr } = i18n;

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
                {/* First Name */}
                <div className="nebari-form-group">
                    <label htmlFor="firstName" className="nebari-label">
                        {msg("firstName")}
                    </label>
                    <input
                        type="text"
                        id="firstName"
                        className="nebari-input"
                        name="firstName"
                        autoComplete="given-name"
                        aria-invalid={messagesPerField.existsError("firstName")}
                    />
                    {messagesPerField.existsError("firstName") && (
                        <span className="nebari-input-error" aria-live="polite">
                            {messagesPerField.get("firstName")}
                        </span>
                    )}
                </div>

                {/* Last Name */}
                <div className="nebari-form-group">
                    <label htmlFor="lastName" className="nebari-label">
                        {msg("lastName")}
                    </label>
                    <input
                        type="text"
                        id="lastName"
                        className="nebari-input"
                        name="lastName"
                        autoComplete="family-name"
                        aria-invalid={messagesPerField.existsError("lastName")}
                    />
                    {messagesPerField.existsError("lastName") && (
                        <span className="nebari-input-error" aria-live="polite">
                            {messagesPerField.get("lastName")}
                        </span>
                    )}
                </div>

                {/* Email */}
                <div className="nebari-form-group">
                    <label htmlFor="email" className="nebari-label">
                        {msg("email")}
                    </label>
                    <input
                        type="email"
                        id="email"
                        className="nebari-input"
                        name="email"
                        autoComplete="email"
                        aria-invalid={messagesPerField.existsError("email")}
                    />
                    {messagesPerField.existsError("email") && (
                        <span className="nebari-input-error" aria-live="polite">
                            {messagesPerField.get("email")}
                        </span>
                    )}
                </div>

                {/* Username (if not using email as username) */}
                {!realm.registrationEmailAsUsername && (
                    <div className="nebari-form-group">
                        <label htmlFor="username" className="nebari-label">
                            {msg("username")}
                        </label>
                        <input
                            type="text"
                            id="username"
                            className="nebari-input"
                            name="username"
                            autoComplete="username"
                            aria-invalid={messagesPerField.existsError("username")}
                        />
                        {messagesPerField.existsError("username") && (
                            <span className="nebari-input-error" aria-live="polite">
                                {messagesPerField.get("username")}
                            </span>
                        )}
                    </div>
                )}

                {/* Password */}
                {passwordRequired && (
                    <>
                        <div className="nebari-form-group">
                            <label htmlFor="password" className="nebari-label">
                                {msg("password")}
                            </label>
                            <input
                                type="password"
                                id="password"
                                className="nebari-input"
                                name="password"
                                autoComplete="new-password"
                                aria-invalid={messagesPerField.existsError("password", "password-confirm")}
                            />
                            {messagesPerField.existsError("password") && (
                                <span className="nebari-input-error" aria-live="polite">
                                    {messagesPerField.get("password")}
                                </span>
                            )}
                        </div>

                        <div className="nebari-form-group">
                            <label htmlFor="password-confirm" className="nebari-label">
                                {msg("passwordConfirm")}
                            </label>
                            <input
                                type="password"
                                id="password-confirm"
                                className="nebari-input"
                                name="password-confirm"
                                autoComplete="new-password"
                                aria-invalid={messagesPerField.existsError("password-confirm")}
                            />
                            {messagesPerField.existsError("password-confirm") && (
                                <span className="nebari-input-error" aria-live="polite">
                                    {messagesPerField.get("password-confirm")}
                                </span>
                            )}
                        </div>
                    </>
                )}

                {/* reCAPTCHA */}
                {recaptchaRequired && (
                    <div className="nebari-form-group">
                        <div className="g-recaptcha" data-size="compact" data-sitekey={recaptchaSiteKey} />
                    </div>
                )}

                {/* Submit Button */}
                <div className="nebari-form-group">
                    <button
                        className="nebari-button nebari-button-primary"
                        type="submit"
                    >
                        {msgStr("doRegister")}
                    </button>
                </div>
            </form>
        </Template>
    );
}
