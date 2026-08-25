/**
 * This file has been claimed for ownership from @keycloakify/keycloak-admin-ui version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "admin/PageNav.tsx" --revert
 */

/* eslint-disable */

// @ts-nocheck

import { Badge } from "@/components/ui/badge";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuLabel,
    SidebarProvider,
    SidebarSeparator
} from "@/components/ui/sidebar";
import { label, useEnvironment } from "../shared/keycloak-ui-shared";
import { PageSidebar, PageSidebarContext } from "../shared/@patternfly/react-core";
import { type ComponentProps, useContext } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useMatch } from "react-router-dom";
import { useAccess } from "./context/access/Access";
import { useRealm } from "./context/realm-context/RealmContext";
import { useServerInfo } from "./context/server-info/ServerInfoProvider";
import { Environment } from "./environment";
import { toPage } from "./page/routes";
import { routes } from "./routes";
import useIsFeatureEnabled, { Feature } from "./utils/useIsFeatureEnabled";

import "./page-nav.css";

type LeftNavProps = {
    title: string;
    path: string;
    id?: string;
};

/**
 * The registry Sidebar separates its focus ring from each menu item with a
 * sidebar-coloured offset. That layer reads as a second white ring on active
 * items, so the Admin navigation uses the standard Nebari purple ring directly
 * against a `radius-md` target instead.
 */
const menuItemFocus = "rounded-md focus-visible:ring-ring focus-visible:ring-offset-0";

/**
 * PatternFly visually moves a closed mobile sidebar off-canvas and marks its
 * shell `aria-hidden`, but does not remove descendant links from sequential
 * keyboard navigation. Mirroring the PageSidebar state to `inert` keeps hidden
 * navigation out of both the focus order and accessibility tree.
 */
const ResponsiveSidebar = (props: ComponentProps<typeof Sidebar>) => {
    const { isSidebarOpen = true } = useContext(PageSidebarContext);

    return <Sidebar {...props} inert={isSidebarOpen ? undefined : ""} />;
};

/**
 * Access-aware router link rendered through Nebari's menu-button primitive.
 * Keeping route lookup here ensures hidden Keycloak sections never leave an
 * empty menu item behind, while `useMatch` drives the design system's active
 * state for both section roots and their nested detail pages.
 */
const LeftNav = ({ title, path, id }: LeftNavProps) => {
    const { t } = useTranslation();
    const { hasAccess } = useAccess();
    const { realm } = useRealm();
    const encodedRealm = encodeURIComponent(realm);
    const destination = `/${encodedRealm}${path}`;
    const isActive = useMatch({ path: `${destination}/*`, end: false }) !== null;
    const route = routes.find(
        route => route.path.replace(/\/:.+?(\?|(?:(?!\/).)*|$)/g, "") === (id || path)
    );
    const accessAllowed =
        route &&
        (route.handle.access instanceof Array
            ? hasAccess(...route.handle.access)
            : hasAccess(route.handle.access));

    if (!accessAllowed) {
        return undefined;
    }

    const name = `nav-item${path.replace("/", "-")}`;
    const translatedTitle = t(title);

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                active={isActive}
                className={menuItemFocus}
                render={
                    <NavLink
                        id={name}
                        data-testid={name}
                        to={destination}
                    />
                }
                tooltip={translatedTitle}
                variant="ghost"
            >
                <SidebarMenuLabel>{translatedTitle}</SidebarMenuLabel>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
};

