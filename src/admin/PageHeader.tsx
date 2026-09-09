/**
 * This file has been claimed for ownership from @keycloakify/keycloak-admin-ui version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "admin/PageHeader.tsx" --revert
 */

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
import { label, useEnvironment, useHelp } from "../shared/keycloak-ui-shared";
import { PageToggleButton } from "../shared/@patternfly/react-core";
import { BarsIcon } from "../shared/@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import { Link, useHref } from "react-router-dom";
import { PageHeaderClearCachesModal } from "./PageHeaderClearCachesModal";
import { useAccess } from "./context/access/Access";
import { useRealm } from "./context/realm-context/RealmContext";
import { toDashboard } from "./dashboard/routes/Dashboard";
import { usePreviewLogo } from "./realm-settings/themes/LogoContext";
import { getConsoleLogo } from "../branding/consoleLogo";
import { joinPath } from "./utils/joinPath";
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

type ConsoleTheme = ReturnType<typeof useNebariTheme>;

const LIGHT_THEME: ConsoleTheme = {
  themeMode: "light",
  isDarkMode: false,
  setThemeMode: () => {},
  canChangeTheme: false,
};

const HeaderContent = ({ theme }: { theme: ConsoleTheme }) => {
  const { environment, keycloak } = useEnvironment();
  const { t } = useTranslation();
  const { realm, realmRepresentation } = useRealm();
  const { hasAccess } = useAccess();
  const { enabled: helpEnabled, toggleHelp } = useHelp();
  const { themeMode, isDarkMode, setThemeMode, canChangeTheme } = theme;
  const [clearCachesOpen, toggleClearCaches] = useToggle();

  const contextLogo = usePreviewLogo();
  const customLogo = contextLogo?.logo;

  const isMasterRealm = realm === "master";
  const isManager = hasAccess("manage-realm");

  const url = useHref(toDashboard({ realm }));
  const logoUrl = environment.logoUrl ? environment.logoUrl : url;

  /* The masthead mark, most specific source first:
     1. the live preview while an admin edits in Realm settings -> Themes,
     2. `logo` from the theme's own theme.properties, which is Keycloak's
        standard hook and lets a deployment point at its own file without
        touching this build,
     3. the artwork the active theme ships, resolved from the same catalog the
        login pages use, so a theme cannot brand one console and not the other.
     A theme that ships none — the unbranded `template` — falls through to the
     realm's display name as a wordmark, rather than borrowing another theme's
     logo. */
  /* `t` is typed to the console's own message catalogue, which does not know
     this theme's custom key — the same reason `themeCustomization.ts` reads
     `properties` through a cast. The value is validated by
     `parseThemeBrandingConfig` either way. */
  const publishedConfig = (t as unknown as (key: string) => string)(
    "nebariBrandingConfig",
  );

  const themeLogo = getConsoleLogo({
    themeName: getKcContext().kcContext.themeName,
    mode: isDarkMode ? "dark" : "light",
    baseUrl: import.meta.env.BASE_URL,
    publishedConfig,
  });

  const resolvedLogo = customLogo
    ? (customLogo.startsWith("/") ? joinPath(environment["resourceUrl"], customLogo) : customLogo)
    : environment.logo
      ? (/^(https?:)?\/\//.test(environment.logo)
          ? environment.logo
          : joinPath(environment["resourceUrl"], environment.logo))
      : themeLogo;

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
        aria-label={t("navigation", "Navigation")}
      >
        <BarsIcon />
      </PageToggleButton>

      <MenuBarBrand href={logoUrl} aria-label={t("logo")}>
        {resolvedLogo ? (
          <img src={resolvedLogo} alt={t("logo")} className="h-8 w-auto" />
        ) : (
          <span className="font-semibold text-base">
            {label(t, realmRepresentation?.displayName, realm)}
          </span>
        )}
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
          triggerLabel={t("options", "Options")}
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

const ThemeEnabledHeader = () => <HeaderContent theme={useNebariTheme()} />;

/**
 * Do not mount `useThemePreference` when the realm has disabled Dark Mode.
 * `colorScheme.ts` has already forced the document light before React starts;
 * skipping the hook prevents the user's stored preference from competing with
 * that realm policy and keeps `.dark` under one owner.
 */
export const Header = () =>
  getKcContext().kcContext.darkMode === false ? (
    <HeaderContent theme={LIGHT_THEME} />
  ) : (
    <ThemeEnabledHeader />
  );
