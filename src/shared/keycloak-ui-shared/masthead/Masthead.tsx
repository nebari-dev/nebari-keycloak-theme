/**
 * This file has been claimed for ownership from @keycloakify/keycloak-ui-shared version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 * 
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/masthead/Masthead.tsx" --revert
 */

/* eslint-disable */

// @ts-nocheck

import { ProfileMenu, ProfileMenuItem } from "@/components/nebari/ProfileMenu";
import type { ThemeMode } from "@/hooks/use-nebari-theme";
import {
  AvatarProps,
  DropdownItem,
  Masthead,
  MastheadBrand,
  MastheadBrandProps,
  MastheadContent,
  MastheadMainProps,
  MastheadToggle,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from "../../@patternfly/react-core";
import { BarsIcon } from "../../@patternfly/react-icons";
import { TFunction } from "i18next";
import type { Keycloak, KeycloakTokenParsed } from "oidc-spa/keycloak-js";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { KeycloakDropdown } from "./KeycloakDropdown";

function loggedInUserName(
  token: KeycloakTokenParsed | undefined,
  t: TFunction,
) {
  if (!token) {
    return t("unknownUser");
  }

  const givenName = token.given_name;
  const familyName = token.family_name;
  const preferredUsername = token.preferred_username;

  if (givenName && familyName) {
    return t("fullName", { givenName, familyName });
  }

  return givenName || familyName || preferredUsername || t("unknownUser");
}

type BrandLogo = MastheadBrandProps;

type KeycloakMastheadProps = MastheadMainProps & {
  keycloak: Keycloak;
  brand: BrandLogo;
  avatar?: AvatarProps;
  features?: {
    hasLogout?: boolean;
    hasManageAccount?: boolean;
    hasUsername?: boolean;
  };
  kebabDropdownItems?: ReactNode[];
  dropdownItems?: ReactNode[];
  toolbarItems?: ReactNode[];
  toolbar?: ReactNode;
  /**
   * Theme state from `useNebariTheme`. It is threaded in rather than read here
   * because `useThemePreference` must be mounted once per document, and the
   * console's own header already needs `isDarkMode` to pick its logo.
   */
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  canChangeTheme?: boolean;
};

const KeycloakMasthead = ({
  keycloak,
  brand: { src, alt, className, ...brandProps },
  avatar,
  features: {
    hasLogout = true,
    hasManageAccount = true,
    hasUsername = true,
  } = {},
  kebabDropdownItems,
  dropdownItems = [],
  toolbarItems,
  toolbar,
  themeMode,
  setThemeMode,
  canChangeTheme,
  ...rest
}: KeycloakMastheadProps) => {
  const { t } = useTranslation();

  const picture = keycloak.idTokenParsed?.picture ?? avatar?.src;
  const email = keycloak.idTokenParsed?.email;
  const userName = loggedInUserName(keycloak.idTokenParsed, t);

  /**
   * Upstream rendered three adjacent controls here: a username dropdown, a
   * kebab for mobile, and a standalone avatar that was not even clickable. The
   * design-system header has a single account control, so the desktop dropdown
   * and the avatar are now one `ProfileMenu` trigger — the same component the
   * Admin Console header uses, which is what keeps the two consoles reading as
   * one product. The kebab stays for narrow viewports, where there is no room
   * for the name.
   */
  return (
    <Masthead {...rest}>
      <MastheadToggle>
        <PageToggleButton variant="plain" aria-label={t("navigation")}>
          <BarsIcon />
        </PageToggleButton>
      </MastheadToggle>
      <MastheadBrand {...brandProps}>
        <img src={src} alt={alt} className={className} />
      </MastheadBrand>
      <MastheadContent>
        {toolbar}
        <Toolbar>
          <ToolbarContent>
            {toolbarItems?.map((item, index) => (
              <ToolbarItem key={index} align={{ default: "alignRight" }}>
                {item}
              </ToolbarItem>
            ))}
            <ToolbarItem
              align={{ default: "alignRight" }}
              visibility={{ default: "hidden", md: "visible" }}
            >
              <ProfileMenu
                canChangeTheme={canChangeTheme}
                data-testid="options"
                email={email}
                name={userName}
                onSignOut={hasLogout ? () => keycloak.logout() : undefined}
                picture={picture}
                setThemeMode={setThemeMode}
                showName={hasUsername}
                signOutLabel={t("signOut")}
                themeMode={themeMode}
                triggerLabel={t("options")}
              >
                {hasManageAccount && (
                  <ProfileMenuItem onClick={() => keycloak.accountManagement()}>
                    {t("manageAccount")}
                  </ProfileMenuItem>
                )}
                {dropdownItems}
              </ProfileMenu>
            </ToolbarItem>
            <ToolbarItem
              align={{ default: "alignRight" }}
              visibility={{ md: "hidden" }}
            >
              <KeycloakDropdown
                data-testid="options-kebab"
                isKebab
                dropDownItems={[
                  ...(kebabDropdownItems || dropdownItems),
                  ...(hasManageAccount
                    ? [
                        <DropdownItem
                          key="manageAccount"
                          onClick={() => keycloak.accountManagement()}
                        >
                          {t("manageAccount")}
                        </DropdownItem>
                      ]
                    : []),
                  ...(hasLogout
                    ? [
                        <DropdownItem key="signOut" onClick={() => keycloak.logout()}>
                          {t("signOut")}
                        </DropdownItem>
                      ]
                    : [])
                ]}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );
};

export default KeycloakMasthead;
