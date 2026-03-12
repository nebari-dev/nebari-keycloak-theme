// src/login/pages/Register.tsx
import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";

/** Eye-open icon */
const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

/** Eye-off icon */
const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

interface PasswordInputProps {
    id: string;
    name: string;
    tabIndex?: number;
    autoComplete?: string;
    "aria-invalid"?: boolean;
}

function PasswordInput({ id, name, tabIndex, autoComplete, "aria-invalid": ariaInvalid }: PasswordInputProps) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: "relative" }}>
            <input
                type={show ? "text" : "password"}
                id={id}
                className="nebari-input"
                name={name}
                tabIndex={tabIndex}
                autoComplete={autoComplete}
                style={{ paddingRight: "2.75rem" }}
                aria-invalid={ariaInvalid}
            />
            <button
                type="button"
                onClick={() => setShow(v => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                    width: "auto",
                    transition: "color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
            >
                {show ? <EyeOffIcon /> : <EyeIcon />}
            </button>
        </div>
    );
}

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
                        {msg("firstName")} <span className="nebari-required-asterisk">*</span>
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
                        {msg("lastName")} <span className="nebari-required-asterisk">*</span>
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
                        {msg("email")} <span className="nebari-required-asterisk">*</span>
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
                            {msg("username")} <span className="nebari-required-asterisk">*</span>
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
                                {msg("password")} <span className="nebari-required-asterisk">*</span>
                            </label>
                            <PasswordInput
                                id="password"
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
                                {msg("passwordConfirm")} <span className="nebari-required-asterisk">*</span>
                            </label>
                            <PasswordInput
                                id="password-confirm"
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

                {/* Submit */}
                <div className="nebari-form-group" style={{ marginTop: "1.5rem" }}>
                    <button type="submit" className="nebari-button nebari-button-primary">
                        {msgStr("doRegister")}
                    </button>
                </div>
            </form>
        </Template>
    );
}
