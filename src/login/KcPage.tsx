import { Suspense, lazy, Component, type ReactNode } from "react";
import type { KcContext } from "./KcContext";
import { useI18n } from "./i18n";
import DefaultPage from "keycloakify/login/DefaultPage";
import { getLoginUiSet } from "./uiSets";

// Error boundary: catches DefaultPage's assert(false) for unrecognised Keycloak
// page IDs (e.g. pages introduced in KC 26 that keycloakify doesn't know yet).
class DefaultPageErrorBoundary extends Component<
    { children: ReactNode },
    { hasError: boolean; pageId?: string }
> {
    state = { hasError: false, pageId: undefined as string | undefined };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="nebari-login-wrapper">
                    <div className="nebari-login-container">
                        <div className="nebari-login-card" style={{ textAlign: "center" }}>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                This Keycloak page is not yet styled. Please contact your administrator.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const UserProfileFormFields = lazy(() => import("keycloakify/login/UserProfileFormFields"));

// Fallback component for lazy loading
const Fallback = () => (
    <div className="nebari-login-wrapper">
        <div className="nebari-login-container">
            <div className="nebari-login-card">
                <div style={{ textAlign: "center", padding: "20px" }}>
                    Loading...
                </div>
            </div>
        </div>
    </div>
);

export default function KcPage(props: { kcContext: KcContext }) {
    const { kcContext } = props;
    const { i18n } = useI18n({ kcContext });

    /* Which design system renders this realm's login pages. Resolved from the
       theme Keycloak reports, so one build serves every theme in the catalog. */
    const {
        Template,
        Login,
        Register,
        Info,
        Error,
        LoginResetPassword,
        LoginUpdatePassword,
        LoginVerifyEmail,
        LoginUpdateProfile
    } = getLoginUiSet(kcContext.themeName);

    return (
        <Suspense fallback={<Fallback />}>
            {(() => {
                switch (kcContext.pageId) {
                    case "login.ftl":
                        return (
                            <Login
                                {...{ kcContext, i18n, Template }}
                                classes={undefined}
                                doUseDefaultCss={false}
                            />
                        );
                    case "register.ftl":
                        return (
                            <Register
                                {...{ kcContext, i18n, Template }}
                                classes={undefined}
                                doUseDefaultCss={false}
                            />
                        );
                    case "info.ftl":
                        return (
                            <Info
                                {...{ kcContext, i18n, Template }}
                                classes={undefined}
                                doUseDefaultCss={false}
                            />
                        );
                    case "error.ftl":
                        return (
                            <Error
                                {...{ kcContext, i18n, Template }}
                                classes={undefined}
                                doUseDefaultCss={false}
                            />
                        );
                    case "login-reset-password.ftl":
                        return (
                            <LoginResetPassword
                                {...{ kcContext, i18n, Template }}
                                classes={undefined}
                                doUseDefaultCss={false}
                            />
                        );
                    case "login-update-password.ftl":
                        return (
                            <LoginUpdatePassword
                                {...{ kcContext, i18n, Template }}
                                classes={undefined}
                                doUseDefaultCss={false}
                            />
                        );
                    case "login-verify-email.ftl":
                        return (
                            <LoginVerifyEmail
                                {...{ kcContext, i18n, Template }}
                                classes={undefined}
                                doUseDefaultCss={false}
                            />
                        );
                    case "login-update-profile.ftl":
                        return (
                            <LoginUpdateProfile
                                {...{ kcContext, i18n, Template }}
                                classes={undefined}
                                doUseDefaultCss={false}
                                UserProfileFormFields={UserProfileFormFields}
                                doMakeUserConfirmPassword
                            />
                        );
                    default:
                        // For pages we haven't custom-implemented, use the
                        // Keycloak default CSS so DefaultPage renders correctly.
                        // Wrapped in an error boundary so unknown KC 26 page IDs
                        // degrade gracefully instead of crashing with assert(false).
                        return (
                            <DefaultPageErrorBoundary>
                                <DefaultPage
                                    kcContext={kcContext}
                                    i18n={i18n}
                                    classes={undefined}
                                    Template={Template}
                                    doUseDefaultCss={true}
                                    UserProfileFormFields={lazy(() => import("keycloakify/login/UserProfileFormFields"))}
                                    doMakeUserConfirmPassword={true}
                                />
                            </DefaultPageErrorBoundary>
                        );
                }
            })()}
        </Suspense>
    );
}
