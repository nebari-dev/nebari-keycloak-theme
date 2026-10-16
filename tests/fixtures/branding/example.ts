import { readFileSync } from "node:fs";
import {
    DEFAULT_BRANDING_ADVANCED,
    DEFAULT_BRANDING_CONFIG,
    type BrandingAdvanced,
    type BrandingConfig
} from "../../../src/branding/brandingConfig";

/**
 * "Example", the made-up brand the images in docs/theme-customization.md
 * show. The mark and backgrounds sit beside this file; the configs embed them
 * as data URIs, as an upload in the editor does.
 */
function dataUri(file: string, type: string): string {
    const bytes = readFileSync(new URL(`./${file}`, import.meta.url));
    return `data:${type};base64,${bytes.toString("base64")}`;
}

export const exampleBackgroundFile = new URL("./example-background-light.webp", import.meta.url);

const mark = dataUri("example-mark.png", "image/png");

/** Palette, logo and company name: what the editor's main cards set. */
export const exampleBrand: BrandingConfig = {
    ...DEFAULT_BRANDING_CONFIG,
    companyName: "Example",
    logo: { light: mark, dark: mark },
    cardRadius: 16,
    light: {
        primary: "#1d4ed8",
        primaryHover: "#1e40af",
        pageBackground: "#eef2ff",
        cardBackground: "#ffffff",
        inputBackground: "#f1f5f9",
        text: "#0f172a",
        mutedText: "#475569",
        border: "#94a3b8"
    },
    dark: {
        primary: "#2563eb",
        primaryHover: "#3b82f6",
        pageBackground: "#0b1026",
        cardBackground: "#141b3a",
        inputBackground: "#1e2750",
        text: "#f8fafc",
        mutedText: "#a5b4fc",
        border: "#4b5694"
    }
};

export const exampleWithBackground: BrandingConfig = {
    ...exampleBrand,
    backgroundImage: {
        light: dataUri("example-background-light.webp", "image/webp"),
        dark: dataUri("example-background-dark.webp", "image/webp")
    }
};

export const exampleAdvanced: BrandingAdvanced = {
    ...DEFAULT_BRANDING_ADVANCED,
    font: "inter-tight",
    cardOpacity: 35,
    cardBlur: 16,
    buttonShape: "pill",
    buttonArrow: true,
    wordmark: "Example",
    favicon: mark,
    dashboardMark: mark
};
