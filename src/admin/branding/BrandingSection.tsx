import {
    AlertCircleIcon,
    DownloadIcon,
    EllipsisVerticalIcon,
    InfoIcon,
    RotateCcwIcon,
    UploadIcon
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { PageSection } from "../../shared/@patternfly/react-core";
import { useAlerts } from "../../shared/keycloak-ui-shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
    serializeBrandingConfig,
    type BrandingConfig,
    type BrandingPalette
} from "../../branding/brandingConfig";
import {
    applyBrandPrimary,
    derivePalette,
    getLinkedKeys,
    type DerivedPaletteKey
} from "../../branding/derivePalette";
import { isHexColor, normalizeHexInput } from "../../branding/color";
import {
    getBrandingImageDimensions,
    type ImageDimensions
} from "../../branding/imageUpload";
import {
    DEFAULT_THEME_NAME,
    cloneThemeDefaults,
    getThemeDefinition,
    matchThemeName,
    parseThemeBrandingConfig,
    type CustomThemeName
} from "../../themes/themeCatalog";
import { serializeThemeExport, themeExportFileName } from "../../themes/themePresets";
import {
    publishLocales,
    readLocaleVariants,
    selectCanonicalVariant,
    type LocaleVariant
} from "../../branding/localeVariants";
import {
    getLoginProviders,
    type LoginProvider
} from "../../branding/loginProviders";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../context/realm-context/RealmContext";
import { BrandingPreview } from "./BrandingPreview";
import { ImportThemeDialog } from "./ImportThemeDialog";
import { ImageCropDialog } from "./ImageCropDialog";

import "./branding.css";

type PaletteKey = keyof BrandingPalette;

/**
 * A hex field that commits only complete colours.
 *
 * Palette linkage is recomputed by comparing each colour against the one the
 * current primary would derive, so an invalid primary erases it. Writing every
 * keystroke straight to the draft walked it through "#", "#9", "#95"… and the
 * keystroke that finally completed the colour was read against that invalid
 * predecessor: `getLinkedKeys` returned nothing and no field followed the new
 * primary. Typing a colour therefore silently broke the cascade, while the
 * badges still read "Auto" because the untouched fields still matched the
 * theme defaults.
 *
 * Holding the partial text here keeps the draft on the last valid colour, so
 * linkage survives typing and only real colours ever reach the config.
 */
function HexColorInput({
    id,
    label,
    onCommit,
    value
}: {
    id: string;
    label: string;
    onCommit: (value: string) => void;
    value: string;
}) {
    const [text, setText] = useState<string | null>(null);

    /* Only while the field is being edited: a committed value is valid by
       construction, and `onBlur` clears the draft back to it. */
    const isInvalid = text !== null && normalizeHexInput(text) === undefined;

    return (
        <Input
            aria-invalid={isInvalid}
            aria-label={label}
            id={id}
            onBlur={() => setText(null)}
            onChange={event => {
                const next = event.target.value;

                setText(next);

                const normalized = normalizeHexInput(next);

                if (normalized !== undefined) onCommit(normalized);
            }}
            value={text ?? value}
        />
    );
}

const PALETTE_FIELDS: { key: PaletteKey; label: string }[] = [
    { key: "primary", label: "Primary action" },
    { key: "primaryHover", label: "Primary hover" },
    { key: "pageBackground", label: "Page background" },
    { key: "cardBackground", label: "Card background" },
    { key: "inputBackground", label: "Input background" },
    { key: "text", label: "Main text" },
    { key: "mutedText", label: "Muted text" },
    { key: "border", label: "Borders" }
];

const COLOR_SCHEME_LABELS: Record<BrandingConfig["colorScheme"], string> = {
    light: "Light",
    dark: "Dark",
    system: "Follow visitor system preference"
};

const LOGIN_MODE_LABELS: Record<BrandingConfig["loginMode"], string> = {
    "providers-only": "External identity providers only",
    "password-and-providers": "Username/password and external providers"
};

/**
 * The realm's identity providers as the login page would offer them.
 *
 * `undefined` means they could not be read at all, which the preview reports
 * rather than passing off as "this realm has none": a realm can hold a record
 * Keycloak itself cannot deserialize, and the editor is still usable without
 * knowing them.
 */
async function readLoginIdentityProviders(
    adminClient: ReturnType<typeof useAdminClient>["adminClient"],
    realm: string
): Promise<LoginProvider[] | undefined> {
    const providers = await adminClient.identityProviders
        .find({ realm })
        .catch(() => undefined);

    return providers === undefined ? undefined : getLoginProviders(providers);
}

