import { useState } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";

const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

function PasswordField({ id, name, error, label }: { id: string; name: string; error?: string; label: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="nebari-form-group">
            <label className="nebari-label" htmlFor={id}>{label}</label>
            <div style={{ position: "relative" }}>
                <input
                    type={show ? "text" : "password"}
                    id={id}
                    name={name}
                    className={`nebari-input${error ? " nebari-input-error" : ""}`}
                    autoComplete="new-password"
                    aria-invalid={!!error}
                    style={{ paddingRight: "2.75rem" }}
                />
                <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}
                >
                    {show ? <EyeOffIcon /> : <EyeIcon />}
                </button>
            </div>
            {error && (
                <span className="nebari-field-error" aria-live="polite"
                    dangerouslySetInnerHTML={{ __html: kcSanitize(error) }} />
            )}
        </div>
    );
}

export default function LoginUpdatePassword(props: PageProps<Extract<KcContext, { pageId: "login-update-password.ftl" }>, I18n>) {
    const { kcContext, i18n, Template } = props;
    const { url, messagesPerField, isAppInitiatedAction } = kcContext;
    const { msg, msgStr } = i18n;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            classes={undefined}
            displayMessage={!messagesPerField.existsError("password", "password-confirm")}
            headerNode={msg("updatePasswordTitle")}
        >
            <form id="kc-passwd-update-form" action={url.loginAction} method="post">
                {/* Hidden username for password managers */}
                <input type="text" name="username" style={{ display: "none" }} readOnly />

                <PasswordField
                    id="password-new"
                    name="password-new"
                    label={msgStr("passwordNew")}
                    error={messagesPerField.existsError("password", "password-confirm")
                        ? messagesPerField.get("password") : undefined}
                />
                <PasswordField
                    id="password-confirm"
                    name="password-confirm"
                    label={msgStr("passwordConfirm")}
                    error={messagesPerField.existsError("password-confirm")
                        ? messagesPerField.get("password-confirm") : undefined}
                />

                <div className="nebari-form-group">
                    <label className="nebari-checkbox-label">
                        <input
                            type="checkbox"
                            id="logout-sessions"
                            name="logout-sessions"
                            value="on"
                            defaultChecked
                            className="nebari-checkbox"
                        />
                        {msg("logoutOtherSessions")}
                    </label>
                </div>

                <div className="nebari-form-actions" style={{ marginTop: "1.25rem" }}>
                    {isAppInitiatedAction && (
                        <button type="submit" name="cancel-aia" value="true" className="nebari-button nebari-button-secondary">
                            {msgStr("doCancel")}
                        </button>
                    )}
                    <button type="submit" className={`nebari-button nebari-button-primary${isAppInitiatedAction ? "" : " nebari-button-full"}`}>
                        {msgStr("doSubmit")}
                    </button>
                </div>
            </form>
        </Template>
    );
}
