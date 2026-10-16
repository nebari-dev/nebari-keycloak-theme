import {
    contrastRatio,
    fromOklch,
    isHexColor,
    readableOn,
    toOklch,
    type Oklch
} from "./color";
import type { BrandingConfig, BrandingPalette } from "./brandingConfig";

/**
 * A whole palette derived from one brand colour.
 *
 * The admin picks "Primary action"; every other colour follows from it, so a
 * realm gets a coherent palette without an admin reasoning about eight hex
 * values and their contrast ratios. Hand-edited colours are respected — see
 * `applyBrandPrimary`, which only regenerates fields that still hold their
 * derived value.
 *
 * The targets below were fitted against `DEFAULT_BRANDING_CONFIG`: feeding this
 * the shipped primaries reproduces the hand-picked palettes to within a few
 * units per channel, so an admin who types the Nebari purple gets the Nebari
 * theme back rather than an approximation of it.
 */

/** Fields `derivePalette` produces. `primary` is the input, so it is not here. */
export const DERIVED_PALETTE_KEYS = [
    "primaryHover",
    "pageBackground",
    "cardBackground",
    "inputBackground",
    "text",
    "mutedText",
    "border"
] as const;

export type DerivedPaletteKey = (typeof DERIVED_PALETTE_KEYS)[number];

/** WCAG AA for body text. */
const TEXT_CONTRAST = 4.5;

/** WCAG 1.4.11 for a UI component's boundary. */
const COMPONENT_CONTRAST = 3;

/**
 * Borders sit below 1.4.11's 3:1 on purpose: the shipped palettes measure 2.00:1
 * (light) and 1.79:1 (dark), and quietly tripling every border's weight is a
 * design change, not a derivation. Raise this to `COMPONENT_CONTRAST` to close
 * the gap deliberately.
 */
const BORDER_CONTRAST = 1.9;

/** Perceptual step per search iteration — finer than an 8-bit channel shows. */
const STEP = 0.01;

/** Below this the hover state is invisible, so the search flips direction. */
const MIN_HOVER_DELTA = 0.04;

const HOVER_DELTA = { light: -0.09, dark: 0.08 } as const;

/* Lightness targets for the neutral surfaces, per mode. */
const SURFACE_LIGHTNESS = {
    light: { page: 0.975, card: 0.995, input: 0.945, text: 0.26 },
    dark: { page: 0.215, card: 0.275, input: 0.315, text: 0.96 }
} as const;

/**
 * Chroma ceilings for the neutrals. Small but not zero: a trace of the brand hue
 * makes the chrome read as part of the palette instead of generic grey, while
 * staying far below the point where a "white" card looks tinted.
 */
const SURFACE_CHROMA = { page: 0.012, card: 0.008, input: 0.016, text: 0.006 } as const;

/** Ink stays close to the hue but never carries visible colour. */
const MUTED_CHROMA = 0.02;

export type DeriveOptions = {
    /** Tint the neutrals with the brand hue. Off gives flat greys. */
    tintNeutrals?: boolean;
    /**
     * Use near-black/near-white body text (L 0.26 / 0.96) instead of pure black
     * or white. On by default because the shipped palettes are `#262628` and
     * `#f8f8f8`: pure `#000` on `#fff` measures 21:1 and reads harsher than the
     * design it would replace.
     */
    softText?: boolean;
};

/**
 * Walk away from `base` and stop at the first step clearing `target`.
 *
 * The direction and the starting point both matter. Starting at the background's
 * own lightness and stepping outward returns the *closest* passing tone, which
 * is what "muted" and "border" want — the loosest tone that is still legible.
 * Starting from the far end instead returns near-black, which passes the ratio
 * and defeats the purpose.
 *
 * Returns the last tone tried when nothing clears the target, so a caller always
 * gets its best effort rather than `null` for an impossible request.
 */
function stepUntilContrast(
    base: string,
    tone: Omit<Oklch, "L">,
    direction: 1 | -1,
    target: number
): string {
    const start = toOklch(base).L;
    let last = base;

    for (let step = 1; step <= 100; step++) {
        const L = start + direction * step * STEP;

        if (L < 0 || L > 1) break;

        last = fromOklch({ ...tone, L });

        if (contrastRatio(last, base) >= target) return last;
    }

    return last;
}

