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
import {
  KeycloakMasthead,
  label,
  useEnvironment,
} from "../../shared/keycloak-ui-shared";
import { Button, ToolbarItem } from "../../shared/@patternfly/react-core";
import { useNebariTheme } from "@/hooks/use-nebari-theme";
import { getKcContext } from "../KcContext";
import { ExternalLinkSquareAltIcon } from "../../shared/@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import { useHref } from "react-router-dom";

import { environment } from "../environment";
import { joinPath } from "../utils/joinPath";

import style from "./header.module.css";

/* Theme state comes from `useNebariTheme`, shared with the Admin Console: it
 * writes the same storage key and, crucially, toggles the Nebari `.dark` /
 * `[data-theme]` hooks as well as PatternFly's `.pf-v5-theme-dark`. The previous
 * local implementation only set the PatternFly class, so design-system
 * components in this console never re-themed. The Light/Dark/System control is
 * now inside the profile menu, where the canonical Nebari header puts it. */

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
  const { themeMode, isDarkMode, setThemeMode, canChangeTheme } = useNebariTheme({
    allowDark: getKcContext().kcContext.darkMode !== false,
  });

  const logoUrl = env.logoUrl ? env.logoUrl : "/";
  const internalLogoHref = useHref(logoUrl);
  const indexHref = logoUrl.startsWith("/") ? internalLogoHref : logoUrl;

  const resolvedLogo = isDarkMode ? logoSvgUrl : logoLightSvgUrl;

  return (
    <KeycloakMasthead
      data-testid="page-header"
      keycloak={keycloak}
      features={{ hasManageAccount: false }}
      canChangeTheme={canChangeTheme}
      setThemeMode={setThemeMode}
      themeMode={themeMode}
      brand={{
        href: indexHref,
        src: resolvedLogo,
        alt: t("logo"),
        className: style.brand,
      }}
      toolbarItems={[
        <ToolbarItem key="right-controls" align={{ default: "alignRight" }}>
          <ReferrerLink />
        </ToolbarItem>,
      ]}
    />
  );
};
