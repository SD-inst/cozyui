// Canvas / crop math for H3 RefMod encode — reproduces the server-side canvas
// + center-crop so the client can preview what each reference image becomes
// and pick the crop region. Source: ComfyUI-MiniMaxH3Mod (see CANVAS_LOGIC.md).

export type ImageSize = { width: number; height: number };
export type Crop = { x: number; y: number; w: number; h: number };

// Python round() is round-half-to-even; JS Math.round is round-half-up. The
// difference only matters on exact .5 — needed so the canvas matches the node.
export const pyRound = (v: number): number => {
    const f = Math.floor(v);
    const frac = v - f;
    if (Math.abs(frac - 0.5) < 1e-9) {
        return (f % 2 === 0) ? f : f + 1;
    }
    return Math.round(v);
};

// Canvas (output size) derived from the FIRST image's raw size. `refResolution`
// is the target short side (a ceiling — never upscales). Both dims snap to /32.
export const computeCanvas = (
    firstImg: ImageSize,
    refResolution = 1024,
): ImageSize => {
    const h0 = firstImg.height;
    const w0 = firstImg.width;
    const scale = Math.min(1.0, refResolution / Math.min(h0, w0));
    const canvasW = Math.max(32, pyRound((w0 * scale) / 32) * 32);
    const canvasH = Math.max(32, pyRound((h0 * scale) / 32) * 32);
    return { width: canvasW, height: canvasH };
};

// Total token count of the mod: N images stacked at the canvas latent size.
export const modTokenCount = (canvas: ImageSize, nImages: number) => {
    const perFrame =
        Math.floor(canvas.height / 32) * Math.floor(canvas.width / 32);
    return { perFrame, totalT: nImages, tokens: nImages * perFrame };
};

// Effective token count of the mod, mirroring the server-side limits:
//   1. `latent_frames` caps how many stacked refs become latent frames;
//   2. `max_tokens` is a hard budget — the server resamples down to the
//      largest frame count that fits (`max(1, floor(budget / per_frame))`;
//      temporal dedup can only reduce it further, so this is the ceiling).
// Returns the raw (uncapped) count too so the UI can explain a shortfall.
export const effectiveTokenCount = (
    canvas: ImageSize,
    nImages: number,
    maxTokens: number,
    latentFrames: number,
) => {
    const perFrame =
        Math.floor(canvas.height / 32) * Math.floor(canvas.width / 32);
    const rawTokens = perFrame * nImages;
    let frames = latentFrames > 0 ? Math.min(nImages, latentFrames) : nImages;
    let capped = false;
    if (maxTokens > 0) {
        const fitT = Math.max(1, Math.floor(maxTokens / perFrame));
        if (fitT < frames) {
            frames = fitT;
            capped = true;
        }
    }
    // Even a single frame exceeds the budget — the server refuses to create
    // the mod at this resolution/budget.
    const overBudget = maxTokens > 0 && perFrame > maxTokens;
    return { perFrame, frames, tokens: frames * perFrame, rawTokens, capped, overBudget };
};

// Largest crop height (px) with a given aspect (w/h) that fits the image.
export const maxCropH = (img: ImageSize, aspect: number): number =>
    Math.min(img.height, img.width / aspect);

// The center-crop base: the largest aspect-fit rectangle, centered. This is
// what the server keeps by default, so it is the natural crop starting point.
export const defaultCrop = (img: ImageSize, aspect: number): Crop => {
    const h = maxCropH(img, aspect);
    const w = h * aspect;
    return {
        x: (img.width - w) / 2,
        y: (img.height - h) / 2,
        h,
        w,
    };
};

// Minimum crop height (px) — below this the result has almost no content left.
export const MIN_CROP_H = 64;

// Clamp a crop (aspect-locked) so it fits the image. `h` is the primary size;
// `w` follows from the aspect.
export const clampCrop = (
    x: number,
    y: number,
    h: number,
    aspect: number,
    img: ImageSize,
): Crop => {
    const maxH = maxCropH(img, aspect);
    const ch = Math.min(maxH, Math.max(MIN_CROP_H, h));
    const w = ch * aspect;
    const cx = Math.max(0, Math.min(img.width - w, x));
    const cy = Math.max(0, Math.min(img.height - ch, y));
    return { x: cx, y: cy, h: ch, w };
};

// Snap a length to a multiple of 32 (floored at 32), for the output canvas —
// matches the node's canvas snapping so the server's own center-crop is minimal.
export const snap32 = (n: number): number =>
    Math.max(32, pyRound(n / 32) * 32);
