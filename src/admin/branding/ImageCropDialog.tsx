import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type PointerEvent
} from "react";
import { AlertCircleIcon, CropIcon, MoveIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
    calculateSourceCrop,
    prepareBrandingImage,
    type ImageCrop,
    type ImageDimensions,
    type ImageKind
} from "../../branding/imageUpload";

type AspectChoice = "original" | "square" | "wordmark" | "landscape" | "standard";

const ASPECT_LABELS: Record<AspectChoice, string> = {
    original: "Original image",
    square: "Square (1:1)",
    wordmark: "Wordmark (8:3)",
    landscape: "Widescreen (16:9)",
    standard: "Standard (4:3)"
};

const ASPECT_VALUES: Record<Exclude<AspectChoice, "original">, number> = {
    square: 1,
    wordmark: 8 / 3,
    landscape: 16 / 9,
    standard: 4 / 3
};

type ImageCropDialogProps = {
    file: File | undefined;
    imageSize: ImageDimensions | undefined;
    kind: ImageKind;
    label: string;
    onCancel: () => void;
    onComplete: (value: string) => void;
};

type Size = ImageDimensions;
type Position = { x: number; y: number };

/**
 * Accessible crop and resize step for uploaded branding artwork.
 *
 * The crop frame is keyboard movable and pointer draggable. Zoom uses the
 * design-system Slider, whose nested range input supplies Arrow/Home/End
 * behavior. The result is handed to the existing canvas optimizer in source
 * pixels, so viewport size and device pixel ratio do not change the export.
 */
