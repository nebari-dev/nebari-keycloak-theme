// src/login/pages/Login.tsx
import { useState, type FormEventHandler } from "react";
import { clsx } from "keycloakify/tools/clsx";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { Eye, EyeOff } from "lucide-react";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function Login(
    props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { kcClsx } = getKcClsx({ doUseDefaultCss, classes });

    const { social, realm, url, usernameHidden, login, auth, messagesPerField } = kcContext;

    const { msg, msgStr } = i18n;

    const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const hasLoginError = messagesPerField.existsError("username", "password");

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
            headerNode={msg("loginAccountTitle")}
            socialProvidersNode={
                hasSocialProviders && (
                    <div className="nebari-social-providers">
                        {social.providers!.map(p => (
                            <a
                                key={p.providerId}
                                id={`social-${p.alias}`}
                                className="nebari-social-button"
                                href={p.loginUrl}
                            >
                                {p.providerId === "google" ? (
                                    <img
                                        src={`${import.meta.env.BASE_URL}google-g-logo.svg`}
                                        alt=""
                                        className="nebari-social-icon"
                                    />
                                ) : p.iconClasses ? (
                                    <i
                                        className={clsx(kcClsx("kcCommonLogoIdP"), p.iconClasses)}
                                        aria-hidden="true"
                                    />
                                ) : null}
                                <span>{`Sign in with ${p.displayName}`}</span>
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
                        <Field>
                            <FieldLabel htmlFor="username">
                                {!realm.loginWithEmailAllowed ? msg("username") : !realm.registrationEmailAsUsername ? msg("usernameOrEmail") : msg("email")}
                            </FieldLabel>
                            <Input
                                tabIndex={2}
                                id="username"
                                name="username"
                                defaultValue={login.username ?? ""}
                                type="text"
                                placeholder={msgStr("usernameOrEmail")}
                                autoFocus
                                autoComplete="username"
                                aria-invalid={messagesPerField.existsError("username", "password")}
                            />
                            {hasLoginError && (
                                <FieldError match={true} className="nebari-login-error" aria-live="polite">
                                    {messagesPerField.getFirstError("username", "password")}
                                </FieldError>
                            )}
                        </Field>
                    )}

                    {/* Password Field with visibility toggle */}
                    <Field>
                        <div className="nebari-label-row">
                            <FieldLabel htmlFor="password">{msg("password")}</FieldLabel>
                            {realm.resetPasswordAllowed && (
                                <a tabIndex={5} href={url.loginResetCredentialsUrl} className="nebari-forgot-link">
                                    {msg("doForgotPassword")}
                                </a>
                            )}
                        </div>
                        <Input
                            tabIndex={3}
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder={msgStr("password")}
                            autoComplete="current-password"
                            aria-invalid={hasLoginError}
                            endAdornment={!hasLoginError ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </Button>
                            ) : undefined}
                        />
                        {hasLoginError && (
                            <FieldError match={true} className="nebari-login-error" aria-live="polite">
                                {messagesPerField.getFirstError("username", "password")}
                            </FieldError>
                        )}
                    </Field>

                    {realm.rememberMe && !usernameHidden && (
                        <div className="nebari-form-options">
                            <Checkbox
                                tabIndex={4}
                                id="rememberMe"
                                name="rememberMe"
                                defaultChecked={!!login.rememberMe}
                            >
                                {msg("rememberMe")}
                            </Checkbox>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="nebari-form-group">
                        <input
                            type="hidden"
                            id="id-hidden-input"
                            name="credentialId"
                            value={auth.selectedCredential}
                        />
                        <Button
                            tabIndex={5}
                            className="w-full"
                            name="login"
                            id="kc-login"
                            type="submit"
                            loading={isLoginButtonDisabled}
                            loadingText={msgStr("doLogIn")}
                        >
                            {msgStr("doLogIn")}
                        </Button>
                    </div>
                </form>
            )}
        </Template>
    );
}
