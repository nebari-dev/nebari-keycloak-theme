import type { BrandingConfig } from "../../branding/brandingConfig";
import {
    getBrandingCssVariables,
    getBrandingImage
} from "../../branding/brandingConfig";
import {
    getThemeDefinition,
    getThemeLogo,
    type CustomThemeName
} from "../../themes/themeCatalog";

type BrandingPreviewProps = {
    branding: BrandingConfig;
    mode: "light" | "dark";
    themeName: CustomThemeName;
};

export function BrandingPreview({ branding, mode, themeName }: BrandingPreviewProps) {
    const palette = branding[mode];
    const themeDefinition = getThemeDefinition(themeName);
    const defaultLogo = getThemeLogo(
        themeDefinition,
        mode,
        import.meta.env.BASE_URL
    );
    const logo = getBrandingImage(branding.logo, mode);
    const background = getBrandingImage(branding.backgroundImage, mode);
    const backgroundStyle = background
        ? {
              backgroundImage: `linear-gradient(${palette.pageBackground}bf, ${palette.pageBackground}bf), url(${JSON.stringify(background)})`
          }
        : undefined;
    const showPasswordForm = branding.loginMode === "password-and-providers";

    return (
        <div
            className="branding-preview"
            data-preview-mode={mode}
            data-brand-theme={themeName}
            style={{
                ...getBrandingCssVariables(branding, mode),
                ...backgroundStyle
            }}
        >
            <div className="branding-preview__card">
                {/* A theme may ship no artwork at all (the `template` theme
                    is deliberately unbranded), in which case the header is
                    omitted entirely until a logo is uploaded. */}
                {(logo || defaultLogo) && (
                    <div className="branding-preview__logo-wrap">
                        <img
                            className="branding-preview__logo"
                            src={logo || defaultLogo?.src}
                            alt={
                                branding.companyName
                                    ? `${branding.companyName} logo`
                                    : "Company logo"
                            }
                            style={logo ? undefined : defaultLogo?.style}
                        />
                    </div>
                )}
                <h2>Sign in to your account</h2>

                {showPasswordForm && (
                    <>
                        <label htmlFor="branding-preview-email">Username or email</label>
                        <input id="branding-preview-email" type="email" placeholder="Username or email" readOnly />
                        <div className="branding-preview__label-row">
                            <label htmlFor="branding-preview-password">Password</label>
                            <span>Forgot password?</span>
                        </div>
                        <input id="branding-preview-password" type="password" placeholder="Password" readOnly />
                        <label className="branding-preview__remember">
                            <input type="checkbox" readOnly />
                            Remember me
                        </label>
                        <button type="button">Sign in</button>
                    </>
                )}

                <div className="branding-preview__providers">
                    {["Google", "Microsoft Entra", "Authentik", "Keycloak"].map(provider => (
                        <div key={provider}>Sign in with {provider}</div>
                    ))}
                </div>

            </div>
        </div>
    );
}
