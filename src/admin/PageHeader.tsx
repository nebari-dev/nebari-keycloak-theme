/**
 * This file has been claimed for ownership from @keycloakify/keycloak-admin-ui version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "admin/PageHeader.tsx" --revert
 */

/* eslint-disable */

// @ts-nocheck

import logoSvgUrl from "./assets/logo.svg";        // white text — for dark bg
import logoLightSvgUrl from "./assets/logo-light.svg"; // black text — for light bg
import { useState, useCallback } from "react";
import {
  KeycloakMasthead,
  useEnvironment,
  useHelp,
} from "../shared/keycloak-ui-shared";
import { DropdownItem, ToolbarItem } from "../shared/@patternfly/react-core";
import { HelpIcon } from "../shared/@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import { Link, useHref } from "react-router-dom";
import { PageHeaderClearCachesModal } from "./PageHeaderClearCachesModal";
import { HelpHeader } from "./components/help-enabler/HelpHeader";
import { useAccess } from "./context/access/Access";
import { useRealm } from "./context/realm-context/RealmContext";
import { toDashboard } from "./dashboard/routes/Dashboard";
import { usePreviewLogo } from "./realm-settings/themes/LogoContext";
import { joinPath } from "./utils/joinPath";
import useToggle from "./utils/useToggle";

// ── Admin theme management ────────────────────────────────────────────────────
const THEME_KEY = "nebari-admin-theme";

function applyAdminTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("pf-v5-theme-dark");
  } else {
    document.documentElement.classList.remove("pf-v5-theme-dark");
  }
}

// On first load, apply saved preference (default: light)
(function initAdminTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyAdminTheme(saved === "dark");
})();

function useAdminTheme() {
  const [dark, setDark] = useState(
    () => localStorage.getItem(THEME_KEY) === "dark"
  );
  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      applyAdminTheme(next);
      return next;
    });
  }, []);
  return { dark, toggle };
}

// ── Theme toggle button (receives state from Header) ───────────────────────
const ThemeToggle = ({ dark, onToggle }: { dark: boolean; onToggle: () => void }) => (
  <button
    aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    onClick={onToggle}
    className="nebari-theme-toggle-btn"
  >
    {dark ? (
      // Sun — shown in dark mode to switch to light
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ) : (
      // Moon — shown in light mode to switch to dark
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

const ManageAccountDropdownItem = () => {
  const { keycloak } = useEnvironment();

  const { t } = useTranslation();
  return (
    <DropdownItem
      key="manage account"
      id="manage-account"
      onClick={() => keycloak.accountManagement()}
    >
      {t("manageAccount")}
    </DropdownItem>
  );
};

const ServerInfoDropdownItem = () => {
  const { realm } = useRealm();
  const { t } = useTranslation();

  return (
    <DropdownItem
      key="server info"
      component={(props) => <Link {...props} to={toDashboard({ realm })} />}
    >
      {t("realmInfo")}
    </DropdownItem>
  );
};

const ClearCachesDropdownItem = () => {
  const { t } = useTranslation();
  const [open, toggleModal] = useToggle();

  return (
    <>
      <DropdownItem key="clear caches" onClick={() => toggleModal()}>
        {t("clearCachesTitle")}
      </DropdownItem>
      {open && <PageHeaderClearCachesModal onClose={() => toggleModal()} />}
    </>
  );
};

const HelpDropdownItem = () => {
  const { t } = useTranslation();
  const { enabled, toggleHelp } = useHelp();
  return (
    <DropdownItem
      data-testId="helpIcon"
      icon={<HelpIcon />}
      onClick={toggleHelp}
    >
      {enabled ? t("helpEnabled") : t("helpDisabled")}
    </DropdownItem>
  );
};

const kebabDropdownItems = (isMasterRealm: boolean, isManager: boolean) => [
  <ManageAccountDropdownItem key="kebab Manage Account" />,
  <ServerInfoDropdownItem key="kebab Server Info" />,
  ...(isMasterRealm && isManager
    ? [<ClearCachesDropdownItem key="Clear Caches" />]
    : []),
  <HelpDropdownItem key="kebab Help" />,
];

const userDropdownItems = (isMasterRealm: boolean, isManager: boolean) => [
  <UserCardItem key="user-card" />,
  <ManageAccountDropdownItem key="Manage Account" />,
  <ServerInfoDropdownItem key="Server info" />,
  ...(isMasterRealm && isManager
    ? [<ClearCachesDropdownItem key="Clear Caches" />]
    : []),
];

export const Header = () => {
  const { environment, keycloak } = useEnvironment();
  const { t } = useTranslation();
  const { realm } = useRealm();
  const { hasAccess } = useAccess();
  const { dark, toggle } = useAdminTheme();

  const contextLogo = usePreviewLogo();
  const customLogo = contextLogo?.logo;

  const isMasterRealm = realm === "master";
  const isManager = hasAccess("manage-realm");

  const url = useHref(toDashboard({ realm }));
  const logoUrl = environment.logoUrl ? environment.logoUrl : url;

  // Swap logo based on current theme: light mode needs black-text logo
  const resolvedLogo = customLogo
    ? (customLogo.startsWith("/") ? joinPath(environment["resourceUrl"], customLogo) : customLogo)
    : dark ? logoSvgUrl : logoLightSvgUrl;

  return (
    <KeycloakMasthead
      data-testid="page-header"
      keycloak={keycloak}
      features={{ hasManageAccount: false }}
      brand={{
        href: logoUrl,
        src: resolvedLogo,
        alt: t("logo"),
        className: "keycloak__pageheader_brand",
      }}
      dropdownItems={userDropdownItems(isMasterRealm, isManager)}
      kebabDropdownItems={kebabDropdownItems(isMasterRealm, isManager)}
      toolbarItems={[
        // Both controls in one ToolbarItem, right-aligned, hidden on mobile
        <ToolbarItem
          key="right-controls"
          align={{ default: "alignRight" }}
          visibility={{ default: "hidden", md: "visible" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ThemeToggle dark={dark} onToggle={toggle} />
            <HelpHeader />
          </div>
        </ToolbarItem>,
      ]}
    />
  );
};
