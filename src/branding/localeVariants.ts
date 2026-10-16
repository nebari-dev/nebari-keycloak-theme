/*
 * Where a realm's published theme lives, and how to decide what it actually is.
 *
 * The config is stored in the realm's localization messages — once per locale,
 * because that is the only per-realm store the login page can read before
 * authentication. Storing it per locale means the locales can disagree, and
 * every hazard in this file follows from that.
 *
 * Kept out of `BrandingSection.tsx` so it can be tested without loading the
 * console's component tree: choosing the wrong value here silently destroys a
 * realm's branding on the next publish.
 */

/**
 * Every locale a publish has to write.
 *
 * The config is not a translation, but the realm's localization messages are
 * the only per-realm store the login page can read before authentication — so
 * the same value is written under every locale the realm supports, plus `en` as
 * the fallback Keycloak resolves when a visitor's locale has no entry.
 */
export function publishLocales(
    locale: string,
    supportedLocales: string[] | undefined
): string[] {
    return [...new Set(["en", locale, ...(supportedLocales ?? [])])];
}

/**
 * One distinct stored value, and the locales carrying it.
 *
 * The published config lives once per locale, which means the locales can
 * disagree. Reading only one of them and treating it as the truth is what makes
 * that dangerous: if the realm's default locale changes to one that was never
 * published to, that locale reads empty, the editor shows theme defaults, and
 * the next publish writes those defaults over the real configuration in every
 * other locale.
 */
export type LocaleVariant = {
    /** The raw stored message, or `undefined` where the locale has none. */
    value: string | undefined;
    locales: string[];
};

/** The outcome of reading every locale. */
export type LocaleRead = {
    variants: LocaleVariant[];
    /**
     * Locales whose value could not be read at all.
     *
     * Kept apart from the variants rather than folded in as "no value". The two
     * mean opposite things: an empty locale is one nothing was published to,
     * while an unreadable one may hold anything — including the realm's only
     * copy of its branding. Treating a failed read as empty is what would let
     * a transient outage present as an unbranded realm.
     */
    unreadable: string[];
};

/**
 * Group the locales by what each has stored, most-carried variant first, and
 * report separately any that could not be read.
 */
export async function readLocaleVariants(
    read: (locale: string) => Promise<string | undefined>,
    locales: string[]
): Promise<LocaleRead> {
    const byValue = new Map<string | undefined, string[]>();
    const unreadable: string[] = [];

    for (const locale of locales) {
        try {
            const value = await read(locale);

            byValue.set(value, [...(byValue.get(value) ?? []), locale]);
        } catch {
            unreadable.push(locale);
        }
    }

    return {
        variants: [...byValue.entries()]
            .map(([value, carriers]) => ({ value, locales: carriers }))
            .sort((left, right) => right.locales.length - left.locales.length),
        unreadable
    };
}
/** What a set of locale variants says the realm's published theme is. */
export type CanonicalSelection =
    /** Nothing published anywhere, and every locale was read successfully. */
    | { kind: "unbranded" }
    /**
     * Nothing published was *found*, but some locale could not be read — so
     * whether the realm is branded is unknown. Distinct from `unbranded`
     * because the editor must not open: theme defaults would be
     * indistinguishable from a genuinely unbranded realm, and publishing them
     * would overwrite whatever the unreadable locales hold.
     */
    | { kind: "unreadable"; unreadable: string[] }
    | {
          kind: "canonical";
          variant: LocaleVariant;
          /** Locales that need writing: empty ones and unreadable ones alike. */
          stale: string[];
          /** The subset of `stale` that failed to read rather than being empty. */
          unreadable: string[];
      }
    | {
          kind: "conflict";
          variants: LocaleVariant[];
          /**
           * Carried through the conflict too. Resolving one writes the chosen
           * theme over every other locale, an unreadable one included — so it
           * may be discarding a third theme nobody has seen, and the chooser
           * has to say so before the admin commits.
           */
          unreadable: string[];
      };

/**
 * Decide which stored value is the realm's theme.
 *
 * Deliberately not "whatever the default locale holds". A realm can have its
 * default locale changed to one that was never published to; that locale reads
 * empty, and treating it as authoritative would show the editor a set of theme
 * defaults indistinguishable from an unbranded realm — with the next publish
 * writing those defaults over the real config in every other locale.
 *
 * So a populated value always wins over an empty one, and when two populated
 * values disagree there is no safe guess: the caller has to ask, because either
 * answer discards a theme somebody published.
 */
export function selectCanonicalVariant(
    read: LocaleRead,
    locales: string[]
): CanonicalSelection {
    const populated = read.variants.filter(
        variant => variant.value !== undefined && variant.value !== ""
    );

    if (populated.length === 0) {
        /* "Found nothing" and "could not look" are not the same answer. Only
           the first one means the realm is unbranded. */
        return read.unreadable.length === 0
            ? { kind: "unbranded" }
            : { kind: "unreadable", unreadable: read.unreadable };
    }

    if (populated.length > 1) {
        return { kind: "conflict", variants: populated, unreadable: read.unreadable };
    }

    const variant = populated[0];

    return {
        kind: "canonical",
        variant,
        stale: locales.filter(locale => !variant.locales.includes(locale)),
        unreadable: read.unreadable
    };
}
