import { lazy } from "react";
import type { Path } from "react-router-dom";
import type { AppRouteObject } from "../routes";
import { generateEncodedPath } from "../utils/generateEncodedPath";

const BrandingSection = lazy(() => import("./BrandingSection"));

export const BrandingRoute: AppRouteObject = {
    path: "/:realm/branding",
    element: <BrandingSection />,
    breadcrumb: () => "Theme customization",
    handle: {
        access: "manage-realm"
    }
};

export const toBranding = (realm: string): Partial<Path> => ({
    pathname: generateEncodedPath(BrandingRoute.path, { realm })
});

export default [BrandingRoute];