export function ImageCropDialog({
    file,
    imageSize = { width: 0, height: 0 },
    kind,
    label,
    onCancel,
    onComplete
}: ImageCropDialogProps) {
    const dragStart = useRef<{ pointerX: number; pointerY: number; position: Position }>();
    // DialogContent is portalled and may mount after `open` changes. A callback
    // ref makes viewport measurement react to the actual DOM node appearing.
    const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null);
    const [sourceUrl, setSourceUrl] = useState("");
    const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
    const [aspectChoice, setAspectChoice] = useState<AspectChoice>("original");
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!file) {
            setSourceUrl("");
            return;
        }

        const url = URL.createObjectURL(file);

        setSourceUrl(url);
        setAspectChoice("original");
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setError("");

        return () => URL.revokeObjectURL(url);
    }, [file]);

    useLayoutEffect(() => {
        if (!viewportElement) return;

        const updateSize = () => {
            const bounds = viewportElement.getBoundingClientRect();
            setViewportSize({ width: bounds.width, height: bounds.height });
        };
        const observer = new ResizeObserver(updateSize);

        observer.observe(viewportElement);
        updateSize();

        return () => observer.disconnect();
    }, [viewportElement, aspectChoice]);

    const originalAspect =
        imageSize.width > 0 && imageSize.height > 0
            ? imageSize.width / imageSize.height
            : kind === "logo"
              ? ASPECT_VALUES.wordmark
              : ASPECT_VALUES.landscape;
    const aspect =
        aspectChoice === "original" ? originalAspect : ASPECT_VALUES[aspectChoice];
    const aspectOptions: AspectChoice[] =
        kind === "logo"
            ? ["original", "wordmark", "square", "landscape"]
            : ["original", "landscape", "standard", "square"];

    const geometry = useMemo(() => {
        if (
            imageSize.width === 0 ||
            imageSize.height === 0 ||
            viewportSize.width === 0 ||
            viewportSize.height === 0
        ) {
            return undefined;
        }

        const baseScale = Math.max(
            viewportSize.width / imageSize.width,
            viewportSize.height / imageSize.height
        );
        const scale = baseScale * zoom;
        const renderedWidth = imageSize.width * scale;
        const renderedHeight = imageSize.height * scale;

        return {
            scale,
            renderedWidth,
            renderedHeight,
            maxX: Math.max(0, (renderedWidth - viewportSize.width) / 2),
            maxY: Math.max(0, (renderedHeight - viewportSize.height) / 2)
        };
    }, [imageSize, viewportSize, zoom]);

    const clampPosition = (next: Position): Position => ({
        x: Math.max(-(geometry?.maxX ?? 0), Math.min(geometry?.maxX ?? 0, next.x)),
        y: Math.max(-(geometry?.maxY ?? 0), Math.min(geometry?.maxY ?? 0, next.y))
    });

    useEffect(() => {
        setPosition(current => clampPosition(current));
        // Geometry's bounds are the only values that affect clamping.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geometry?.maxX, geometry?.maxY]);

    const selectedCrop = (): ImageCrop | undefined => {
        if (!geometry) return undefined;

        return calculateSourceCrop({
            imageWidth: imageSize.width,
            imageHeight: imageSize.height,
            viewportWidth: viewportSize.width,
            viewportHeight: viewportSize.height,
            renderedWidth: geometry.renderedWidth,
            renderedHeight: geometry.renderedHeight,
            scale: geometry.scale,
            offsetX: position.x,
            offsetY: position.y
        });
    };

    const applyCrop = async () => {
        if (!file || !geometry) return;

        setProcessing(true);
        setError("");
        try {
            onComplete(await prepareBrandingImage(file, kind, selectedCrop()));
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "The image could not be processed."
            );
        } finally {
            setProcessing(false);
        }
    };

    const move = (x: number, y: number) => {
        setPosition(current => clampPosition({ x: current.x + x, y: current.y + y }));
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const amount = event.shiftKey ? 16 : 4;
        const movement: Partial<Record<string, Position>> = {
            ArrowLeft: { x: -amount, y: 0 },
            ArrowRight: { x: amount, y: 0 },
            ArrowUp: { x: 0, y: -amount },
            ArrowDown: { x: 0, y: amount }
        };
        const next = movement[event.key];

        if (!next) return;
        event.preventDefault();
        move(next.x, next.y);
    };

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus();
        dragStart.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            position
        };
        setDragging(true);
    };

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!dragStart.current) return;

        setPosition(
            clampPosition({
                x: dragStart.current.position.x + event.clientX - dragStart.current.pointerX,
                y: dragStart.current.position.y + event.clientY - dragStart.current.pointerY
            })
        );
    };

    const stopDragging = () => {
        dragStart.current = undefined;
        setDragging(false);
    };

    const reset = () => {
        setAspectChoice("original");
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    const crop = selectedCrop();
    const cropDescription = crop
        ? `${Math.round(crop.width)} by ${Math.round(crop.height)} source pixels selected`
        : "Loading image dimensions";

    return (
        <Dialog
            open={file !== undefined}
            onOpenChange={open => {
                if (!open && !processing) onCancel();
            }}
        >
            <DialogContent className="branding-crop-dialog">
                <DialogHeader>
                    <DialogTitle>Crop and resize {label.toLowerCase()}</DialogTitle>
                    <DialogDescription>
                        Pick a frame, zoom, then drag the image into position. The upload
                        is resized and optimized only after you apply the crop.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircleIcon aria-hidden />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="branding-crop-editor">
                    <div
                        aria-describedby="branding-crop-instructions branding-crop-size"
                        aria-label="Image crop position"
                        className="branding-crop-viewport"
                        data-dragging={dragging || undefined}
                        onKeyDown={handleKeyDown}
                        onPointerCancel={stopDragging}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={stopDragging}
                        ref={setViewportElement}
                        role="group"
                        style={
                            {
                                aspectRatio: aspect,
                                "--branding-crop-width": `${20 * aspect}rem`
                            } as CSSProperties
                        }
                        tabIndex={0}
                    >
                        {sourceUrl && (
                            <img
                                alt=""
                                aria-hidden="true"
                                draggable={false}
                                onError={() => setError("The selected image could not be read.")}
                                src={sourceUrl}
                                style={
                                    geometry
                                        ? {
                                              width: geometry.renderedWidth,
                                              height: geometry.renderedHeight,
                                              left: `calc(50% + ${position.x}px)`,
                                              top: `calc(50% + ${position.y}px)`
                                          }
                                        : { visibility: "hidden" }
                                }
                            />
                        )}
                        <div className="branding-crop-grid" aria-hidden="true" />
                        <div className="branding-crop-move-hint" aria-hidden="true">
                            <MoveIcon /> Drag to reposition
                        </div>
                    </div>

                    <p id="branding-crop-instructions" className="branding-crop-instructions">
                        The crop frame is keyboard accessible. Use the arrow keys to move
                        the image; hold Shift for larger steps.
                    </p>
                    <p id="branding-crop-size" className="sr-only" aria-live="polite">
                        {cropDescription}
                    </p>

                    <div className="branding-crop-controls">
                        <Field>
                            <FieldLabel htmlFor="branding-crop-aspect">Crop frame</FieldLabel>
                            <Select
                                onValueChange={value => {
                                    setAspectChoice(value as AspectChoice);
                                    setZoom(1);
                                    setPosition({ x: 0, y: 0 });
                                }}
                                value={aspectChoice}
                            >
                                <SelectTrigger
                                    aria-label="Crop frame aspect ratio"
                                    id="branding-crop-aspect"
                                >
                                    <SelectValue>
                                        {(value: AspectChoice) => ASPECT_LABELS[value]}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {aspectOptions.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {ASPECT_LABELS[option]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field>
                            <FieldLabel>Zoom ({Math.round(zoom * 100)}%)</FieldLabel>
                            <Slider
                                getThumbAriaLabel={() => "Image zoom"}
                                getThumbAriaValueText={value => `${value}%`}
                                max={300}
                                min={100}
                                onValueChange={value =>
                                    setZoom(
                                        (Array.isArray(value) ? value[0] : value) / 100
                                    )
                                }
                                step={5}
                                value={Math.round(zoom * 100)}
                            />
                            <FieldDescription>{cropDescription}</FieldDescription>
                        </Field>
                    </div>
                </div>

                <DialogFooter>
                    <Button disabled={processing} onClick={onCancel} variant="outline">
                        Cancel
                    </Button>
                    <Button disabled={processing || !geometry} onClick={reset} variant="ghost">
                        <CropIcon aria-hidden /> Use full image
                    </Button>
                    <Button
                        disabled={!geometry}
                        loading={processing}
                        loadingText="Optimizing…"
                        onClick={() => void applyCrop()}
                    >
                        Apply crop
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
