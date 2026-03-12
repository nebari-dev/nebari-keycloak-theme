// src/login/pages/Login.tsx
import { useState, type FormEventHandler } from "react";
import { clsx } from "keycloakify/tools/clsx";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
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

export default function Login(
    props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { kcClsx } = getKcClsx({ doUseDefaultCss, classes });

    const { social, realm, url, usernameHidden, login, auth, registrationDisabled, messagesPerField } = kcContext;

    const { msg, msgStr } = i18n;

    const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit: FormEventHandler<HTMLFormElement> = () => {
        setIsLoginButtonDisabled(true);
        return true;
    };

    const hasSocialProviders =
        realm.password && social?.providers !== undefined && social.providers.length !== 0;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!messagesPerField.existsError("username", "password")}
            displayInfo={realm.password && realm.registrationAllowed && !registrationDisabled}
            infoNode={
                <div id="kc-registration-container">
                    <div id="kc-registration">
                        <span>
                            {msg("noAccount")}{" "}
                            <a tabIndex={6} href={url.registrationUrl}>
                                {msg("doRegister")}
                            </a>
                        </span>
                    </div>
                </div>
            }
            headerNode={msg("loginAccountTitle")}
            socialProvidersNode={
                hasSocialProviders && (
                    <div className="nebari-social-providers">
                        {social.providers!.map((p: any) => (
                            <a
                                key={p.providerId}
                                id={`social-${p.alias}`}
                                className="nebari-social-button"
                                href={p.loginUrl}
                            >
                                {p.iconClasses && (
                                    <i
                                        className={clsx(kcClsx("kcCommonLogoIdP"), p.iconClasses)}
                                        aria-hidden="true"
                                    />
                                )}
                                <span>{p.displayName}</span>
                            </a>
                        ))}
                    </div>
                )
            }
        >
            {realm.password && (
                <form
                    id="kc-form-login"
                    onSubmit={onSubmit}
                    action={url.loginAction}
                    method="post"
                >
                    {/* Username / Email Field */}
                    {!usernameHidden && (
                        <div className="nebari-form-group">
                            <label htmlFor="username" className="nebari-label">
                                {!realm.loginWithEmailAllowed
                                    ? msg("username")
                                    : !realm.registrationEmailAsUsername
                                    ? msg("usernameOrEmail")
                                    : msg("email")}
                            </label>
                            <input
                                tabIndex={2}
                                id="username"
                                className="nebari-input"
                                name="username"
                                defaultValue={login.username ?? ""}
                                type="text"
                                autoFocus
                                autoComplete="username"
                                aria-invalid={messagesPerField.existsError("username", "password")}
                            />
                            {messagesPerField.existsError("username", "password") && (
                                <span className="nebari-input-error" aria-live="polite">
                                    {messagesPerField.getFirstError("username", "password")}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Password Field with visibility toggle */}
                    <div className="nebari-form-group">
                        <label htmlFor="password" className="nebari-label">
                            {msg("password")}
                        </label>
                        <div style={{ position: "relative" }}>
                            <input
                                tabIndex={3}
                                id="password"
                                className="nebari-input"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                style={{ paddingRight: "2.75rem" }}
                                aria-invalid={messagesPerField.existsError("username", "password")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
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
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="nebari-form-options">
                        {realm.rememberMe && !usernameHidden ? (
                            <div className="nebari-checkbox">
                                <input
                                    tabIndex={4}
                                    id="rememberMe"
                                    name="rememberMe"
                                    type="checkbox"
                                    defaultChecked={!!login.rememberMe}
                                />
                                <label htmlFor="rememberMe">{msg("rememberMe")}</label>
                            </div>
                        ) : (
                            <span />
                        )}

                        {auth.showResetCredentials && (
                            <a tabIndex={5} href={url.loginResetCredentialsUrl}>
                                {msg("doForgotPassword")}
                            </a>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="nebari-form-group">
                        <input
                            type="hidden"
                            id="id-hidden-input"
                            name="credentialId"
                            value={auth.selectedCredential}
                        />
                        <button
                            tabIndex={5}
                            className="nebari-button nebari-button-primary"
                            name="login"
                            id="kc-login"
                            type="submit"
                            disabled={isLoginButtonDisabled}
                        >
                            {msgStr("doLogIn")}
                        </button>
                    </div>
                </form>
            )}
        </Template>
    );
}
