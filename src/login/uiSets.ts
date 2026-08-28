import { lazy } from "react";
import { getThemeDefinition } from "../themes/themeCatalog";

/**
 * A theme's login UI: its shell plus the pages it implements.
 *
 * The two sets are not interchangeable at the component level — the `nebari`
 * set is built on Base UI through the Nebari registry, the `template` set on
 * Radix through stock shadcn, and their control APIs differ (Base UI's
 * `<FieldError match={…}>` has no Radix equivalent). Each therefore owns its own
 * page implementations, and the whole set is chosen once, here, from the theme
 * name Keycloak reports.
 *
 * Every member is `lazy` so a realm only downloads the theme it actually uses.
 */
const nebariUiSet = {
    Template: lazy(() => import("./Template")),
    Login: lazy(() => import("./pages/Login")),
    Register: lazy(() => import("./pages/Register")),
    Info: lazy(() => import("./pages/Info")),
    Error: lazy(() => import("./pages/Error")),
    LoginResetPassword: lazy(() => import("./pages/LoginResetPassword")),
    LoginUpdatePassword: lazy(() => import("./pages/LoginUpdatePassword")),
    LoginVerifyEmail: lazy(() => import("./pages/LoginVerifyEmail")),
    LoginUpdateProfile: lazy(() => import("./pages/LoginUpdateProfile"))
};

const templateUiSet: typeof nebariUiSet = {
    Template: lazy(() => import("./template/Template")),
    Login: lazy(() => import("./template/pages/Login")),
    Register: lazy(() => import("./template/pages/Register")),
    Info: lazy(() => import("./template/pages/Info")),
    Error: lazy(() => import("./template/pages/Error")),
    LoginResetPassword: lazy(() => import("./template/pages/LoginResetPassword")),
    LoginUpdatePassword: lazy(() => import("./template/pages/LoginUpdatePassword")),
    LoginVerifyEmail: lazy(() => import("./template/pages/LoginVerifyEmail")),
    LoginUpdateProfile: lazy(() => import("./template/pages/LoginUpdateProfile"))
};

export type LoginUiSet = typeof nebariUiSet;

export function getLoginUiSet(themeName: string | undefined): LoginUiSet {
    return getThemeDefinition(themeName).componentSet === "shadcn"
        ? templateUiSet
        : nebariUiSet;
}