/**
 * How far the lightness can travel from `start` before `label` stops clearing AA
 * against it.
 *
 * The button's label colour is chosen from `primary` alone, so a hover state
 * that wanders outside this band leaves the label unreadable on hover — the kind
 * of regression nobody notices until a brand colour lands near the black/white
 * crossover.
 */
function labelBandEdge(
    label: string,
    tone: Omit<Oklch, "L">,
    start: number,
    direction: 1 | -1
): number {
    let edge = start;

    for (let step = 1; step <= 100; step++) {
        const L = start + direction * step * STEP;

        if (L < 0 || L > 1) break;
        if (contrastRatio(fromOklch({ ...tone, L }), label) < TEXT_CONTRAST) break;

        edge = L;
    }

    return edge;
}

/**
 * The hover colour: a step away from the page background, clamped so the label
 * stays legible.
 *
 * Light mode steps darker and dark mode lighter, which is the direction the
 * shipped palettes already move. Where the clamp leaves no perceptible movement
 * the step flips: for a mid-grey or a saturated red, the "correct" direction can
 * be blocked outright, and a hover state identical to the resting state is worse
 * than one that moves the other way.
 */
function deriveHover(primary: string, mode: "light" | "dark"): string {
    const { L, C, h } = toOklch(primary);
    const label = readableOn(primary);
    const tone = { C, h };

    let direction: 1 | -1 = mode === "dark" ? 1 : -1;
    let edge = labelBandEdge(label, tone, L, direction);

    if (Math.abs(edge - L) < MIN_HOVER_DELTA) {
        direction = direction === 1 ? -1 : 1;
        edge = labelBandEdge(label, tone, L, direction);
    }

    const wanted = L + (direction === 1 ? Math.abs(HOVER_DELTA.dark) : HOVER_DELTA.light);

    return fromOklch({
        ...tone,
        L: direction === 1 ? Math.min(wanted, edge) : Math.max(wanted, edge)
    });
}

/**
 * The full palette implied by one brand colour.
 *
 * Order matters: the surfaces come from the brand hue, and the ink colours are
 * then measured against those surfaces. Deriving `text` from `primary` directly
 * would be wrong — body text sits on the card, not on the button.
 */
export function derivePalette(
    primary: string,
    mode: "light" | "dark",
    options: DeriveOptions = {}
): BrandingPalette {
    const { tintNeutrals = true, softText = true } = options;

    if (!isHexColor(primary)) {
        throw new Error(`derivePalette needs a #rrggbb colour, got "${primary}"`);
    }

    const { C, h } = toOklch(primary);
    const lightness = SURFACE_LIGHTNESS[mode];
    const surface = (L: number, ceiling: number) =>
        fromOklch({ L, C: tintNeutrals ? Math.min(C, ceiling) : 0, h });

    const pageBackground = surface(lightness.page, SURFACE_CHROMA.page);
    const cardBackground = surface(lightness.card, SURFACE_CHROMA.card);
    const inputBackground = surface(lightness.input, SURFACE_CHROMA.input);

    /* Away from the card: darker ink on a light card, lighter on a dark one. */
    const inkDirection = mode === "dark" ? 1 : -1;
    const inkTone = { C: tintNeutrals ? Math.min(C, MUTED_CHROMA) : 0, h };

    return {
        primary,
        primaryHover: deriveHover(primary, mode),
        pageBackground,
        cardBackground,
        inputBackground,
        text: softText
            ? surface(lightness.text, SURFACE_CHROMA.text)
            : readableOn(cardBackground),
        mutedText: stepUntilContrast(cardBackground, inkTone, inkDirection, TEXT_CONTRAST),
        border: stepUntilContrast(cardBackground, inkTone, inkDirection, BORDER_CONTRAST)
    };
}

/**
 * The same brand colour, retuned for the other appearance.
 *
 * A dark background needs a lighter, slightly more saturated accent to read as
 * the same brand — which is exactly the relationship between the two shipped
 * primaries: `#9547c0` and `#b053e2` share a hue to within 0.2° and differ by
 * L +0.069, C +0.027.
 *
 * The result is then floored at 3:1 against its own card. Without that, a very
 * dark brand colour (`#111827`) yields a dark-mode primary of `#212939` on a
 * `#25282c` card — a button with no visible edge.
 */
