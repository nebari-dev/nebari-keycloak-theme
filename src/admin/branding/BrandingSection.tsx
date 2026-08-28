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
import { isHexColor } from "../../branding/color";
import {
    getBrandingImageDimensions,
    type ImageDimensions
} from "../../branding/imageUpload";
import {
    CUSTOM_THEME_NAMES,
    DEFAULT_THEME_NAME,
    cloneThemeDefaults,
    getThemeDefinition,
    parseThemeBrandingConfig,
    type CustomThemeName
} from "../../themes/themeCatalog";
import { serializeThemeExport, themeExportFileName } from "../../themes/themePresets";
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

    return (
        <Input
            aria-label={label}
            id={id}
            onBlur={() => setText(null)}
            onChange={event => {
                const next = event.target.value;

                setText(next);

                if (isHexColor(next)) onCommit(next);
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

function getConfiguredThemeName(
    loginTheme: string | undefined,
    adminTheme: string | undefined
): CustomThemeName {
    for (const candidate of [loginTheme, adminTheme]) {
        const normalized = candidate?.replace(/_retrocompat$/, "");
        const themeName = CUSTOM_THEME_NAMES.find(name => name === normalized);

        if (themeName) return themeName;
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
    onError
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
                        disabled={isEmbedded}
                        id={id}
                        onChange={event => onChange(event.target.value)}
                        placeholder="https://assets.example.com/image.png"
                        value={isEmbedded ? "Uploaded image stored in this realm" : value}
                    />
                    {/* A label wrapping a hidden file input, rather than a Button
                        with a click handler: it keeps the native picker's keyboard
                        and screen-reader behaviour without a ref. */}
                    <Button
                        render={<label htmlFor={`${id}-file`} />}
                        variant="outline"
                    >
                        <UploadIcon aria-hidden />
                        Upload
                    </Button>
                    <input
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        id={`${id}-file`}
                        onChange={handleFile}
                        type="file"
                    />
                    {value !== "" && (
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

    const isDirty = useMemo(
        () => JSON.stringify(draft) !== JSON.stringify(published),
        [draft, published]
    );

    useEffect(() => {
        let active = true;

        void (async () => {
            setLoading(true);
            try {
                const messages = await adminClient.realms.getRealmLocalizationTexts({
                    realm,
                    selectedLocale: locale
                });
                const config = parseThemeBrandingConfig(
                    themeDefinition,
                    messages[themeDefinition.brandingMessageKey]
                );
                if (active) {
                    setDraft(config);
                    setPublished(config);
                    setPreviewMode(config.colorScheme === "dark" ? "dark" : "light");
                }
            } catch (error) {
                if (active) addError("Unable to load theme customization", error);
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [addError, adminClient, realm, locale, themeDefinition]);

    const update = <Key extends keyof BrandingConfig>(
        key: Key,
        value: BrandingConfig[Key]
    ) => {
        setDraft(current => ({ ...current, [key]: value }));
    };

    const updateImage = (
        key: "logo" | "backgroundImage",
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

    const publish = async () => {
        setSaving(true);
        try {
            const value = serializeBrandingConfig(draft, themeDefinition.defaultBranding);
            const locales = new Set([
                "en",
                locale,
                ...(realmRepresentation?.supportedLocales ?? [])
            ]);

            await Promise.all(
                [...locales].map(selectedLocale =>
                    adminClient.realms.addLocalization(
                        {
                            realm,
                            selectedLocale,
                            key: themeDefinition.brandingMessageKey
                        },
                        value
                    )
                )
            );

            const normalized = parseThemeBrandingConfig(themeDefinition, value);
            setDraft(normalized);
            setPublished(normalized);
            addAlert("Theme customization published");
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
                    <Button disabled={!isDirty || saving} loading={saving} onClick={publish}>
                        Publish theme
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
                                        <h3>Logos</h3>
                                        <p>
                                            Provide artwork for each card appearance so
                                            light and dark wordmarks remain visible.
                                        </p>
                                    </div>
                                    <ImageControl
                                        id="branding-logo-light"
                                        kind="logo"
                                        label="Light appearance logo"
                                        help="Shown on light cards. Use artwork with enough dark contrast."
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
                                        help="Shown on dark cards. Leave empty to reuse the light appearance logo."
                                        onChange={value =>
                                            updateImage("logo", "dark", value)
                                        }
                                        onError={setImageError}
                                        value={draft.logo.dark}
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
                            mode={previewMode}
                            themeName={themeDefinition.name}
                        />
                    </div>
                </div>
            </PageSection>

            <ImportThemeDialog
                onImport={importTheme}
                onOpenChange={setImportOpen}
                open={importOpen}
                theme={themeDefinition}
            />
        </>
    );
}
