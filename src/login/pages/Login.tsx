// src/login/pages/Login.tsx
import { useState, type FormEventHandler } from "react";
import { clsx } from "keycloakify/tools/clsx";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";

export default function Login(
    props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { kcClsx } = getKcClsx({
        doUseDefaultCss,
        classes
    });

    const { social, realm, url, usernameHidden, login, auth, registrationDisabled, messagesPerField } = kcContext;

    const { msg, msgStr } = i18n;

    const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);

    const onSubmit: FormEventHandler<HTMLFormElement> = () => {
        setIsLoginButtonDisabled(true);
        return true;
    };

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
                realm.password && social?.providers !== undefined && social.providers.length !== 0 && (
                    <div>
                        <div className="nebari-social-header">
                            {msg("identity-provider-login-label")}
                        </div>
                        <div className="nebari-social-providers">
                            {social.providers.map((p: any) => (
                                <a
                                    key={p.providerId}
                                    id={`social-${p.alias}`}
                                    className="nebari-social-button"
                                    href={p.loginUrl}
                                >
                                    {p.iconClasses && (
                                        <i className={clsx(kcClsx("kcCommonLogoIdP"), p.iconClasses)} aria-hidden="true"></i>
                                    )}
                                    <span>{p.displayName}</span>
                                </a>
                            ))}
                        </div>
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
                    {/* Username/Email Field */}
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

                    {/* Password Field */}
                    <div className="nebari-form-group">
                        <label htmlFor="password" className="nebari-label">
                            {msg("password")}
                        </label>

                        <input
                            tabIndex={3}
                            id="password"
                            className="nebari-input"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            aria-invalid={messagesPerField.existsError("username", "password")}
                        />
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="nebari-form-options">
                        {realm.rememberMe && !usernameHidden && (
                            <div className="nebari-checkbox">
                                <input
                                    tabIndex={4}
                                    id="rememberMe"
                                    name="rememberMe"
                                    type="checkbox"
                                    defaultChecked={!!login.rememberMe}
                                />
                                <label htmlFor="rememberMe">
                                    {msg("rememberMe")}
                                </label>
                            </div>
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