export const PageNav = () => {
    const { t } = useTranslation();
    const { environment } = useEnvironment<Environment>();
    const { hasAccess, hasSomeAccess } = useAccess();
    const { componentTypes } = useServerInfo();
    const isFeatureEnabled = useIsFeatureEnabled();
    const pages = componentTypes?.["org.keycloak.services.ui.extend.UiPageProvider"];
    const { realm, realmRepresentation } = useRealm();
    const showManage = hasSomeAccess(
        "view-realm",
        "query-groups",
        "query-users",
        "query-clients",
        "view-events"
    );
    const showConfigure = hasSomeAccess(
        "view-realm",
        "query-clients",
        "view-identity-providers"
    );
    const showWorkflows = hasAccess("manage-realm") && isFeatureEnabled(Feature.Workflows);
    const showManageRealm = environment.masterRealm === environment.realm;

    return (
        /* PatternFly's shell remains only for Keycloak's responsive Page state.
         * The visible navigation and all interactive items are Nebari Sidebar
         * components; see page-nav.css for the small layout bridge. */
        <PageSidebar className="keycloak__page_nav__shell" theme="light">
            <SidebarProvider>
                <ResponsiveSidebar aria-label={t("navigation")} className="w-full rounded-none">
                    <SidebarHeader className="border-sidebar-border border-b px-4 py-3">
                        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                            <span
                                className="min-w-0 flex-1 truncate font-semibold"
                                data-testid="currentRealm"
                            >
                                {label(t, realmRepresentation?.displayName, realm)}
                            </span>
                            <Badge className="shrink-0" variant="secondary">
                                {t("currentRealm")}
                            </Badge>
                        </h2>
                    </SidebarHeader>

                    <SidebarContent className="gap-2 py-3">
                        {showManageRealm && (
                            <>
                                <SidebarGroup aria-label={t("manageRealms")} role="group">
                                    <SidebarMenu>
                                        <LeftNav title="manageRealms" path="/realms" />
                                    </SidebarMenu>
                                </SidebarGroup>
                                {(showManage || showConfigure) && <SidebarSeparator />}
                            </>
                        )}

                        {showManage && (
                            <SidebarGroup aria-label={t("manage")} role="group">
                                <SidebarGroupLabel>{t("manage")}</SidebarGroupLabel>
                                <SidebarMenu>
                                    {isFeatureEnabled(Feature.Organizations) &&
                                        realmRepresentation?.organizationsEnabled && (
                                            <LeftNav title="organizations" path="/organizations" />
                                        )}
                                    <LeftNav title="clients" path="/clients" />
                                    <LeftNav title="clientScopes" path="/client-scopes" />
                                    <LeftNav title="realmRoles" path="/roles" />
                                    <LeftNav title="users" path="/users" />
                                    <LeftNav title="groups" path="/groups" />
                                    <LeftNav title="sessions" path="/sessions" />
                                    <LeftNav title="events" path="/events" />
                                </SidebarMenu>
                            </SidebarGroup>
                        )}

                        {showManage && showConfigure && <SidebarSeparator />}

                        {showConfigure && (
                            <SidebarGroup aria-label={t("configure")} role="group">
                                <SidebarGroupLabel>{t("configure")}</SidebarGroupLabel>
                                <SidebarMenu>
                                    <LeftNav title="realmSettings" path="/realm-settings" />
                                    <LeftNav title="authentication" path="/authentication" />
                                    {isFeatureEnabled(Feature.AdminFineGrainedAuthzV2) &&
                                        realmRepresentation?.adminPermissionsEnabled && (
                                            <LeftNav title="permissions" path="/permissions" />
                                        )}
                                    <LeftNav title="identityProviders" path="/identity-providers" />
                                    <LeftNav title="userFederation" path="/user-federation" />
                                    {showWorkflows && <LeftNav title="workflows" path="/workflows" />}
                                    {isFeatureEnabled(Feature.DeclarativeUI) &&
                                        pages?.map(page => (
                                            <LeftNav
                                                key={page.id}
                                                title={page.id}
                                                path={toPage({ providerId: page.id }).pathname!}
                                                id="/page-section"
                                            />
                                        ))}
                                </SidebarMenu>
                            </SidebarGroup>
                        )}
                    </SidebarContent>
                </ResponsiveSidebar>
            </SidebarProvider>
        </PageSidebar>
    );
};
