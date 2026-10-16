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
import type { LoginProvider } from "../../branding/loginProviders";

type BrandingPreviewProps = {
    branding: BrandingConfig;
    mode: "light" | "dark";
    themeName: CustomThemeName;
    /**
     * The realm's own identity providers, by display name.
     *
     * An empty array means the realm has none, and the preview then shows none
     * — the placeholder list this replaced implied buttons that would never
     * appear, and hid the case that matters: a realm set to "providers only"
     * with no providers configured still gets the password form.
     *
     * `undefined` means they could not be read, which is distinct from "none":
     * the preview says so rather than quietly claiming the realm has none.
     */
    identityProviders: LoginProvider[] | undefined;
};

export function BrandingPreview({
    branding,
    mode,
    themeName,
    identityProviders
}: BrandingPreviewProps) {
    const palette = branding[mode];
    const themeDefinition = getThemeDefinition(themeName);
    const defaultLogo = getThemeLogo(
        themeDefinition,
        mode,
        import.meta.env.BASE_URL
    );
    const logo = getBrandingImage(branding.logo, mode);
    const background = getBrandingImage(branding.backgroundImage, mode);
    /* `d9`, matching both login shells exactly — see the `backgroundImage` in
       `src/login/Template.tsx` and `src/login/template/Template.tsx`. A lighter
       overlay here made every previewed background look brighter than the page
       it was previewing. */
    const backgroundStyle = background
        ? {
              backgroundImage: `linear-gradient(${palette.pageBackground}d9, ${palette.pageBackground}d9), url(${JSON.stringify(background)})`
          }
        : undefined;

    /* The same rule the login pages apply: "providers only" cannot hide the
       password form when there is nothing else to sign in with, or the realm
       would have no way in at all. The shells also gate on `realm.password`,
       which is derived from the realm's browser flow and is not readable from
       the admin REST representation — so a realm that has disabled password
       authentication outright will show a password form here that the real page
       omits. */
    const showPasswordForm =
        branding.loginMode === "password-and-providers" ||
        identityProviders?.length === 0;

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

                {identityProviders === undefined ? (
                    <div className="branding-preview__providers-unknown">
                        Identity providers could not be read, so any provider
                        buttons are missing from this preview.
                    </div>
                ) : (
                    identityProviders.length !== 0 && (
                        <div className="branding-preview__providers">
                            {identityProviders.map(provider => (
                                /* Keyed on the alias rather than the label: two
                                   providers may share a display name. */
                                <div key={provider.id}>
                                    Sign in with {provider.label}
                                </div>
                            ))}
                        </div>
                    )
                )}

            </div>
        </div>
    );
}
