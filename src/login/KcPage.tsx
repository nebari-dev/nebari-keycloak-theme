import { Suspense, lazy } from "react";
import type { KcContext } from "./KcContext";
import { useI18n } from "./i18n";
import DefaultPage from "keycloakify/login/DefaultPage";
import Template from "./Template";

// Lazy load custom pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Info = lazy(() => import("./pages/Info"));
const Error = lazy(() => import("./pages/Error"));

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
                    default:
                        // For all other pages, use the default Keycloakify implementation
                        return (
                            <DefaultPage
                                kcContext={kcContext}
                                i18n={i18n}
                                classes={undefined}
                                Template={Template}
                                doUseDefaultCss={false}
                                UserProfileFormFields={lazy(() => import("keycloakify/login/UserProfileFormFields"))}
                                doMakeUserConfirmPassword={true}
                            />
                        );
                }
            })()}
        </Suspense>
    );
}