export function companionPrimary(primary: string, target: "light" | "dark"): string {
    const { L, C, h } = toOklch(primary);
    const towardsDark = target === "dark";
    const shifted = fromOklch({
        L: towardsDark ? Math.min(0.9, L + 0.069) : Math.max(0.15, L - 0.069),
        C: Math.max(0, towardsDark ? C + 0.027 : C - 0.027),
        h
    });
    const card = derivePalette(shifted, target).cardBackground;

    if (contrastRatio(shifted, card) >= COMPONENT_CONTRAST) return shifted;

    return stepUntilContrast(
        card,
        { C: toOklch(shifted).C, h },
        towardsDark ? 1 : -1,
        COMPONENT_CONTRAST
    );
}

/**
 * Whether `key` is still following the primary, rather than holding a colour the
 * admin chose.
 *
 * Linkage is inferred rather than stored, which keeps `BrandingConfig` and every
 * exported theme file unchanged: an imported or hand-written theme gets the same
 * treatment as one edited in the console, with no migration and no flag that can
 * fall out of step with the colours it describes.
 *
 * Two things count as "not chosen". The obvious one is a value this module
 * produced. The other is a value still equal to the theme's own default —
 * without it, a realm starting from the shipped palette would have nothing
 * linked at all, because those colours were picked by hand and land near, but
 * not on, the derived ones (the dark card is `#353538` against a derived
 * `#29272b`). That is the same "untouched means default" reading
 * `isBrandingCustomized` already relies on.
 */
export function isDerivedFromPrimary(
    palette: BrandingPalette,
    key: DerivedPaletteKey,
    mode: "light" | "dark",
    options?: DeriveOptions,
    defaults?: BrandingPalette
): boolean {
    if (!isHexColor(palette.primary)) return false;

    const current = palette[key].toLowerCase();

    if (defaults !== undefined && current === defaults[key].toLowerCase()) return true;

    return current === derivePalette(palette.primary, mode, options)[key];
}

/** Every field of `palette` that is still following the primary. */
export function getLinkedKeys(
    palette: BrandingPalette,
    mode: "light" | "dark",
    options?: DeriveOptions,
    defaults?: BrandingPalette
): DerivedPaletteKey[] {
    return DERIVED_PALETTE_KEYS.filter(key =>
        isDerivedFromPrimary(palette, key, mode, options, defaults)
    );
}

/**
 * A palette rebuilt around `primary`, keeping whatever the admin edited by hand.
 *
 * Linkage is read from the *old* palette, before the new primary lands: a field
 * that was following the old primary stays automatic, and anything else was
 * chosen deliberately and survives untouched.
 */
export function applyPrimary(
    palette: BrandingPalette,
    primary: string,
    mode: "light" | "dark",
    options?: DeriveOptions,
    defaults?: BrandingPalette
): BrandingPalette {
    if (!isHexColor(primary)) return { ...palette, primary };

    const linked = getLinkedKeys(palette, mode, options, defaults);
    const derived = derivePalette(primary, mode, options);
    const next: BrandingPalette = { ...palette, primary };

    for (const key of linked) next[key] = derived[key];

    return next;
}

/**
 * Push a new brand colour through both appearances.
 *
 * The edited mode takes the colour verbatim — it is what the admin typed. The
 * other mode's primary is only updated while it is itself still derived, so an
 * admin who deliberately picked a different dark-mode accent keeps it.
 */
export function applyBrandPrimary(
    config: BrandingConfig,
    primary: string,
    editedMode: "light" | "dark",
    options?: DeriveOptions,
    defaults?: BrandingConfig
): BrandingConfig {
    const otherMode = editedMode === "light" ? "dark" : "light";
    const next: BrandingConfig = {
        ...config,
        [editedMode]: applyPrimary(
            config[editedMode],
            primary,
            editedMode,
            options,
            defaults?.[editedMode]
        )
    };

    if (!isHexColor(primary)) return next;

    const otherPrimary = config[otherMode].primary.toLowerCase();
    const followsEditedMode =
        isHexColor(config[editedMode].primary) &&
        otherPrimary === companionPrimary(config[editedMode].primary, otherMode);
    const isDefault =
        defaults !== undefined && otherPrimary === defaults[otherMode].primary.toLowerCase();

    if (!followsEditedMode && !isDefault) return next;

    return {
        ...next,
        [otherMode]: applyPrimary(
            config[otherMode],
            companionPrimary(primary, otherMode),
            otherMode,
            options,
            defaults?.[otherMode]
        )
    };
}
