import { expect, test } from "@playwright/test";
import {
    getBrandingImage,
    normalizeBrandingConfig,
    TEMPLATE_BRANDING_CONFIG
} from "../src/branding/brandingConfig";
import { calculateSourceCrop } from "../src/branding/imageUpload";

const LIGHT_LOGO = "https://assets.example.com/logo-light.png";
const DARK_LOGO = "https://assets.example.com/logo-dark.png";

test("migrates version 1 single images to both appearances", () => {
    const migrated = normalizeBrandingConfig(
        {
            ...TEMPLATE_BRANDING_CONFIG,
            version: 1,
            logo: LIGHT_LOGO,
            backgroundImage: "https://assets.example.com/background.jpg"
        },
        TEMPLATE_BRANDING_CONFIG
    );

    expect(migrated.version).toBe(2);
    expect(migrated.logo).toEqual({ light: LIGHT_LOGO, dark: LIGHT_LOGO });
    expect(migrated.backgroundImage).toEqual({
        light: "https://assets.example.com/background.jpg",
        dark: "https://assets.example.com/background.jpg"
    });
});

test("resolves an empty appearance from its sibling image", () => {
    const branding = normalizeBrandingConfig(
        {
            ...TEMPLATE_BRANDING_CONFIG,
            logo: { light: LIGHT_LOGO, dark: "" },
            backgroundImage: { light: "", dark: DARK_LOGO }
        },
        TEMPLATE_BRANDING_CONFIG
    );

    expect(getBrandingImage(branding.logo, "light")).toBe(LIGHT_LOGO);
    expect(getBrandingImage(branding.logo, "dark")).toBe(LIGHT_LOGO);
    expect(getBrandingImage(branding.backgroundImage, "light")).toBe(DARK_LOGO);
});

test("converts a centered rendered crop to source pixels", () => {
    const crop = calculateSourceCrop({
        imageWidth: 1000,
        imageHeight: 500,
        viewportWidth: 200,
        viewportHeight: 200,
        renderedWidth: 400,
        renderedHeight: 200,
        scale: 0.4,
        offsetX: 0,
        offsetY: 0
    });

    expect(crop).toEqual({ x: 250, y: 0, width: 500, height: 500 });
});

test("preserves crop position when the image is moved", () => {
    const crop = calculateSourceCrop({
        imageWidth: 1000,
        imageHeight: 500,
        viewportWidth: 200,
        viewportHeight: 200,
        renderedWidth: 400,
        renderedHeight: 200,
        scale: 0.4,
        offsetX: 100,
        offsetY: 0
    });

    expect(crop).toEqual({ x: 0, y: 0, width: 500, height: 500 });
});
