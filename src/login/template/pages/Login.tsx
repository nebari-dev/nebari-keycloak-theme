import { useState, type FormEventHandler } from "react";
import { clsx } from "keycloakify/tools/clsx";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import { useScript } from "keycloakify/login/pages/Login.useScript";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/shadcn/field";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { PasswordInput } from "../PasswordInput";
import { getThemeDefinition, parseThemeBrandingConfig } from "../../../themes/themeCatalog";

export default function Login(
    props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { kcClsx } = getKcClsx({ doUseDefaultCss, classes });
    const {
        social,
        realm,
        url,
        usernameHidden,
        login,
        auth,
        messagesPerField,
        enableWebAuthnConditionalUI,
        authenticators
    } = kcContext;
    const { msg, msgStr } = i18n;

    const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);

    /* Loads Keycloak's WebAuthn script and wires it to the button below. It
       no-ops unless the realm enabled conditional passkeys, so it is safe to
       call unconditionally — and it must be, being a hook. */
    const webAuthnButtonId = "authenticateWebAuthnButton";

    useScript({ webAuthnButtonId, kcContext, i18n });

    const hasLoginError = messagesPerField.existsError("username", "password");

    const themeDefinition = getThemeDefinition(kcContext.themeName);
    const branding = parseThemeBrandingConfig(
        themeDefinition,
        msgStr(themeDefinition.brandingMessageKey)
    );

    const onSubmit: FormEventHandler<HTMLFormElement> = () => {
        setIsLoginButtonDisabled(true);
        return true;
    };

    const hasSocialProviders =
        social?.providers !== undefined && social.providers.length !== 0;
    const showPasswordForm =
        realm.password &&
        (branding.loginMode === "password-and-providers" || !hasSocialProviders);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!hasLoginError}
            headerNode={msg("loginAccountTitle")}
            socialProvidersNode={
                hasSocialProviders && (
                    <div className="flex flex-col gap-3">
                        {showPasswordForm && (
                            <div className="after:border-border relative text-center after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                                <span className="bg-card text-muted-foreground relative z-10 px-2 text-sm">
                                    {msg("identity-provider-login-label")}
                                </span>
                            </div>
                        )}
                        {social.providers!.map(p => (
                            <Button
                                key={p.providerId}
                                id={`social-${p.alias}`}
                                variant="outline"
                                className="w-full"
                                asChild
                            >
                                <a href={p.loginUrl}>
                                    {p.iconClasses && (
                                        <i
                                            className={clsx(
                                                kcClsx("kcCommonLogoIdP"),
                                                p.iconClasses
                                            )}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>{p.displayName}</span>
                                </a>
                            </Button>
                        ))}
                    </div>
                )
            }
        >
            {showPasswordForm && (
                <form
                    id="kc-form-login"
                    onSubmit={onSubmit}
                    action={url.loginAction}
                    method="post"
                    className="flex flex-col gap-6"
                >
                    {!usernameHidden && (
                        <Field>
                            <FieldLabel htmlFor="username">
                                {!realm.loginWithEmailAllowed
                                    ? msg("username")
                                    : !realm.registrationEmailAsUsername
                                      ? msg("usernameOrEmail")
                                      : msg("email")}
                            </FieldLabel>
                            <Input
                                className="bg-muted"
                                tabIndex={2}
                                id="username"
                                name="username"
                                defaultValue={login.username ?? ""}
                                type="text"
                                autoFocus
                                autoComplete={
                                    enableWebAuthnConditionalUI
                                        ? "username webauthn"
                                        : "username"
                                }
                                aria-invalid={hasLoginError}
                            />
                        </Field>
                    )}

                    <Field>
                        <div className="flex items-center justify-between">
                            <FieldLabel htmlFor="password">{msg("password")}</FieldLabel>
                            {realm.resetPasswordAllowed && (
                                <a
                                    tabIndex={5}
                                    href={url.loginResetCredentialsUrl}
                                    className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                                >
                                    {msg("doForgotPassword")}
                                </a>
                            )}
                        </div>
                        <PasswordInput
                            aria-invalid={hasLoginError}
                            autoComplete="current-password"
                            hideLabel={msgStr("hidePassword")}
                            id="password"
                            name="password"
                            showLabel={msgStr("showPassword")}
                            tabIndex={3}
                        />
                        {hasLoginError && (
                            <FieldError aria-live="polite">
                                {messagesPerField.getFirstError("username", "password")}
                            </FieldError>
                        )}
                    </Field>

                    {realm.rememberMe && !usernameHidden && (
                        <div className="flex items-center gap-2">
                            <Checkbox
                                tabIndex={4}
                                id="rememberMe"
                                name="rememberMe"
                                defaultChecked={!!login.rememberMe}
                            />
                            <Label htmlFor="rememberMe" className="font-normal">
                                {msg("rememberMe")}
                            </Label>
                        </div>
                    )}

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
                        disabled={isLoginButtonDisabled}
                    >
                        {msgStr("doLogIn")}
                    </Button>
                </form>
            )}

            {/* Conditional passkeys. Keycloak's own script, initialized by
                `useScript`, reads the button and populates these hidden fields
                from the WebAuthn credential before posting them back — so the
                forms have to exist even though nothing here fills them in.
                `authn_select` carries the credential ids the realm offers. */}
            {enableWebAuthnConditionalUI && (
                <>
                    <form id="webauth" action={url.loginAction} method="post">
                        <input type="hidden" id="clientDataJSON" name="clientDataJSON" />
                        <input
                            type="hidden"
                            id="authenticatorData"
                            name="authenticatorData"
                        />
                        <input type="hidden" id="signature" name="signature" />
                        <input type="hidden" id="credentialId" name="credentialId" />
                        <input type="hidden" id="userHandle" name="userHandle" />
                        <input type="hidden" id="error" name="error" />
                    </form>

                    {authenticators !== undefined &&
                        authenticators.authenticators.length !== 0 && (
                            <form id="authn_select">
                                {authenticators.authenticators.map(authenticator => (
                                    <input
                                        key={authenticator.credentialId}
                                        type="hidden"
                                        name="authn_use_chk"
                                        readOnly
                                        value={authenticator.credentialId}
                                    />
                                ))}
                            </form>
                        )}

                    <Button
                        className="w-full"
                        id={webAuthnButtonId}
                        type="button"
                        variant="outline"
                    >
                        {msgStr("passkey-doAuthenticate")}
                    </Button>
                </>
            )}
        </Template>
    );
}
