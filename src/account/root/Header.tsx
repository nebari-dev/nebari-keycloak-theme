/**
 * This file has been claimed for ownership from @keycloakify/keycloak-account-ui version 260502.0.2.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "account/root/Header.tsx" --revert
 */

/* eslint-disable */

// @ts-nocheck

import logoSvgUrl from "../assets/logo.svg";        // white text — dark bg
import logoLightSvgUrl from "../assets/logo-light.svg"; // black text — light bg
import { useState, useCallback } from "react";
import {
  KeycloakMasthead,
  label,
  useEnvironment,
} from "../../shared/keycloak-ui-shared";
import { Button, DropdownItem, ToolbarItem } from "../../shared/@patternfly/react-core";
import { ExternalLinkSquareAltIcon } from "../../shared/@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import { useHref } from "react-router-dom";

import { environment } from "../environment";
import { joinPath } from "../utils/joinPath";

import style from "./header.module.css";

// ── Account theme management (shared key with admin for consistent prefs) ──
const THEME_KEY = "nebari-admin-theme";

function applyAccountTheme(dark: boolean) {
  if (dark) document.documentElement.classList.add("pf-v5-theme-dark");
  else document.documentElement.classList.remove("pf-v5-theme-dark");
}

(function initAccountTheme() {
  applyAccountTheme(localStorage.getItem(THEME_KEY) === "dark");
})();

function useAccountTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === "dark");
  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      applyAccountTheme(next);
      return next;
    });
  }, []);
  return { dark, toggle };
}

// ── Theme toggle button ────────────────────────────────────────────────────
const ThemeToggle = ({ dark, onToggle }: { dark: boolean; onToggle: () => void }) => (
  <button
    aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    onClick={onToggle}
    className="nebari-theme-toggle-btn"
  >
    {dark ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    )}
  </button>
);

// ── User identity card (top of dropdown) ──────────────────────────────────
const UserCardItem = () => {
  const { keycloak } = useEnvironment();
  const token = keycloak?.tokenParsed ?? {};
  const fullName = token.name || token.given_name || "";
  const username = token.preferred_username || "";
  const initials = fullName
    ? fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : username.slice(0, 2).toUpperCase();

  return (
    <DropdownItem
      key="user-card"
      className="nebari-user-card-item"
      isDisabled
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <div className="nebari-user-card__avatar">{initials}</div>
      <div className="nebari-user-card__info">
        {fullName && <span className="nebari-user-card__name">{fullName}</span>}
        <span className="nebari-user-card__username">@{username}</span>
      </div>
    </DropdownItem>
  );
};

// ── Referrer back-link ─────────────────────────────────────────────────────
const ReferrerLink = () => {
  const { t } = useTranslation();

  return environment.referrerUrl ? (
    <Button
      data-testid="referrer-link"
      component="a"
      href={environment.referrerUrl.replace("_hash_", "#")}
      variant="link"
      icon={<ExternalLinkSquareAltIcon />}
      iconPosition="right"
      isInline
    >
      {t("backTo", {
        app: label(t, environment.referrerName, environment.referrerUrl),
      })}
    </Button>
  ) : null;
};

export const Header = () => {
  const { environment: env, keycloak } = useEnvironment();
  const { t } = useTranslation();
  const { dark, toggle } = useAccountTheme();

  const logoUrl = env.logoUrl ? env.logoUrl : "/";
  const internalLogoHref = useHref(logoUrl);
  const indexHref = logoUrl.startsWith("/") ? internalLogoHref : logoUrl;

  const resolvedLogo = dark ? logoSvgUrl : logoLightSvgUrl;

  return (
    <KeycloakMasthead
      data-testid="page-header"
      keycloak={keycloak}
      features={{ hasManageAccount: false }}
      brand={{
        href: indexHref,
        src: resolvedLogo,
        alt: t("logo"),
        className: style.brand,
      }}
      dropdownItems={[<UserCardItem key="user-card" />]}
      toolbarItems={[
        <ToolbarItem key="right-controls" align={{ default: "alignRight" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ThemeToggle dark={dark} onToggle={toggle} />
            <ReferrerLink />
          </div>
        </ToolbarItem>,
      ]}
    />
  );
};
