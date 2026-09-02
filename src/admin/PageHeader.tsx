/**
 * This file has been claimed for ownership from @keycloakify/keycloak-admin-ui version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "admin/PageHeader.tsx" --revert
 */

/* eslint-disable */

// @ts-nocheck

import { CircleHelpIcon } from "lucide-react";
import { ProfileMenu, ProfileMenuItem } from "@/components/nebari/ProfileMenu";
import { useNebariTheme } from "@/hooks/use-nebari-theme";
import { getKcContext } from "./KcContext";
import {
  MenuBarActions,
  MenuBarBrand,
  MenuBarNav,
  NavigationMenu,
} from "@/components/ui/navigation-menu";
import { useEnvironment, useHelp } from "../shared/keycloak-ui-shared";
import { PageToggleButton } from "../shared/@patternfly/react-core";
import { BarsIcon } from "../shared/@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import { Link, useHref } from "react-router-dom";
import { PageHeaderClearCachesModal } from "./PageHeaderClearCachesModal";
import { useAccess } from "./context/access/Access";
import { useRealm } from "./context/realm-context/RealmContext";
import { toDashboard } from "./dashboard/routes/Dashboard";
import { usePreviewLogo } from "./realm-settings/themes/LogoContext";
import { joinPath } from "./utils/joinPath";
import { getBrandLogo } from "@/lib/branding";
import useToggle from "./utils/useToggle";

function loggedInUserName(token: Record<string, unknown>, fallback: string) {
  const givenName = typeof token.given_name === "string" ? token.given_name : "";
  const familyName = typeof token.family_name === "string" ? token.family_name : "";
  const username =
    typeof token.preferred_username === "string"
      ? token.preferred_username
      : fallback;

  return [givenName, familyName].filter(Boolean).join(" ") || username;
}

export const Header = () => {
  const { environment, keycloak } = useEnvironment();
  const { t } = useTranslation();
  const { realm } = useRealm();
  const { hasAccess } = useAccess();
  const { enabled: helpEnabled, toggleHelp } = useHelp();
  // `darkMode === false` is the realm's "Dark Mode" setting turned off.
  const { themeMode, isDarkMode, setThemeMode, canChangeTheme } = useNebariTheme({
    allowDark: getKcContext().kcContext.darkMode !== false,
  });
  const [clearCachesOpen, toggleClearCaches] = useToggle();

  const contextLogo = usePreviewLogo();
  const customLogo = contextLogo?.logo;

  const isMasterRealm = realm === "master";
  const isManager = hasAccess("manage-realm");

  const url = useHref(toDashboard({ realm }));
  const logoUrl = environment.logoUrl ? environment.logoUrl : url;

  // Resolved from the active theme rather than hardcoded, so a themed console
  // does not fall back to Nebari branding.
  const defaultLogo = getBrandLogo(isDarkMode);

  const resolvedLogo = customLogo
    ? (customLogo.startsWith("/") ? joinPath(environment["resourceUrl"], customLogo) : customLogo)
    : defaultLogo;

  const token = keycloak.idTokenParsed ?? {};
  const picture = typeof token.picture === "string" ? token.picture : undefined;
  const username = loggedInUserName(token, t("unknownUser"));
  const email = typeof token.email === "string" ? token.email : undefined;

  return (
    <NavigationMenu
      className="pf-v5-c-masthead h-14 justify-between border-header-border bg-header-background pl-4 text-header-foreground"
      data-testid="page-header"
    >
      <PageToggleButton
        className="nebari-admin-nav-toggle"
        variant="plain"
        aria-label={t("navigation")}
      >
        <BarsIcon />
      </PageToggleButton>

      <MenuBarBrand href={logoUrl} aria-label={t("logo")}>
        <img src={resolvedLogo} alt={t("logo")} className="h-8 w-auto" />
      </MenuBarBrand>

      <MenuBarNav aria-label="Keycloak Admin Console">
        <span className="border-header-border border-l pl-3 font-semibold text-header-foreground/70 text-sm">
          Keycloak Admin
        </span>
      </MenuBarNav>

      <MenuBarActions className="gap-2">
        <ProfileMenu
          data-testid="options"
          email={email}
          name={username}
          onSignOut={() => keycloak.logout()}
          picture={picture}
          canChangeTheme={canChangeTheme}
          setThemeMode={setThemeMode}
          signOutLabel={t("signOut")}
          themeMode={themeMode}
          triggerLabel={t("options")}
        >
          <ProfileMenuItem id="manage-account" onClick={() => keycloak.accountManagement()}>
            {t("manageAccount")}
          </ProfileMenuItem>

          <ProfileMenuItem render={<Link to={toDashboard({ realm })} />}>
            {t("realmInfo")}
          </ProfileMenuItem>

          {isMasterRealm && isManager && (
            <ProfileMenuItem onClick={() => toggleClearCaches()}>
              {t("clearCachesTitle")}
            </ProfileMenuItem>
          )}

          <ProfileMenuItem closeOnClick={false} data-testid="helpIcon" onClick={toggleHelp}>
            <CircleHelpIcon aria-hidden className="size-4 shrink-0" />
            {helpEnabled ? t("helpEnabled") : t("helpDisabled")}
          </ProfileMenuItem>
        </ProfileMenu>
      </MenuBarActions>

      {clearCachesOpen && <PageHeaderClearCachesModal onClose={() => toggleClearCaches()} />}
    </NavigationMenu>
  );
};
