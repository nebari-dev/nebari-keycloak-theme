import { expect, test } from "@playwright/test";
import {
    publishLocales,
    readLocaleVariants,
    selectCanonicalVariant
} from "../src/branding/localeVariants";

const THEME_A = "base64:aaa";
const THEME_B = "base64:bbb";

function reader(stored: Record<string, string | undefined>, failing: string[] = []) {
    return async (locale: string) => {
        if (failing.includes(locale)) {
            throw new Error(`cannot read ${locale}`);
        }

        return stored[locale];
    };
}

test("writes en, the default locale and every supported locale, without repeats", () => {
    expect(publishLocales("de", ["de", "fr", "en"])).toEqual(["en", "de", "fr"]);
    expect(publishLocales("en", undefined)).toEqual(["en"]);
});

test("groups locales by stored value, most-carried first", async () => {
    const read = await readLocaleVariants(
        reader({ en: THEME_A, de: THEME_A, fr: THEME_B }),
        ["en", "de", "fr"]
    );

    expect(read).toEqual({
        variants: [
            { value: THEME_A, locales: ["en", "de"] },
            { value: THEME_B, locales: ["fr"] }
        ],
        unreadable: []
    });
});

/**
 * An unreadable locale must never be folded in as "has no value". The two mean
 * opposite things — nothing was published there, versus it may hold anything —
 * and conflating them is what let a transient read failure present as an
 * unbranded realm.
 */
test("keeps an unreadable locale out of the variants", async () => {
    const read = await readLocaleVariants(reader({ en: THEME_A }, ["de"]), [
        "en",
        "de"
    ]);

    expect(read).toEqual({
        variants: [{ value: THEME_A, locales: ["en"] }],
        unreadable: ["de"]
    });
});

test("a realm nobody has branded is unbranded, not a conflict", async () => {
    const locales = ["en", "de"];
    const read = await readLocaleVariants(reader({}), locales);

    expect(selectCanonicalVariant(read, locales).kind).toBe("unbranded");
});

/**
 * The regression this guards: with every read failing, the old code saw one
 * variant of `undefined` covering all locales, called the realm unbranded, and
 * opened the editor on theme defaults — which an admin could then publish over
 * branding that was only temporarily unreadable.
 */
test("all reads failing is unknown, never unbranded", async () => {
    const locales = ["en", "de"];
    const read = await readLocaleVariants(reader({}, locales), locales);
    const selection = selectCanonicalVariant(read, locales);

    expect(selection.kind).toBe("unreadable");

    if (selection.kind !== "unreadable") return;

    expect(selection.unreadable).toEqual(["en", "de"]);
});

test("empty locales plus one unreadable is unknown, not unbranded", async () => {
    const locales = ["en", "de", "fr"];
    const read = await readLocaleVariants(
        reader({ en: undefined, de: "" }, ["fr"]),
        locales
    );

    expect(selectCanonicalVariant(read, locales).kind).toBe("unreadable");
});

test("an unreadable locale alongside a populated one still opens the editor", async () => {
    const locales = ["en", "de", "fr"];
    const read = await readLocaleVariants(reader({ en: THEME_A }, ["fr"]), locales);
    const selection = selectCanonicalVariant(read, locales);

    expect(selection.kind).toBe("canonical");

    if (selection.kind !== "canonical") return;

    expect(selection.variant.value).toBe(THEME_A);
    /* Both the empty locale and the unreadable one need writing... */
    expect(selection.stale).toEqual(["de", "fr"]);
    /* ...but only one of them is unreadable, which the warning distinguishes. */
    expect(selection.unreadable).toEqual(["fr"]);
});

/**
 * The case that motivated all of this: branding exists under `en`, the realm's
 * default locale then changes to one that was never published to. Reading only
 * the default locale would report an unbranded realm and the next publish would
 * overwrite `en`.
 */
test("a populated locale outranks an empty default locale", async () => {
    const locales = publishLocales("de", ["de", "en"]);
    const read = await readLocaleVariants(reader({ en: THEME_A }), locales);
    const selection = selectCanonicalVariant(read, locales);

    expect(selection.kind).toBe("canonical");

    if (selection.kind !== "canonical") return;

    expect(selection.variant.value).toBe(THEME_A);
    /* `de` is what needs writing, not `en`. */
    expect(selection.stale).toEqual(["de"]);
});

test("an empty string counts as unpublished, not as a theme", async () => {
    const locales = ["en", "de"];
    const read = await readLocaleVariants(reader({ en: "", de: THEME_A }), locales);
    const selection = selectCanonicalVariant(read, locales);

    expect(selection.kind).toBe("canonical");

    if (selection.kind !== "canonical") return;

    expect(selection.variant.value).toBe(THEME_A);
    expect(selection.stale).toEqual(["en"]);
});

test("two disagreeing published themes are a conflict, never a guess", async () => {
    const locales = ["en", "de", "fr"];
    const read = await readLocaleVariants(
        reader({ en: THEME_A, de: THEME_A, fr: THEME_B }),
        locales
    );
    const selection = selectCanonicalVariant(read, locales);

    expect(selection.kind).toBe("conflict");

    if (selection.kind !== "conflict") return;

    /* Both are offered, most-carried first, so the admin can see what each is
       before discarding one. */
    expect(selection.variants.map(variant => variant.locales)).toEqual([
        ["en", "de"],
        ["fr"]
    ]);
    expect(selection.unreadable).toEqual([]);
});

/**
 * Resolving a conflict publishes the chosen theme over every other locale — an
 * unreadable one included, which may hold a third theme nobody has seen. So the
 * conflict has to carry it through for the chooser to warn about.
 */
test("a conflict carries the locales that could not be read", async () => {
    const locales = ["en", "de", "fr"];
    const read = await readLocaleVariants(
        reader({ en: THEME_A, de: THEME_B }, ["fr"]),
        locales
    );
    const selection = selectCanonicalVariant(read, locales);

    expect(selection.kind).toBe("conflict");

    if (selection.kind !== "conflict") return;

    expect(selection.variants.map(variant => variant.value)).toEqual([
        THEME_A,
        THEME_B
    ]);
    expect(selection.unreadable).toEqual(["fr"]);
});

test("one published theme with locales missing it is canonical, and they are stale", async () => {
    const locales = ["en", "de", "fr"];
    const read = await readLocaleVariants(reader({ en: THEME_A }), locales);
    const selection = selectCanonicalVariant(read, locales);

    expect(selection.kind).toBe("canonical");

    if (selection.kind !== "canonical") return;

    expect(selection.stale).toEqual(["de", "fr"]);
});
