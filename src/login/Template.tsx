import { useEffect, useRef, useState } from "react";
import { kcSanitize } from "keycloakify/lib/kcSanitize";
import { clsx } from "keycloakify/tools/clsx";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import { useSetClassName } from "keycloakify/tools/useSetClassName";
import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";

const STORAGE_KEY = "nebari-theme";

function getInitialTheme(): "dark" | "light" {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const SunIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const MoonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const HelpIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

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

    // Reactively track dark/light mode preference
    const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
    const isDarkMode = theme === "dark";
    const [showHelp, setShowHelp] = useState(false);
    const helpRef = useRef<HTMLDivElement>(null);

    // Apply data-theme to <html> and persist to localStorage whenever it changes
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    useEffect(() => {
        if (!showHelp) return;
        function handleClickOutside(e: MouseEvent) {
            if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
                setShowHelp(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showHelp]);

    // Follow OS preference changes only when no manual override is stored
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem(STORAGE_KEY)) {
                setTheme(e.matches ? "dark" : "light");
            }
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

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
                            src={isDarkMode
                                ? "/logo/nebari-logo-dark.svg"
                                : "/logo/nebari-logo-light.svg"}
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
                                <span dangerouslySetInnerHTML={{ __html: kcSanitize(kcContext.message.summary) }} />
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
                            <div className="nebari-divider">
                                <span className="nebari-divider-text">
                                    {msgStr("identity-provider-login-label")}
                                </span>
                            </div>
                            {socialProvidersNode}
                        </div>
                    )}

                    {/* Info Section (Registration Link, etc) */}
                    {displayInfo && infoNode && (
                        <div className="nebari-info-section">
                            {infoNode}
                        </div>
                    )}

                    {/* Card controls — top-right corner */}
                    <div className="nebari-card-controls">
                        <div className="nebari-help-wrap" ref={helpRef}>
                            <button
                                className="nebari-help-btn"
                                onClick={() => setShowHelp(v => !v)}
                                aria-label="About this login"
                                aria-expanded={showHelp}
                            >
                                <HelpIcon />
                            </button>
                            {showHelp && (
                                <div className="nebari-help-tooltip" role="tooltip">
                                    <p className="nebari-help-tooltip-title">Secured service</p>
                                    <p>You are visiting a protected Nebari route. Authentication is required to continue.</p>
                                    <p>If you need access or are having trouble signing in, please contact your team administrator.</p>
                                </div>
                            )}
                        </div>
                        <button
                            className="nebari-theme-toggle"
                            onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
                            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {isDarkMode ? <SunIcon /> : <MoonIcon />}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="nebari-footer">
                        <p className="nebari-footer-text">
                            Built with care by the{" "}
                            <a href="https://nebari.dev" target="_blank" rel="noopener noreferrer">
                                Nebari
                            </a>{" "}
                            team
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
