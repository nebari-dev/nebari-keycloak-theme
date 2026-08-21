const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_STORED_BYTES = 420_000;

type ImageKind = "logo" | "background";

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

export async function prepareBrandingImage(file: File, kind: ImageKind): Promise<string> {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        throw new Error("Use a PNG, JPEG, or WebP image. SVG uploads are intentionally disabled.");
    }
    if (file.size > MAX_SOURCE_BYTES) {
        throw new Error("Images must be smaller than 5 MB before optimization.");
    }

    const image = await loadImage(file);
    const maximum = kind === "logo" ? { width: 640, height: 240 } : { width: 1600, height: 1000 };
    const scale = Math.min(1, maximum.width / image.naturalWidth, maximum.height / image.naturalHeight);
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    let quality = kind === "logo" ? 0.9 : 0.82;
    let output = "";

    for (let attempt = 0; attempt < 6; attempt += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image processing is unavailable in this browser.");

        context.drawImage(image, 0, 0, width, height);
        output = canvas.toDataURL("image/webp", quality);
        if (dataUrlBytes(output) <= MAX_STORED_BYTES) return output;

        width = Math.max(1, Math.round(width * 0.82));
        height = Math.max(1, Math.round(height * 0.82));
        quality = Math.max(0.58, quality - 0.06);
    }

    throw new Error("The optimized image is still too large. Choose a simpler or smaller image.");
}
