import { AlertCircleIcon, FileJsonIcon, UploadIcon } from "lucide-react";
import {
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type KeyboardEvent
} from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPortal,
    DialogTitle
} from "@/components/ui/dialog";
import type { BrandingConfig } from "../../branding/brandingConfig";
import {
    getBundledPresets,
    parseThemeExport,
    type ThemePreset
} from "../../themes/themePresets";
import type { ThemeDefinition } from "../../themes/themeCatalog";
import { BrandingPreview } from "./BrandingPreview";

type ImportThemeDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    theme: ThemeDefinition;
    /** Hands the chosen config to the editor's draft. Does not publish. */
    onImport: (config: BrandingConfig, presetName: string) => void;
};

/**
 * Picks a theme to load into the editor, previewing it first.
 *
 * The preview is the same `BrandingPreview` the editor uses, so what an admin
 * sees here is what the login page will render — the point of previewing before
 * importing is that importing overwrites the whole draft, including colours the
 * admin cannot see in a list of names.
 *
 * Importing only replaces the draft. Publishing stays a separate, deliberate
 * step, so an import can still be discarded.
 */
export function ImportThemeDialog({
    open,
    onOpenChange,
    theme,
    onImport
}: ImportThemeDialogProps) {
    /* Both the list and its errors come out of one call, held in the same memo —
       reporting the errors through state would be a write during render. */
    const { presets: bundled, presetErrors } = useMemo(() => {
        const errors: string[] = [];
        const presets = getBundledPresets(theme, message => errors.push(message));

        return { presets, presetErrors: errors };
    }, [theme]);

    const [uploaded, setUploaded] = useState<ThemePreset | undefined>();
    const [selectedId, setSelectedId] = useState<string | undefined>(
        () => bundled[0]?.id
    );
    const [fileError, setFileError] = useState("");
    const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
    const fileInput = useRef<HTMLInputElement>(null);

    const choices = uploaded ? [uploaded, ...bundled] : bundled;
    const selected = choices.find(preset => preset.id === selectedId) ?? choices[0];

    const select = (preset: ThemePreset) => {
        setSelectedId(preset.id);
        /* Preview the appearance the theme itself defaults to, so a dark theme
           is not first judged against a light preview. */
        setPreviewMode(preset.config.colorScheme === "dark" ? "dark" : "light");
    };

    /**
     * Arrow-key navigation for the theme list. `role="radio"` promises it, and
     * buttons do not provide it the way native radios do.
     */
    const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const step =
            event.key === "ArrowDown" || event.key === "ArrowRight"
                ? 1
                : event.key === "ArrowUp" || event.key === "ArrowLeft"
                  ? -1
                  : 0;

        if (step === 0 || choices.length === 0) return;

        event.preventDefault();

        const nextIndex = (index + step + choices.length) % choices.length;
        const options = event.currentTarget.parentElement?.querySelectorAll<
            HTMLButtonElement
        >('[role="radio"]');

        select(choices[nextIndex]);
        /* The newly checked radio is the only tab stop, so focus follows it. */
        options?.[nextIndex]?.focus();
    };

    const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        /* Cleared immediately so picking the same file twice re-triggers change. */
        event.target.value = "";
        if (!file) return;

        setFileError("");
        try {
            const preset = parseThemeExport(await file.text(), theme);
            const named: ThemePreset = {
                ...preset,
                name: preset.name === "Imported theme" ? file.name : preset.name
            };
            setUploaded(named);
            select(named);
        } catch (error) {
            setFileError(
                error instanceof Error ? error.message : "That file could not be read."
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogContent className="branding-import-dialog">
                    <DialogHeader>
                        <DialogTitle>Import theme</DialogTitle>
                        <DialogDescription>
                            Choose a theme to load into the editor. Nothing is published
                            until you press Publish theme.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="branding-import">
                        <div className="branding-import__list">
                            <div
                                aria-label="Available themes"
                                className="branding-import__options"
                                role="radiogroup"
                            >
                                {choices.map((preset, index) => (
                                    <button
                                        aria-checked={preset.id === selected?.id}
                                        className="branding-import__option"
                                        key={preset.id}
                                        onClick={() => select(preset)}
                                        onKeyDown={event => moveSelection(event, index)}
                                        role="radio"
                                        /* Roving tabindex: a radiogroup is one tab
                                           stop, and arrows move within it. */
                                        tabIndex={preset.id === selected?.id ? 0 : -1}
                                        type="button"
                                    >
                                        <FileJsonIcon aria-hidden />
                                        <span>
                                            <strong>{preset.name}</strong>
                                            {preset.description !== "" && (
                                                <small>{preset.description}</small>
                                            )}
                                        </span>
                                    </button>
                                ))}

                                {choices.length === 0 && (
                                    <p className="branding-import__empty">
                                        No themes are bundled with this build. Choose a
                                        file to import one.
                                    </p>
                                )}
                            </div>

                            <Button
                                className="w-full"
                                onClick={() => fileInput.current?.click()}
                                variant="outline"
                            >
                                <UploadIcon aria-hidden />
                                Choose a JSON file…
                            </Button>
                            <input
                                accept="application/json,.json"
                                aria-label="Theme JSON file"
                                className="sr-only"
                                onChange={handleFile}
                                ref={fileInput}
                                type="file"
                            />

                            {[...presetErrors, fileError]
                                .filter(message => message !== "")
                                .map(message => (
                                    <Alert key={message} variant="destructive">
                                        <AlertCircleIcon aria-hidden />
                                        <AlertDescription>{message}</AlertDescription>
                                    </Alert>
                                ))}
                        </div>

                        <div className="branding-import__preview">
                            <div className="branding-import__preview-header">
                                <span>Preview</span>
                                <Button
                                    onClick={() =>
                                        setPreviewMode(mode =>
                                            mode === "light" ? "dark" : "light"
                                        )
                                    }
                                    size="sm"
                                    variant="outline"
                                >
                                    {previewMode === "light" ? "Light" : "Dark"}
                                </Button>
                            </div>
                            {selected ? (
                                <BrandingPreview
                                    branding={selected.config}
                                    mode={previewMode}
                                    themeName={theme.name}
                                />
                            ) : (
                                <p className="branding-import__empty">
                                    Select a theme to preview it.
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={() => onOpenChange(false)}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={selected === undefined}
                            onClick={() => {
                                if (!selected) return;
                                onImport(selected.config, selected.name);
                                onOpenChange(false);
                            }}
                        >
                            Import theme
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    );
}