function getConfiguredThemeName(
    loginTheme: string | undefined,
    adminTheme: string | undefined
): CustomThemeName {
    for (const candidate of [loginTheme, adminTheme]) {
        const themeName = matchThemeName(candidate);

        if (themeName !== undefined) return themeName;
    }

    return DEFAULT_THEME_NAME;
}

/**
 * The File System Access API, which is not in TypeScript's DOM lib yet.
 * Chromium-based browsers implement it; Firefox and Safari do not.
 */
type SaveFilePicker = (options: {
    id?: string;
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{
    createWritable: () => Promise<{
        write: (data: string) => Promise<void>;
        close: () => Promise<void>;
    }>;
}>;

/**
 * Saves a theme file, asking the admin where to put it.
 *
 * A page cannot write to a path of its own choosing — the browser decides where
 * downloads land, which is why an export otherwise disappears into the Downloads
 * folder. `showSaveFilePicker` is the one mechanism that lets the admin steer it,
 * so they can save straight into the project's `custom_themes/` directory; the
 * browser then remembers that directory against the `id` below and offers it
 * again next time.
 *
 * Where the API is missing (Firefox, Safari) this falls back to an ordinary
 * download, and so does a thrown `SecurityError` — the picker requires a user
 * gesture, and some embedded contexts refuse it.
 *
 * Returns whether the admin actually saved, so the caller does not claim success
 * after a cancelled dialog.
 */
async function saveThemeFile(fileName: string, text: string): Promise<boolean> {
    const showSaveFilePicker = (
        window as unknown as { showSaveFilePicker?: SaveFilePicker }
    ).showSaveFilePicker;

    if (typeof showSaveFilePicker === "function") {
        try {
            const handle = await showSaveFilePicker({
                id: "nebari-theme-export",
                suggestedName: fileName,
                types: [
                    {
                        description: "Nebari theme",
                        accept: { "application/json": [".json"] }
                    }
                ]
            });
            const writable = await handle.createWritable();

            await writable.write(text);
            await writable.close();

            return true;
        } catch (error) {
            /* The admin dismissed the dialog — not an error worth reporting. */
            if (error instanceof DOMException && error.name === "AbortError") {
                return false;
            }
            /* Anything else falls through to the download below. */
        }
    }

    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    /* Deferred: revoking in the same tick can cancel a download that has not
       started yet, and this branch is the one Firefox and Safari take. */
    setTimeout(() => URL.revokeObjectURL(url), 0);

    return true;
}

type ImageControlProps = {
    /** Greyed out and non-interactive; used while the console reuses the login logo. */
    disabled?: boolean;
    id: string;
    label: string;
    help: string;
    kind: "logo" | "background";
    value: string;
    onChange: (value: string) => void;
    onError: (message: string) => void;
};

function ImageControl({
    id,
    label,
    help,
    kind,
    value,
    onChange,
    onError,
    disabled = false
}: ImageControlProps) {
    const [pendingImage, setPendingImage] = useState<{
        file: File;
        dimensions: ImageDimensions;
    }>();
    const isEmbedded = value.startsWith("data:");

    const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        try {
            setPendingImage({
                file,
                dimensions: await getBrandingImageDimensions(file)
            });
        } catch (error) {
            onError(
                error instanceof Error
                    ? error.message
                    : "The image could not be processed."
            );
        }
    };

    return (
        <>
            <Field>
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                <FieldDescription>{help}</FieldDescription>
                <div className="branding-image-control">
                    <Input
                        aria-label={`${label} URL`}
                        disabled={disabled || isEmbedded}
                        id={id}
                        onChange={event => onChange(event.target.value)}
                        placeholder="https://assets.example.com/image.png"
                        value={isEmbedded ? "Uploaded image stored in this realm" : value}
                    />
                    {/* A label wrapping a hidden file input, rather than a Button
                        with a click handler: it keeps the native picker's keyboard
                        and screen-reader behaviour without a ref. */}
                    <Button
                        disabled={disabled}
                        render={<label htmlFor={`${id}-file`} />}
                        variant="outline"
                    >
                        <UploadIcon aria-hidden />
                        Upload
                    </Button>
                    <input
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={disabled}
                        id={`${id}-file`}
                        onChange={handleFile}
                        type="file"
                    />
                    {value !== "" && !disabled && (
                        <Button onClick={() => onChange("")} variant="ghost">
                            Remove
                        </Button>
                    )}
                </div>
            </Field>
            <ImageCropDialog
                file={pendingImage?.file}
                imageSize={pendingImage?.dimensions}
                kind={kind}
                label={label}
                onCancel={() => setPendingImage(undefined)}
                onComplete={next => {
                    onChange(next);
                    setPendingImage(undefined);
                }}
            />
        </>
    );
}

export default function BrandingSection() {
    const { adminClient } = useAdminClient();
    const { realm, realmRepresentation } = useRealm();
    const { addAlert, addError } = useAlerts();

    const themeDefinition = useMemo(
        () =>
            getThemeDefinition(
                getConfiguredThemeName(
                    realmRepresentation?.loginTheme,
                    realmRepresentation?.adminTheme
                )
            ),
        [realmRepresentation?.loginTheme, realmRepresentation?.adminTheme]
    );

    const locale = realmRepresentation?.defaultLocale || "en";

    const [draft, setDraft] = useState<BrandingConfig>(() =>
        cloneThemeDefaults(themeDefinition)
    );
    const [published, setPublished] = useState<BrandingConfig>(() =>
        cloneThemeDefaults(themeDefinition)
    );
    const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [imageError, setImageError] = useState("");
    const [importOpen, setImportOpen] = useState(false);
    /**
     * Set when the published config could not be read. The editor is not
     * rendered while this is set: its inputs would be seeded from the theme
     * defaults, which look exactly like a realm that has never been branded —
     * so an admin could adjust and publish those defaults straight over a
     * configuration that was only temporarily unreadable.
     */
    const [loadError, setLoadError] = useState<string>();
    const [reloadCount, setReloadCount] = useState(0);
    /** Locales whose stored value disagrees with the one being edited. */
    const [staleLocales, setStaleLocales] = useState<string[]>([]);
    /**
     * The subset of `staleLocales` that could not be read, as opposed to being
     * empty. Worth separating in the warning: an empty locale was never
     * published to, while an unreadable one might hold something else.
     */
    const [unreadableLocales, setUnreadableLocales] = useState<string[]>([]);
    /**
     * The locales the theme in the editor came from. The default locale is not
     * necessarily among them — that is the whole point of reading them all — so
     * the drift warning has to name these rather than assume the default.
     */
    const [canonicalLocales, setCanonicalLocales] = useState<string[]>([]);
    /**
     * Set when more than one locale carries branding and they disagree. There is
     * no safe way to guess which one the admin meant to keep, and picking wrong
     * discards a real configuration — so the editor asks instead of choosing.
     */
    const [variantChoice, setVariantChoice] = useState<LocaleVariant[]>();
    /** `undefined` until read, and after a failed read — see `BrandingPreview`. */
    const [identityProviders, setIdentityProviders] = useState<LoginProvider[]>();

    const isDirty = useMemo(
        () => JSON.stringify(draft) !== JSON.stringify(published),
        [draft, published]
    );

    /**
     * Publishing is also the repair for locale drift, so it cannot be gated on
     * the draft having changed. Adding a locale after publishing, opening a
     * realm that is already out of sync, or discarding after a partial publish
     * all leave the draft equal to the published config while some locales
     * still need writing — and the warning tells the admin to publish again.
     */
    const canPublish = isDirty || staleLocales.length !== 0;

    useEffect(() => {
        let active = true;

        void (async () => {
            setLoading(true);
            /* Reset everything derived from the previous realm before reading
               the next one. The render guards are ordered chooser, then load
               error, then editor — so a conflict left over from another realm
               would otherwise be shown for this one. */
            setLoadError(undefined);
            setVariantChoice(undefined);
            setStaleLocales([]);
            setUnreadableLocales([]);
            setCanonicalLocales([]);
            try {
                const locales = publishLocales(
                    locale,
                    realmRepresentation?.supportedLocales
                );

                /* Every locale is read before anything is decided. Reading only
                   the default locale would make a realm whose default has just
                   changed look unbranded, and the first publish after that
                   would overwrite the configuration the other locales hold. */
                const read = await readLocaleVariants(
                    async selectedLocale =>
                        (
                            await adminClient.realms.getRealmLocalizationTexts({
                                realm,
                                selectedLocale
                            })
                        )[themeDefinition.brandingMessageKey],
                    locales
                );

                const selection = selectCanonicalVariant(read, locales);

                /* Nothing published was found, but not every locale could be
                   read — so this realm may well be branded. Handled exactly
                   like a failed load, because opening the editor on theme
                   defaults is what would let a transient outage turn into an
                   overwrite. */
                if (selection.kind === "unreadable") {
                    if (active) {
                        setLoadError(
                            `The theme could not be read for ${selection.unreadable.join(
                                ", "
                            )}, and no other locale has one — so whether this realm is branded is unknown.`
                        );
                    }

                    return;
                }

                /* Every request this run needs, resolved before anything is
                   committed. `active` is then checked once, immediately before
                   the setters — checking it before an await would let a
                   response for a realm the admin has already navigated away
                   from write itself into the page. */
                const providers = await readLoginIdentityProviders(adminClient, realm);

                /* More than one distinct published theme: the admin has to say
                   which survives, so the editor is not opened at all. */
                if (selection.kind === "conflict") {
                    if (active) {
                        setVariantChoice(selection.variants);
                        setUnreadableLocales(selection.unreadable);
                        setIdentityProviders(providers);
                    }

                    return;
                }

                const config = parseThemeBrandingConfig(
                    themeDefinition,
                    selection.kind === "canonical" ? selection.variant.value : undefined
                );

                if (active) {
                    setVariantChoice(undefined);
                    setDraft(config);
                    setPublished(config);
                    setPreviewMode(config.colorScheme === "dark" ? "dark" : "light");
                    setStaleLocales(
                        selection.kind === "canonical" ? selection.stale : []
                    );
                    setUnreadableLocales(
                        selection.kind === "canonical" ? selection.unreadable : []
                    );
                    setCanonicalLocales(
                        selection.kind === "canonical" ? selection.variant.locales : []
                    );
                    setIdentityProviders(providers);
                }
            } catch (error) {
                if (active) {
                    setLoadError(
                        error instanceof Error ? error.message : "Unknown error"
                    );
                    addError("Unable to load theme customization", error);
                }
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [
        addError,
        adminClient,
        realm,
        locale,
        themeDefinition,
        realmRepresentation?.supportedLocales,
        reloadCount
    ]);

    const update = <Key extends keyof BrandingConfig>(
        key: Key,
        value: BrandingConfig[Key]
    ) => {
        setDraft(current => ({ ...current, [key]: value }));
    };

    const updateImage = (
        key: "logo" | "consoleLogo" | "backgroundImage",
        mode: "light" | "dark",
        value: string
    ) => {
        setDraft(current => ({
            ...current,
            [key]: { ...current[key], [mode]: value }
        }));
    };

    /**
     * Editing the primary carries the rest of the palette with it; editing any
     * other colour is a deliberate override and touches only that field.
     *
     * `applyBrandPrimary` decides what follows, and it reads the draft *before*
     * the new colour lands — so a hand-picked card background survives, and the
     * other appearance's palette comes along only while it is still tracking
     * this one.
     */
    const updatePalette = (key: PaletteKey, value: string) => {
        setDraft(current =>
            key === "primary"
                ? applyBrandPrimary(
                      current,
                      value,
                      previewMode,
                      undefined,
                      themeDefinition.defaultBranding
                  )
                : {
                      ...current,
                      [previewMode]: { ...current[previewMode], [key]: value }
                  }
        );
    };

    /** Hands a field back to the primary, undoing a manual override. */
    const relinkPaletteField = (key: DerivedPaletteKey) => {
        setDraft(current => {
            const palette = current[previewMode];

            if (!isHexColor(palette.primary)) return current;

            return {
                ...current,
                [previewMode]: {
                    ...palette,
                    [key]: derivePalette(palette.primary, previewMode)[key]
                }
            };
        });
    };

    /**
     * Which colours are still following the primary. Recomputed from the draft
     * rather than tracked in state: linkage has to survive a page load, a theme
     * import and a "restore defaults", none of which go through the editor's
     * change handlers.
     */
    const linkedKeys = useMemo(
        () =>
            new Set<string>(
                getLinkedKeys(
                    draft[previewMode],
                    previewMode,
                    undefined,
                    themeDefinition.defaultBranding[previewMode]
                )
            ),
        [draft, previewMode, themeDefinition]
    );

    /**
     * Exports the draft rather than the published theme, so an admin can hand
     * off work in progress. The file is what makes a theme survive a clean
     * deployment: published themes live in the realm database, which a fresh
     * instance does not have.
     */
    const exportTheme = async () => {
        const exportedAt = new Date().toISOString();
        const saved = await saveThemeFile(
            themeExportFileName(realm, exportedAt),
            serializeThemeExport(draft, themeDefinition, {
                name: `${draft.companyName} — ${realm}`,
                description: `Exported from the ${realm} realm.`,
                exportedAt
            })
        );

        if (saved) {
            addAlert("Theme exported — commit it to custom_themes/ to ship it");
        }
    };

    const importTheme = (config: BrandingConfig, presetName: string) => {
        setDraft(config);
        setPreviewMode(config.colorScheme === "dark" ? "dark" : "light");
        addAlert(`Loaded “${presetName}” into the editor — publish to apply it`);
    };

    /**
     * Write the draft to every locale.
     *
     * One request per locale, in sequence, and the failures are collected
     * rather than thrown. `Promise.all` rejects on the first failure while the
     * rest keep going, so a partial write reported a flat error and left the
     * realm with branding that differed by language — with nothing on this page
     * saying which locales had taken it.
     *
     * There is no multi-locale write to make this atomic, so the recovery is a
     * retry: the same publish is idempotent, and the editor stays dirty and
     * names the locales still behind until one succeeds everywhere.
     */
    const publish = async () => {
        setSaving(true);
        try {
            const value = serializeBrandingConfig(draft, themeDefinition.defaultBranding);
            const locales = publishLocales(locale, realmRepresentation?.supportedLocales);
            const failed: string[] = [];
            let firstError: unknown;

            for (const selectedLocale of locales) {
                try {
                    await adminClient.realms.addLocalization(
                        {
                            realm,
                            selectedLocale,
                            key: themeDefinition.brandingMessageKey
                        },
                        value
                    );
                } catch (error) {
                    failed.push(selectedLocale);
                    firstError ??= error;
                }
            }

            if (failed.length !== 0) {
                /* `published` is deliberately left alone: the draft is still
                   unpublished somewhere, so the editor stays dirty and Publish
                   stays enabled for the retry. */
                setStaleLocales(failed);
                addError(
                    `Published to ${locales.length - failed.length} of ${
                        locales.length
                    } locales — ${failed.join(", ")} failed and still show the previous theme. Publish again to retry.`,
                    firstError
                );

                return;
            }

            const normalized = parseThemeBrandingConfig(themeDefinition, value);
            setDraft(normalized);
            setPublished(normalized);
            setStaleLocales([]);
            addAlert(
                locales.length === 1
                    ? "Theme customization published"
                    : `Theme customization published to ${locales.length} locales`
            );
        } catch (error) {
            addError("Unable to publish theme customization", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <PageSection className="branding-loading">
                <Spinner aria-label="Loading theme customization" />
            </PageSection>
        );
    }

    /* Like the load error below: shown instead of the editor, because every
       route out of here discards one of the published themes and that is not a
       choice to make on the admin's behalf. */
    if (variantChoice !== undefined) {
        return (
            <PageSection variant="light">
                <Alert variant="destructive">
                    <AlertCircleIcon aria-hidden />
                    <AlertTitle>This realm has more than one published theme</AlertTitle>
                    <AlertDescription>
                        <p>
                            The theme is stored once per locale, and these locales
                            disagree — so visitors currently see different branding
                            depending on their language. Choose the one to keep;
                            publishing then writes it to every locale.
                        </p>
                        {unreadableLocales.length !== 0 && (
                            <p>
                                {unreadableLocales.join(", ")} could not be read, so{" "}
                                {unreadableLocales.length === 1
                                    ? "it is not shown below and may hold a third theme"
                                    : "they are not shown below and may hold further themes"}
                                . Whichever option you keep will be published over{" "}
                                {unreadableLocales.length === 1 ? "it" : "them"} as
                                well.
                            </p>
                        )}
                        <div className="branding-variant-choice">
                            {variantChoice.map(variant => {
                                const config = parseThemeBrandingConfig(
                                    themeDefinition,
                                    variant.value
                                );

                                return (
                                    <div
                                        className="branding-variant-choice__option"
                                        key={variant.locales.join(",")}
                                    >
                                        <BrandingPreview
                                            branding={config}
                                            identityProviders={identityProviders}
                                            mode={
                                                config.colorScheme === "dark"
                                                    ? "dark"
                                                    : "light"
                                            }
                                            themeName={themeDefinition.name}
                                        />
                                        <Button
                                            onClick={() => {
                                                setDraft(config);
                                                setPublished(config);
                                                setPreviewMode(
                                                    config.colorScheme === "dark"
                                                        ? "dark"
                                                        : "light"
                                                );
                                                setStaleLocales(
                                                    publishLocales(
                                                        locale,
                                                        realmRepresentation?.supportedLocales
                                                    ).filter(
                                                        candidate =>
                                                            !variant.locales.includes(
                                                                candidate
                                                            )
                                                    )
                                                );
                                                /* The editor's drift warning
                                                   names these, so resolving a
                                                   conflict has to set them or
                                                   the warning loses its
                                                   subject. `unreadableLocales`
                                                   is deliberately left as it
                                                   is: those locales are still
                                                   unread and still about to be
                                                   overwritten. */
                                                setCanonicalLocales(variant.locales);
                                                setVariantChoice(undefined);
                                            }}
                                            variant="outline"
                                        >
                                            Keep the {variant.locales.join(", ")} theme
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </AlertDescription>
                </Alert>
            </PageSection>
        );
    }

    /* Deliberately instead of the editor, not alongside it. Seeding the inputs
       from the theme defaults would be indistinguishable from an unbranded
       realm, and publishing them would overwrite a configuration that is only
       unreadable right now. */
    if (loadError !== undefined) {
        return (
            <PageSection variant="light">
                <Alert variant="destructive">
                    <AlertCircleIcon aria-hidden />
                    <AlertTitle>Could not load this realm's theme</AlertTitle>
                    <AlertDescription>
                        <p>{loadError}</p>
                        <p>
                            The editor stays closed until the published theme can be
                            read, so that nothing overwrites it by accident.
                        </p>
                        <Button
                            onClick={() => setReloadCount(count => count + 1)}
                            variant="outline"
                        >
                            Try again
                        </Button>
                    </AlertDescription>
                </Alert>
            </PageSection>
        );
    }

    return (
        <>
            <PageSection variant="light" className="branding-page-header">
                <div>
                    <h1>Theme customization</h1>
                    <p>
                        Configure the <strong>{themeDefinition.displayName}</strong> login
                        experience for the <strong>{realm}</strong> realm.
                    </p>
                </div>
                <div className="branding-page-actions">
                    <Button
                        disabled={!isDirty || saving}
                        onClick={() => setDraft(published)}
                        variant="outline"
                    >
                        Discard changes
                    </Button>
                    <Button
                        disabled={!canPublish || saving}
                        loading={saving}
                        onClick={publish}
                    >
                        {isDirty || staleLocales.length === 0
                            ? "Publish theme"
                            : "Publish to all locales"}
                    </Button>
                    <DropdownMenu>
                        {/* Same override as `ProfileMenu`: the registry's trigger
                            renders the Nebari `Button`, which takes `ref` as a
                            plain prop (React 19), and this app is on React 18 —
                            so Base UI's anchor ref came back null and the menu
                            never positioned itself. A DOM element gives it a real
                            node; `buttonVariants` keeps the styling the replaced
                            `Button` would have applied. `variant` is passed too so
                            `dropdownMenuTriggerVariants` does not add the default
                            variant's background while the menu is open. */}
                        <DropdownMenuTrigger
                            aria-label="Theme options"
                            className={cn(
                                buttonVariants({ size: "icon", variant: "outline" })
                            )}
                            render={<button type="button" />}
                            variant="outline"
                        >
                            <EllipsisVerticalIcon aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuContent align="end" className="w-65">
                                <DropdownMenuItem onClick={() => void exportTheme()}>
                                    <DownloadIcon aria-hidden />
                                    Export theme as JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                                    <UploadIcon aria-hidden />
                                    Import theme…
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenuPortal>
                    </DropdownMenu>
                </div>
            </PageSection>

            <PageSection className="branding-page-content">
                {staleLocales.length !== 0 && (
                    <Alert variant="destructive">
                        <AlertCircleIcon aria-hidden />
                        <AlertTitle>Branding differs between locales</AlertTitle>
                        <AlertDescription>
                            <p>
                                {/* Names the locales the editor's theme actually
                                    came from, rather than assuming the realm's
                                    default locale is among them — it need not be,
                                    which is what made an earlier version of this
                                    message say "de does not have the theme that
                                    de has". */}
                                The theme in this editor is the one published for{" "}
                                {canonicalLocales.join(", ") || "this realm"}.{" "}
                                {staleLocales.join(", ")}{" "}
                                {staleLocales.length === 1 ? "does" : "do"} not have
                                it, so a visitor in{" "}
                                {staleLocales.length === 1
                                    ? "that language"
                                    : "those languages"}{" "}
                                sees something different. This happens when a locale
                                is added to the realm after the last publish, or when
                                a publish only partly succeeded. Publishing again
                                writes every locale.
                            </p>
                            {unreadableLocales.length !== 0 && (
                                <p>
                                    {unreadableLocales.join(", ")} could not be read
                                    at all rather than being empty, so{" "}
                                    {unreadableLocales.length === 1 ? "it" : "they"}{" "}
                                    may hold a different theme. Publishing replaces
                                    whatever is there.
                                </p>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <Alert>
                    <InfoIcon aria-hidden />
                    <AlertTitle>Experimental image storage</AlertTitle>
                    <AlertDescription>
                        Uploaded images are compressed and stored with the realm
                        configuration for this experiment. Replace this with object
                        storage before using the feature in production.
                    </AlertDescription>
                </Alert>

                {imageError !== "" && (
                    <Alert variant="destructive">
                        <AlertCircleIcon aria-hidden />
                        <AlertDescription>{imageError}</AlertDescription>
                        <Button onClick={() => setImageError("")} size="sm" variant="ghost">
                            Dismiss
                        </Button>
                    </Alert>
                )}

                <div className="branding-layout">
                    <div className="branding-editor-stack">
                        <Card>
                            <CardHeader>
                                <CardTitle>Brand identity</CardTitle>
                                <CardDescription>
                                    The name and imagery shown on the login card.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="branding-form">
                                <Field>
                                    <FieldLabel htmlFor="branding-company-name">
                                        Company name
                                    </FieldLabel>
                                    <Input
                                        id="branding-company-name"
                                        maxLength={80}
                                        onChange={event =>
                                            update("companyName", event.target.value)
                                        }
                                        value={draft.companyName}
                                    />
                                </Field>
                                <div className="branding-image-set">
                                    <div className="branding-image-set__header">
                                        <h3>Login card logos</h3>
                                        <p>
                                            One per appearance, so a wordmark stays
                                            visible on either card.
                                        </p>
                                    </div>
                                    <ImageControl
                                        id="branding-logo-light"
                                        kind="logo"
                                        label="Light appearance logo"
                                        help="Needs enough dark contrast to read on a light card."
                                        onChange={value =>
                                            updateImage("logo", "light", value)
                                        }
                                        onError={setImageError}
                                        value={draft.logo.light}
                                    />
                                    <ImageControl
                                        id="branding-logo-dark"
                                        kind="logo"
                                        label="Dark appearance logo"
                                        help="Leave empty to reuse the light logo."
                                        onChange={value =>
                                            updateImage("logo", "dark", value)
                                        }
                                        onError={setImageError}
                                        value={draft.logo.dark}
                                    />
                                </div>

                                <div className="branding-image-set">
                                    <div className="branding-image-set__header">
                                        <h3>Console header logos</h3>
                                        <p>
                                            Shown in the Admin and Account console
                                            mastheads — a shorter, wider slot than the
                                            login card.
                                        </p>
                                    </div>
                                    <div className="branding-reuse-toggle">
                                        <Checkbox
                                            checked={draft.useLoginLogoInConsole}
                                            id="branding-reuse-login-logo"
                                            onCheckedChange={checked =>
                                                update(
                                                    "useLoginLogoInConsole",
                                                    checked === true
                                                )
                                            }
                                        >
                                            Use the login card logos
                                        </Checkbox>
                                    </div>
                                    <ImageControl
                                        disabled={draft.useLoginLogoInConsole}
                                        id="branding-console-logo-light"
                                        kind="logo"
                                        label="Light console logo"
                                        help="Short and wide reads best here."
                                        onChange={value =>
                                            updateImage("consoleLogo", "light", value)
                                        }
                                        onError={setImageError}
                                        value={draft.consoleLogo.light}
                                    />
                                    <ImageControl
                                        disabled={draft.useLoginLogoInConsole}
                                        id="branding-console-logo-dark"
                                        kind="logo"
                                        label="Dark console logo"
                                        help="Leave empty to reuse the light console logo."
                                        onChange={value =>
                                            updateImage("consoleLogo", "dark", value)
                                        }
                                        onError={setImageError}
                                        value={draft.consoleLogo.dark}
                                    />
                                </div>

                                <div className="branding-image-set">
                                    <div className="branding-image-set__header">
                                        <h3>Background images</h3>
                                        <p>
                                            Optional full-page artwork can also change
                                            with the visitor's appearance.
                                        </p>
                                    </div>
                                    <ImageControl
                                        id="branding-background-light"
                                        kind="background"
                                        label="Light appearance background"
                                        help="Shown behind the login card in light mode."
                                        onChange={value =>
                                            updateImage("backgroundImage", "light", value)
                                        }
                                        onError={setImageError}
                                        value={draft.backgroundImage.light}
                                    />
                                    <ImageControl
                                        id="branding-background-dark"
                                        kind="background"
                                        label="Dark appearance background"
                                        help="Shown in dark mode. Leave empty to reuse the light appearance background."
                                        onChange={value =>
                                            updateImage("backgroundImage", "dark", value)
                                        }
                                        onError={setImageError}
                                        value={draft.backgroundImage.dark}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Color palette</CardTitle>
                                <CardDescription>
                                    The primary action color drives the rest: colors
                                    marked <em>Auto</em> follow it, in both appearances.
                                    Edit one to pin it, and the button label switches
                                    between black and white on its own.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div
                                    aria-label="Palette mode"
                                    className="branding-mode-switch"
                                    role="group"
                                >
                                    {(["light", "dark"] as const).map(mode => (
                                        <Button
                                            key={mode}
                                            onClick={() => setPreviewMode(mode)}
                                            variant={
                                                previewMode === mode ? "default" : "outline"
                                            }
                                        >
                                            {mode === "light" ? "Light" : "Dark"} palette
                                        </Button>
                                    ))}
                                </div>
                                <div className="branding-color-grid">
                                    {PALETTE_FIELDS.map(field => (
                                        <Field key={field.key}>
                                            <div className="branding-color-label">
                                                <FieldLabel
                                                    htmlFor={`branding-color-${field.key}`}
                                                >
                                                    {field.label}
                                                </FieldLabel>
                                                {field.key !== "primary" &&
                                                    (linkedKeys.has(field.key) ? (
                                                        <Badge variant="secondary">
                                                            Auto
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            className="branding-relink"
                                                            onClick={() =>
                                                                relinkPaletteField(
                                                                    field.key as DerivedPaletteKey
                                                                )
                                                            }
                                                            size="sm"
                                                            title="Follow the primary action color again"
                                                            variant="ghost"
                                                        >
                                                            <RotateCcwIcon />
                                                            Reset to auto
                                                        </Button>
                                                    ))}
                                            </div>
                                            <div className="branding-color-field">
                                                <input
                                                    aria-label={`${field.label} color picker`}
                                                    onChange={event =>
                                                        updatePalette(
                                                            field.key,
                                                            event.target.value
                                                        )
                                                    }
                                                    type="color"
                                                    value={draft[previewMode][field.key]}
                                                />
                                                <HexColorInput
                                                    id={`branding-color-${field.key}`}
                                                    label={`${field.label} hex value`}
                                                    onCommit={next =>
                                                        updatePalette(field.key, next)
                                                    }
                                                    value={draft[previewMode][field.key]}
                                                />
                                            </div>
                                        </Field>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Layout</CardTitle>
                                <CardDescription>
                                    How the login card is shaped and which sign-in methods
                                    it offers.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="branding-form">
                                <Field>
                                    {/* No `htmlFor`: Slider's root is a `div`, which
                                        cannot be labelled. Base UI's `Field` wires the
                                        label to the real range input through context,
                                        so leaving it off is what gives the control an
                                        accessible name. */}
                                    <FieldLabel>
                                        Card corner radius ({draft.cardRadius}px)
                                    </FieldLabel>
                                    <Slider
                                        max={32}
                                        min={0}
                                        onValueChange={value =>
                                            update(
                                                "cardRadius",
                                                Array.isArray(value) ? value[0] : value
                                            )
                                        }
                                        value={draft.cardRadius}
                                    />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="branding-color-scheme">
                                        Default appearance
                                    </FieldLabel>
                                    <Select
                                        onValueChange={value =>
                                            update(
                                                "colorScheme",
                                                value as BrandingConfig["colorScheme"]
                                            )
                                        }
                                        value={draft.colorScheme}
                                    >
                                        <SelectTrigger
                                            aria-label="Default login page appearance"
                                            id="branding-color-scheme"
                                        >
                                            {/* Base UI renders the raw value unless
                                                given a formatter. */}
                                            <SelectValue>
                                                {(value: BrandingConfig["colorScheme"]) =>
                                                    COLOR_SCHEME_LABELS[value]
                                                }
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(
                                                Object.keys(
                                                    COLOR_SCHEME_LABELS
                                                ) as BrandingConfig["colorScheme"][]
                                            ).map(scheme => (
                                                <SelectItem key={scheme} value={scheme}>
                                                    {COLOR_SCHEME_LABELS[scheme]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="branding-login-mode">
                                        Login method
                                    </FieldLabel>
                                    <Select
                                        onValueChange={value =>
                                            update(
                                                "loginMode",
                                                value as BrandingConfig["loginMode"]
                                            )
                                        }
                                        value={draft.loginMode}
                                    >
                                        <SelectTrigger
                                            aria-label="Login method presentation"
                                            id="branding-login-mode"
                                        >
                                            <SelectValue>
                                                {(value: BrandingConfig["loginMode"]) =>
                                                    LOGIN_MODE_LABELS[value]
                                                }
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(
                                                Object.keys(
                                                    LOGIN_MODE_LABELS
                                                ) as BrandingConfig["loginMode"][]
                                            ).map(mode => (
                                                <SelectItem key={mode} value={mode}>
                                                    {LOGIN_MODE_LABELS[mode]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                        The password form remains available as a safe
                                        fallback when no identity providers are configured.
                                    </FieldDescription>
                                </Field>

                                <Button
                                    className="self-start"
                                    onClick={() =>
                                        setDraft(cloneThemeDefaults(themeDefinition))
                                    }
                                    variant="link"
                                >
                                    Restore {themeDefinition.displayName} defaults
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="branding-preview-panel">
                        <div className="branding-preview-panel__header">
                            <div>
                                <h2>Live preview</h2>
                                <p>Unsaved changes appear here immediately.</p>
                            </div>
                            <span>{previewMode === "light" ? "Light" : "Dark"}</span>
                        </div>
                        <BrandingPreview
                            branding={draft}
                            identityProviders={identityProviders}
                            mode={previewMode}
                            themeName={themeDefinition.name}
                        />
                    </div>
                </div>
            </PageSection>

            <ImportThemeDialog
                identityProviders={identityProviders}
                onImport={importTheme}
                onOpenChange={setImportOpen}
                open={importOpen}
                theme={themeDefinition}
            />
        </>
    );
}
