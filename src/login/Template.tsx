import { useEffect } from "react";
import { clsx } from "keycloakify/tools/clsx";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import { useSetClassName } from "keycloakify/tools/useSetClassName";
import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";

export default function Template(props: TemplateProps<KcContext, I18n>) {
    const {
        displayInfo = false,
        displayMessage = true,
        displayRequiredFields = false,
        headerNode,
        socialProvidersNode = null,
        infoNode = null,
        documentTitle,
        bodyClassName,
        kcContext,
        i18n,
        doUseDefaultCss,
        classes,
        children
    } = props;

    const { kcClsx } = getKcClsx({ doUseDefaultCss, classes });
    const { msg, msgStr } = i18n;

    // Detect dark mode
    const isDarkMode = typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    useEffect(() => {
        document.title = documentTitle ?? msgStr("loginTitle", kcContext.realm.displayName);
    }, [documentTitle, kcContext.realm.displayName, msgStr]);

    useSetClassName({
        qualifiedName: "html",
        className: kcClsx("kcHtmlClass")
    });

    useSetClassName({
        qualifiedName: "body",
        className: bodyClassName ?? kcClsx("kcBodyClass")
    });

    return (
        <div className="nebari-login-wrapper">
            <div className="nebari-login-container">
                <div className="nebari-login-card">
                    {/* Logo Header */}
                    <div className="nebari-logo-header">
                        <img
                            src={isDarkMode ? "/logo/Nebari-Logo-Horizontal-Lockup-White-text.svg" : "/logo/Nebari-Logo-Horizontal-Lockup.png"}
                            alt="Nebari"
                            className="nebari-logo"
                        />
                    </div>

                    {/* Page Title */}
                    <div className="nebari-header">
                        {headerNode !== undefined ? (
                            typeof headerNode === "string" ? (
                                <h1 className="nebari-title">{headerNode}</h1>
                            ) : (
                                <div className="nebari-title">{headerNode}</div>
                            )
                        ) : (
                            <h1 className="nebari-title">
                                {msg("loginTitleHtml", kcContext.realm.displayNameHtml)}
                            </h1>
                        )}
                    </div>

                    {/* Alert Messages */}
                    {displayMessage && kcContext.message !== undefined && (
                        <div className={clsx("nebari-alert", `nebari-alert-${kcContext.message.type}`)}>
                            <div className="nebari-alert-icon">
                                {kcContext.message.type === "success" && (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {kcContext.message.type === "warning" && (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {kcContext.message.type === "error" && (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {kcContext.message.type === "info" && (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="nebari-alert-content">
                                <span dangerouslySetInnerHTML={{ __html: kcContext.message.summary }} />
                            </div>
                        </div>
                    )}

                    {/* Main Form Content */}
                    <div className="nebari-form-container">
                        {children}
                    </div>

                    {/* Required Fields Notice */}
                    {displayRequiredFields && (
                        <div className="nebari-required-notice">
                            <span className="nebari-required-asterisk">*</span> {msg("requiredFields")}
                        </div>
                    )}

                    {/* Social Providers */}
                    {socialProvidersNode && (
                        <div className="nebari-social-section">
                            {socialProvidersNode}
                        </div>
                    )}

                    {/* Info Section (Registration Link, etc) */}
                    {displayInfo && infoNode && (
                        <div className="nebari-info-section">
                            {infoNode}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="nebari-footer">
                        <p className="nebari-footer-text">
                            Powered by <a href="https://nebari.dev" target="_blank" rel="noopener noreferrer">Nebari</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
