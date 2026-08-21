/**
 * Colour primitives for the branding layer.
 *
 * Deliberately dependency-free. Two constraints rule out a colour library here:
 * `BrandingPalette` stores `#rrggbb` and nothing else (see `HEX_COLOR` in
 * `brandingConfig.ts`, and the page-background gradient that concatenates an
 * alpha suffix onto the hex), and this code ships inside the theme JAR, where
 * every kilobyte is served to an unauthenticated login page.
 *
 * Lightness maths happen in OKLCH rather than HSL. HSL lightness is not
 * perceptual — `hsl(60 100% 50%)` (yellow) reads far brighter than
 * `hsl(240 100% 50%)` (blue) — so an HSL palette generator produces ramps that
 * look even in numbers and uneven on screen.
 */

export type Oklch = {
    /** Perceptual lightness, 0 (black) to 1 (white). */
    L: number;
    /** Chroma. Unbounded in principle; sRGB runs out somewhere near 0.33. */
    C: number;
    /** Hue in radians, as returned by `Math.atan2`. */
    h: number;
};

const HEX_COLOR = /^#?[0-9a-f]{6}$/i;

/** sRGB transfer function, and its inverse. */
function toLinear(channel: number): number {
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function toGamma(channel: number): number {
    return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

export function isHexColor(value: string): boolean {
    return HEX_COLOR.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
    const digits = hex.replace("#", "");

    return [0, 2, 4].map(offset => parseInt(digits.slice(offset, offset + 2), 16) / 255) as [
        number,
        number,
        number
    ];
}

function rgbToHex(rgb: number[]): string {
    return `#${rgb
        .map(channel =>
            Math.round(Math.min(1, Math.max(0, channel)) * 255)
                .toString(16)
                .padStart(2, "0")
        )
        .join("")}`;
}

/* Björn Ottosson's OKLab matrices. */
function rgbToOklab(rgb: [number, number, number]): [number, number, number] {
    const [r, g, b] = rgb.map(toLinear);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    ];
}

function oklabToRgb(lab: [number, number, number]): number[] {
    const [L, a, b] = lab;
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ].map(toGamma);
}

/** A hair of tolerance, so a colour that is only floating-point-outside sRGB is
    treated as inside it rather than being desaturated for nothing. */
const GAMUT_EPSILON = 0.0005;

function isDisplayable(rgb: number[]): boolean {
    return rgb.every(channel => channel >= -GAMUT_EPSILON && channel <= 1 + GAMUT_EPSILON);
}

export function toOklch(hex: string): Oklch {
    const [L, a, b] = rgbToOklab(hexToRgb(hex));

    return { L, C: Math.hypot(a, b), h: Math.atan2(b, a) };
}

/**
 * OKLCH back to a hex colour, reducing chroma until the result fits in sRGB.
 *
 * OKLCH can name colours no sRGB display can show, and the naive conversion
 * clips each channel independently — which shifts the hue, so a "lighter brand
 * purple" comes back subtly pink. Holding L and h while walking C down keeps
 * the hue and the lightness the palette was reasoning about.
 */
export function fromOklch({ L, C, h }: Oklch): string {
    const at = (chroma: number) =>
        oklabToRgb([L, Math.cos(h) * chroma, Math.sin(h) * chroma]);

    if (isDisplayable(at(C))) return rgbToHex(at(C));

    let displayable = 0;
    let clipped = C;

    /* 24 halvings resolves chroma far finer than an 8-bit channel can show. */
    for (let step = 0; step < 24; step++) {
        const middle = (displayable + clipped) / 2;

        if (isDisplayable(at(middle))) {
            displayable = middle;
        } else {
            clipped = middle;
        }
    }

    return rgbToHex(at(displayable));
}

/** WCAG 2.x relative luminance. */
function luminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex).map(toLinear);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(left: string, right: string): number {
    const [lighter, darker] = [luminance(left), luminance(right)].sort(
        (first, second) => second - first
    );

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Black or white, whichever has more WCAG contrast against `color`.
 *
 * The primary colour is admin-chosen, so a fixed white label goes unreadable as
 * soon as someone picks a light brand colour. For both default palettes this
 * returns exactly what the design system's own `--primary-foreground` token
 * says: white on the light purple, black on the dark one.
 */
export function readableOn(color: string): string {
    if (!isHexColor(color)) return "#ffffff";

    return contrastRatio("#000000", color) >= contrastRatio("#ffffff", color)
        ? "#000000"
        : "#ffffff";
}
