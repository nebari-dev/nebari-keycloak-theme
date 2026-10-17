/**
 * This file has been claimed for ownership from @keycloakify/keycloak-account-ui version 260502.0.2.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "account/root/Header.tsx" --revert
 */

import { useEffect } from "react";
import { getConsoleBranding, getConsoleLogo } from "../../branding/consoleLogo";
import { applyBrandingFavicon } from "../../branding/documentBranding";
import { ProfileMenu } from "@/components/nebari/ProfileMenu";
import {
  MenuBarActions,
  MenuBarBrand,
  NavigationMenu,
} from "@/components/ui/navigation-menu";
import { label, useEnvironment } from "../../shared/keycloak-ui-shared";
import { Button, PageToggleButton } from "../../shared/@patternfly/react-core";
import { useNebariTheme } from "@/hooks/use-nebari-theme";
import { getKcContext } from "../KcContext";
import {
  BarsIcon,
  ExternalLinkSquareAltIcon,
} from "../../shared/@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import { useHref } from "react-router-dom";

import { environment } from "../environment";

import style from "./header.module.css";

/* Theme state comes from `useNebariTheme`, shared with the Admin Console: it
 * writes the same storage key and, crucially, toggles the Nebari `.dark` /
 * `[data-theme]` hooks as well as PatternFly's `.pf-v5-theme-dark`. The previous
 * local implementation only set the PatternFly class, so design-system
 * components in this console never re-themed. The Light/Dark/System control is
 * now inside the profile menu, where the canonical Nebari header puts it. */

/* The header is assembled here from Nebari primitives rather than by claiming
 * the shared `KeycloakMasthead`. That component is upstream's, it is 190 lines
 * of PatternFly this console does not otherwise use, and this file was its only
 * caller — the Admin Console's `PageHeader.tsx` already builds its own. Owning
 * the shell to replace its avatar menu would have frozen all of it against
 * upstream to reach one dropdown. */

// Mirrors `PageHeader.tsx`: display name if the token has one, username if not.
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

const HeaderContent = ({ theme }: { theme: ConsoleTheme }) => {
  const { environment: env, keycloak } = useEnvironment();
  const { t } = useTranslation();
  const { themeMode, isDarkMode, setThemeMode, canChangeTheme } = theme;

  const logoUrl = env.logoUrl ? env.logoUrl : "/";
  const internalLogoHref = useHref(logoUrl);
  // `Root.tsx` mounts the router without a basename — its top route *is* the
  // console's path — so `useHref("/")` is the server root, which Keycloak
  // redirects to the master realm's Admin Console. `/` is Keycloak's default
  // `logoUrl` and means "home", so send it to this console's own root.
  const indexHref =
    logoUrl === "/"
      ? new URL(environment.baseUrl).pathname
      : logoUrl.startsWith("/")
        ? internalLogoHref
        : logoUrl;

  /* Resolved from the same catalog the login and Admin consoles use, so a theme
     brands all three or none. A theme that ships no artwork of its own, such
     as the unbranded `template`, falls back to the realm name as a wordmark,
     as the Admin Console does, rather than borrowing another theme's logo. */
  /* See the note in `PageHeader.tsx`: `t` does not know this theme's custom
     message key, and the value is validated on the way through. */
  const publishedConfig = (t as unknown as (key: string) => string)(
    "nebariBrandingConfig",
  );
  const themeLogo = getConsoleLogo({
    themeName: getKcContext().kcContext.themeName,
    mode: isDarkMode ? "dark" : "light",
    baseUrl: import.meta.env.BASE_URL,
    publishedConfig,
  });

  const resolvedLogo = themeLogo;

  /* Theme customization's wordmark and favicon, from the same validated config. */
  const { wordmark, favicon } = getConsoleBranding({
    themeName: getKcContext().kcContext.themeName,
    publishedConfig,
  }).advanced;

  useEffect(() => {
    applyBrandingFavicon(favicon);
  }, [favicon]);

  const token = keycloak.idTokenParsed ?? {};
  const picture = typeof token.picture === "string" ? token.picture : undefined;
  const username = loggedInUserName(token, t("unknownUser"));
  const email = typeof token.email === "string" ? token.email : undefined;

  return (
    <NavigationMenu
      className="pf-v5-c-masthead h-14 justify-between border-header-border bg-header-background pl-4 text-header-foreground"
      data-testid="page-header"
    >
      {/* `Root.tsx` renders this console inside `<Page … isManagedSidebar>`, and
          PatternFly's `Page` starts the sidebar closed below its mobile
          breakpoint — this toggle is the only thing that reopens it. Composing
          the header from Nebari primitives does not change that: the control has
          to stay a `PageToggleButton` so it keeps the `Page` context that owns
          the expanded state, which is the rule `src/components/patternfly/
          README.md` states for the Admin Console header too. Without it the
          account navigation is unreachable on a phone. */}
      <PageToggleButton
        aria-label={t("navigation", "Navigation")}
        className="nebari-account-nav-toggle"
        variant="plain"
      >
        <BarsIcon />
      </PageToggleButton>

      {/* Named by its content, the logo's alt text and any visible text, so
          speech-input users can say what they see (WCAG 2.5.3). */}
      <MenuBarBrand href={indexHref}>
        {resolvedLogo ? (
          <>
            <img src={resolvedLogo} alt={t("logo")} className={style.brand} />
            {wordmark !== "" && (
              <span className="font-semibold text-lg">{wordmark}</span>
            )}
          </>
        ) : (
          <span className="font-semibold text-base">
            {wordmark || getKcContext().kcContext.realm.name}
          </span>
        )}
      </MenuBarBrand>

      {/* No `MenuBarNav`: this console has no top-level sections, and an empty
          one would publish a navigation landmark with nothing in it.
          `MenuBarActions` carries `ml-auto`, so it pins itself to the trailing
          edge and the toggle and brand stay grouped at the leading one. */}
      <MenuBarActions className="gap-2">
        <ReferrerLink />
        {/* `hasManageAccount` was false here: this *is* the account console, so
            the menu carries no link back to itself. */}
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
        />
      </MenuBarActions>
    </NavigationMenu>
  );
};

const ThemeEnabledHeader = () => <HeaderContent theme={useNebariTheme()} />;

/** See the Admin Console header for the matching single-owner theme flow. */
export const Header = () =>
  getKcContext().kcContext.darkMode === false ? (
    <HeaderContent theme={LIGHT_THEME} />
  ) : (
    <ThemeEnabledHeader />
  );
