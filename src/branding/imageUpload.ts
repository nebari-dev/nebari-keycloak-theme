const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_STORED_BYTES = { logo: 160_000, background: 420_000 } as const;

export type ImageKind = "logo" | "background";

export type ImageDimensions = {
    width: number;
    height: number;
};

/** Source-pixel rectangle selected by the crop editor. */
export type ImageCrop = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type CropViewport = {
    imageWidth: number;
    imageHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    renderedWidth: number;
    renderedHeight: number;
    scale: number;
    offsetX: number;
    offsetY: number;
};

/** Convert the crop editor's rendered viewport into source-image pixels. */
export function calculateSourceCrop(viewport: CropViewport): ImageCrop {
    const imageLeft =
        (viewport.viewportWidth - viewport.renderedWidth) / 2 + viewport.offsetX;
    const imageTop =
        (viewport.viewportHeight - viewport.renderedHeight) / 2 + viewport.offsetY;

    return {
        x: Math.max(0, -imageLeft / viewport.scale),
        y: Math.max(0, -imageTop / viewport.scale),
        width: Math.min(viewport.imageWidth, viewport.viewportWidth / viewport.scale),
        height: Math.min(viewport.imageHeight, viewport.viewportHeight / viewport.scale)
    };
}

function dataUrlBytes(value: string): number {
    const encoded = value.split(",", 2)[1] ?? "";
    return Math.ceil(encoded.length * 0.75);
}
function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("The selected image could not be read."));
        };
        image.src = url;
    });
}

export function validateBrandingImageFile(file: File): void {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        throw new Error("Use a PNG, JPEG, or WebP image. SVG uploads are intentionally disabled.");
    }
    if (file.size > MAX_SOURCE_BYTES) {
        throw new Error("Images must be smaller than 5 MB before optimization.");
    }
}

/** Validate an upload and read its intrinsic pixel dimensions before editing. */
export async function getBrandingImageDimensions(
    file: File
): Promise<ImageDimensions> {
    validateBrandingImageFile(file);
    const image = await loadImage(file);

    return { width: image.naturalWidth, height: image.naturalHeight };
}

function normalizeCrop(image: HTMLImageElement, crop?: ImageCrop): ImageCrop {
    if (!crop) {
        return {
            x: 0,
            y: 0,
            width: image.naturalWidth,
            height: image.naturalHeight
        };
    }

    const x = Math.max(0, Math.min(image.naturalWidth - 1, crop.x));
    const y = Math.max(0, Math.min(image.naturalHeight - 1, crop.y));

    return {
        x,
        y,
        width: Math.max(1, Math.min(image.naturalWidth - x, crop.width)),
        height: Math.max(1, Math.min(image.naturalHeight - y, crop.height))
    };
}

/**
 * Crop, resize and encode an uploaded branding image.
 *
 * Crop coordinates are expressed in source pixels, keeping the editor's visual
 * viewport independent from output resolution. Images are never upscaled. Logos
 * use a smaller storage budget because two appearance variants may be stored in
 * the realm alongside full-page backgrounds.
 */
export async function prepareBrandingImage(
    file: File,
    kind: ImageKind,
    crop?: ImageCrop
): Promise<string> {
    validateBrandingImageFile(file);

    const image = await loadImage(file);
    const source = normalizeCrop(image, crop);
    const maximum = kind === "logo" ? { width: 640, height: 240 } : { width: 1600, height: 1000 };
    const scale = Math.min(1, maximum.width / source.width, maximum.height / source.height);
    let width = Math.max(1, Math.round(source.width * scale));
    let height = Math.max(1, Math.round(source.height * scale));
    let quality = kind === "logo" ? 0.9 : 0.82;
    let output = "";

    for (let attempt = 0; attempt < 6; attempt += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image processing is unavailable in this browser.");

        context.drawImage(
            image,
            source.x,
            source.y,
            source.width,
            source.height,
            0,
            0,
            width,
            height
        );
        output = canvas.toDataURL("image/webp", quality);
        if (dataUrlBytes(output) <= MAX_STORED_BYTES[kind]) return output;

        width = Math.max(1, Math.round(width * 0.82));
        height = Math.max(1, Math.round(height * 0.82));
        quality = Math.max(0.58, quality - 0.06);
    }

    throw new Error("The optimized image is still too large. Choose a simpler or smaller image.");
}
