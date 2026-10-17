/**
 * Port of MOSS-Image `compile_prompt.py`
 * (https://github.com/OpenMOSS/MOSS-Image/skills/moss-image-prompt-enhancer).
 *
 * The chat LLM produces either a plain caption or a readable Layout draft
 * (absolute top-left pixel boxes, `xyxy`). This module validates the draft and
 * compiles it into the model-facing single-line JSON with `abs_centralized`
 * `yxyx` boxes, exactly like the official Python compiler.
 */

export type MossExtractResult =
    | { kind: 'raw' }
    | { kind: 'caption'; prompt: string }
    | { kind: 'layout'; prompt: string; width: number; height: number }
    | { kind: 'error'; message: string };

const requireTrue = (condition: unknown, message: string): void => {
    if (!condition) {
        throw new Error(message);
    }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const requireText = (value: unknown, location: string): void => {
    requireTrue(
        typeof value === 'string' && value.trim().length > 0,
        `${location} must be nonempty text`,
    );
};

const requireStrings = (value: unknown, location: string): void => {
    requireTrue(Array.isArray(value), `${location} must be an array`);
    (value as unknown[]).forEach((entry, index) =>
        requireText(entry, `${location}[${index}]`),
    );
};

const requireFields = (
    value: Record<string, unknown>,
    allowed: Set<string>,
    required: Set<string>,
    location: string,
): void => {
    const unknown = Object.keys(value).filter((key) => !allowed.has(key));
    requireTrue(
        unknown.length === 0,
        `${location}: unknown fields ${unknown.sort().map((k) => `'${k}'`).join(', ')}`,
    );
    const missing = [...required].filter((key) => !(key in value));
    requireTrue(
        missing.length === 0,
        `${location}: missing fields ${missing.map((k) => `'${k}'`).join(', ')}`,
    );
};

const round9 = (value: number): number => Math.round(value * 1e9) / 1e9;

/**
 * Enclose fractional pixel edges, then subtract the canvas center —
 * matches Echidna generation export ([y1, x1, y2, x2] order).
 */
const centeredBox = (
    box: unknown,
    width: number,
    height: number,
    location: string,
): number[] => {
    requireTrue(
        Array.isArray(box) && box.length === 4,
        `${location} must be [x1,y1,x2,y2]`,
    );
    const [x1, y1, x2, y2] = box as number[];
    requireTrue(
        [x1, y1, x2, y2].every(
            (v) => typeof v === 'number' && Number.isFinite(v),
        ),
        `${location} must contain four finite numbers`,
    );
    requireTrue(
        x1 < x2 && y1 < y2,
        `${location} must have positive width and height`,
    );
    requireTrue(
        0 <= x1 && x2 <= width && 0 <= y1 && y2 <= height,
        `${location} exceeds the ${width}x${height} canvas`,
    );
    const result = [
        Math.floor(round9(y1)) - Math.floor(height / 2),
        Math.floor(round9(x1)) - Math.floor(width / 2),
        Math.ceil(round9(y2)) - Math.floor(height / 2),
        Math.ceil(round9(x2)) - Math.floor(width / 2),
    ];
    requireTrue(
        result[0] < result[2] && result[1] < result[3],
        `${location} is too small at export precision`,
    );
    return result;
};

/**
 * Compile a caption or Layout draft object into the final prompt string.
 * Throws on any validation error, mirroring the official compiler.
 */
export const compileMossPrompt = (
    draft: unknown,
): { prompt: string; width?: number; height?: number } => {
    requireTrue(isRecord(draft), 'Draft must be a JSON object');
    const record = draft as Record<string, unknown>;

    if ('caption' in record) {
        requireFields(record, new Set(['caption']), new Set(['caption']), 'Caption draft');
        requireText(record.caption, 'caption');
        return { prompt: record.caption as string };
    }

    const rootRequired = new Set([
        'width',
        'height',
        'bbox_coord_space',
        'bbox_format',
        'summary',
        'items',
    ]);
    requireFields(record, rootRequired, rootRequired, 'Layout draft');

    const width = record.width;
    const height = record.height;
    (
        [
            ['width', width],
            ['height', height],
        ] as [string, unknown][]
    ).forEach(([name, value]) => {
        requireTrue(
            typeof value === 'number' &&
                Number.isInteger(value) &&
                value > 0 &&
                value % 16 === 0,
            `${name} must be a positive integer multiple of 16`,
        );
    });
    requireTrue(record.bbox_coord_space === 'abs', 'Draft bbox_coord_space must be abs');
    requireTrue(record.bbox_format === 'xyxy', 'Draft bbox_format must be xyxy');

    const summary = record.summary;
    if (!isRecord(summary)) {
        throw new Error('summary must be an object');
    }
    requireFields(
        summary,
        new Set(['caption', 'meta', 'canvas', 'palette']),
        new Set(['caption']),
        'summary',
    );
    requireText(summary.caption, 'summary.caption');
    if ('canvas' in summary) {
        requireTrue(
            summary.canvas === 'single' ||
                summary.canvas === 'multi_panel' ||
                summary.canvas === 'collage',
            'summary.canvas must be single, multi_panel or collage',
        );
    }
    (['meta', 'palette'] as const).forEach((key) => {
        if (key in summary) {
            requireStrings(summary[key], `summary.${key}`);
        }
    });

    const items = record.items;
    requireTrue(
        Array.isArray(items) && items.length > 0,
        'items must be a nonempty flat array',
    );
    const compiledItems: Record<string, unknown>[] = [];
    (items as unknown[]).forEach((entry, index) => {
        const location = `items[${index}]`;
        if (!isRecord(entry)) {
            throw new Error(`${location} must be an object`);
        }
        const item = entry;
        requireFields(
            item,
            new Set(['label', 'caption', 'bbox', 'text', 'tags', 'palette']),
            new Set(['label', 'caption', 'bbox']),
            location,
        );
        requireTrue(
            item.label === 'object' || item.label === 'character' || item.label === 'text',
            `${location}.label must be object, character or text`,
        );
        requireText(item.caption, `${location}.caption`);
        if (item.label === 'text') {
            requireTrue('text' in item, `${location}: text items require literal text`);
        }
        if ('text' in item) {
            requireText(item.text, `${location}.text`);
        }
        (['tags', 'palette'] as const).forEach((key) => {
            if (key in item) {
                requireStrings(item[key], `${location}.${key}`);
            }
        });
        const compiled: Record<string, unknown> = {};
        Object.entries(item).forEach(([key, value]) => {
            if (key === 'bbox') {
                compiled[key] = centeredBox(
                    value,
                    width as number,
                    height as number,
                    `${location}.bbox`,
                );
            } else if (key === 'palette') {
                compiled[key] = (value as string[]).map(resolvePaletteColor);
            } else {
                compiled[key] = value;
            }
        });
        compiledItems.push(compiled);
    });

    const summaryOut: Record<string, unknown> = { ...summary };
    if (Array.isArray(summary.palette)) {
        summaryOut.palette = (summary.palette as string[]).map(
            resolvePaletteColor,
        );
    }

    const result = {
        summary: summaryOut,
        items: compiledItems,
        bbox_coord_space: 'abs_centralized',
        bbox_format: 'yxyx',
    };
    return {
        prompt: JSON.stringify(result),
        width: width as number,
        height: height as number,
    };
};

const looksLikeDraft = (value: unknown): boolean =>
    isRecord(value) &&
    ('caption' in value ||
        'items' in value ||
        'summary' in value ||
        'width' in value);

const draftTextMarkers = ['"items"', '"summary"', '"caption"', '"bbox_format"'];

const looksLikeDraftText = (value: string): boolean =>
    draftTextMarkers.some((marker) => value.includes(marker));

/**
 * Extract a MOSS-Image prompt from a chat assistant message.
 *
 * Returns `{ kind: 'raw' }` when the message carries no JSON draft (plain
 * prose passes through untouched), a compiled layout or caption otherwise, and
 * `{ kind: 'error' }` when a draft was present but failed validation.
 */
export const extractMossPrompt = (text: string): MossExtractResult => {
    const candidates: string[] = [];
    const fence = /```(?:json)?\s*([\s\S]*?)```/g;
    let match = fence.exec(text);
    while (match !== null) {
        candidates.push(match[1].trim());
        match = fence.exec(text);
    }
    if (candidates.length === 0) {
        // Generation can be cut off before the closing fence.
        const open = text.lastIndexOf('```');
        if (open !== -1) {
            const rest = text
                .slice(open + 3)
                .replace(/^json\s*/i, '')
                .trim();
            if (rest) {
                candidates.push(rest);
            }
        }
    }
    const trimmed = text.trim();
    if (candidates.length === 0 && trimmed.startsWith('{') && trimmed.endsWith('}')) {
        candidates.push(trimmed);
    }

    let error: MossExtractResult | undefined;
    for (const candidate of candidates) {
        let parsed: unknown;
        try {
            parsed = JSON.parse(candidate);
        } catch (e) {
            if (looksLikeDraftText(candidate)) {
                error = {
                    kind: 'error',
                    message: `Invalid JSON draft: ${e instanceof Error ? e.message : String(e)}`,
                };
            }
            continue;
        }
        if (!looksLikeDraft(parsed)) {
            continue;
        }
        try {
            const compiled = compileMossPrompt(parsed);
            if (compiled.width !== undefined && compiled.height !== undefined) {
                return {
                    kind: 'layout',
                    prompt: compiled.prompt,
                    width: compiled.width,
                    height: compiled.height,
                };
            }
            return { kind: 'caption', prompt: compiled.prompt };
        } catch (e) {
            error = {
                kind: 'error',
                message: e instanceof Error ? e.message : String(e),
            };
        }
    }
    return error ?? { kind: 'raw' };
};

/* ------------------------------------------------------------------ */
/* Readable draft model — used by the bounding box editor.             */
/* ------------------------------------------------------------------ */

export type MossBBox = [number, number, number, number]; // absolute xyxy px

export type MossLayoutItem = {
    label: 'object' | 'character' | 'text';
    caption: string;
    text?: string;
    bbox: MossBBox;
    tags?: string[];
    palette?: string[];
};

export type MossLayoutDraft = {
    width: number;
    height: number;
    summary: string;
    meta?: string[];
    canvas?: 'single' | 'multi_panel' | 'collage';
    palette?: string[];
    items: MossLayoutItem[];
};

export const isMossDimension = (value: number): boolean =>
    Number.isInteger(value) && value > 0 && value % 16 === 0;

const CSS_NAMED_COLORS: Record<string, string> = {
    aliceblue: '#f0f8ff', antiquewhite: '#faebd7', aqua: '#00ffff',
    aquamarine: '#7fffd4', azure: '#f0ffff', beige: '#f5f5dc',
    bisque: '#ffe4c4', black: '#000000', blanchedalmond: '#ffebcd',
    blue: '#0000ff', blueviolet: '#8a2be2', brown: '#a52a2a',
    burlywood: '#deb887', cadetblue: '#5f9ea0', chartreuse: '#7fff00',
    chocolate: '#d2691e', coral: '#ff7f50', cornflowerblue: '#6495ed',
    cornsilk: '#fff8dc', crimson: '#dc143c', cyan: '#00ffff',
    darkblue: '#00008b', darkcyan: '#008b8b',
    darkgoldenrod: '#b8860b', darkgray: '#a9a9a9', darkgreen: '#006400',
    darkgrey: '#a9a9a9', darkkhaki: '#bdb76b', darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f', darkorange: '#ff8c00', darkorchid: '#9932cc',
    darkred: '#8b0000', darksalmon: '#e9967a', darkseagreen: '#8fbc8f',
    darkslateblue: '#483d8b', darkslategray: '#2f4f4f',
    darkslategrey: '#2f4f4f', darkturquoise: '#00ced1', darkviolet: '#9400d3',
    deeppink: '#ff1493', deepskyblue: '#00bfff', dimgray: '#696969',
    dimgrey: '#696969', dodgerblue: '#1e90ff', firebrick: '#b22222',
    floralwhite: '#fffaf0', forestgreen: '#228b22', fuchsia: '#ff00ff',
    gainsboro: '#dcdcdc', ghostwhite: '#f8f8ff', gold: '#ffd700',
    goldenrod: '#daa520', gray: '#808080', green: '#008000',
    greenyellow: '#adff2f', grey: '#808080', honeydew: '#f0fff0',
    hotpink: '#ff69b4', indianred: '#cd5c5c', indigo: '#4b0082',
    ivory: '#fffff0', khaki: '#f0e68c', lavender: '#e6e6fa',
    lavenderblush: '#fff0f5', lawngreen: '#7cfc00', lemonchiffon: '#fffacd',
    lightblue: '#add8e6', lightcoral: '#f08080', lightcyan: '#e0ffff',
    lightgoldenrodyellow: '#fafad2', lightgray: '#d3d3d3',
    lightgreen: '#90ee90', lightgrey: '#d3d3d3', lightpink: '#ffb6c1',
    lightsalmon: '#ffa07a', lightseagreen: '#20b2aa', lightskyblue: '#87cefa',
    lightslategray: '#778899', lightslategrey: '#778899',
    lightsteelblue: '#b0c4de', lightyellow: '#ffffe0', lime: '#00ff00',
    limegreen: '#32cd32', linen: '#faf0e6', magenta: '#ff00ff',
    maroon: '#800000', mediumaquamarine: '#66cdaa', mediumblue: '#0000cd',
    mediumorchid: '#ba55d3', mediumpurple: '#9370db',
    mediumseagreen: '#3cb371', mediumslateblue: '#7b68ee',
    mediumspringgreen: '#00fa9a', mediumturquoise: '#48d1cc',
    mediumvioletred: '#c71585', midnightblue: '#191970',
    mintcream: '#f5fffa', mistyrose: '#ffe4e1', moccasin: '#ffe4b5',
    navajowhite: '#ffdead', navy: '#000080', oldlace: '#fdf5e6',
    olive: '#808000', olivedrab: '#6b8e23', orange: '#ffa500',
    orangered: '#ff4500', orchid: '#da70d6', palegoldenrod: '#eee8aa',
    palegreen: '#98fb98', paleturquoise: '#afeeee',
    palevioletred: '#db7093', papayawhip: '#ffefd5', peachpuff: '#ffdab9',
    peru: '#cd853f', pink: '#ffc0cb', plum: '#dda0dd',
    powderblue: '#b0e0e6', purple: '#800080', rebeccapurple: '#663399',
    red: '#ff0000', rosybrown: '#bc8f8f', royalblue: '#4169e1',
    saddlebrown: '#8b4513', salmon: '#fa8072', sandybrown: '#f4a460',
    seagreen: '#2e8b57', seashell: '#fff5ee', sienna: '#a0522d',
    silver: '#c0c0c0', skyblue: '#87ceeb', slateblue: '#6a5acd',
    slategray: '#708090', slategrey: '#708090', snow: '#fffafa',
    springgreen: '#00ff7f', steelblue: '#4682b4', tan: '#d2b48c',
    teal: '#008080', thistle: '#d8bfd8', tomato: '#ff6347',
    turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3',
    white: '#ffffff', whitesmoke: '#f5f5f5', yellow: '#ffff00',
    yellowgreen: '#9acd32',
};

/** Returns the canonical lowercase `#rrggbb` for a hex string, or null. */
export const parseHexColor = (value: string): string | null => {
    const v = value.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) {
        return v;
    }
    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
    if (short) {
        return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
    }
    return null;
};

/** Common color words outside the CSS list that LLMs emit frequently. */
const EXTRA_NAMED_COLORS: Record<string, string> = {
    rust: '#b7410e',
    terracotta: '#e2725b',
    burgundy: '#800020',
    charcoal: '#36454f',
    cream: '#fffdd0',
    mustard: '#ffdb58',
    sage: '#bcb88f',
    mauve: '#e0b0ff',
    ochre: '#cc7722',
    sand: '#dec9a5',
    navy: '#000080',
};

type HSL = { h: number; s: number; l: number };

const hexToRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

const rgbToHex = (rgb: number[]): string =>
    '#' +
    rgb
        .map((v) =>
            Math.max(0, Math.min(255, Math.round(v)))
                .toString(16)
                .padStart(2, '0'),
        )
        .join('');

const rgbToHsl = (r: number, g: number, b: number): HSL => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) {
        return { h: 0, s: 0, l: l * 100 };
    }
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
        h = ((b - r) / d + 2) / 6;
    } else {
        h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToRgb = ({ h, s, l }: HSL): number[] => {
    h /= 360;
    s /= 100;
    l /= 100;
    if (s === 0) {
        return [l * 255, l * 255, l * 255];
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const conv = (t: number): number => {
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
            return q;
        }
        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    };
    return [conv(h + 1 / 3) * 255, conv(h) * 255, conv(h - 1 / 3) * 255];
};

/** Shortest-path hue nudge toward a target angle. */
const shiftHue = (h: number, target: number, k: number): number => {
    let d = target - h;
    while (d > 180) {
        d -= 360;
    }
    while (d < -180) {
        d += 360;
    }
    return (h + d * k + 360) % 360;
};

const MODIFIERS: Record<string, (c: HSL) => HSL> = {
    light: (c) => ({ ...c, l: c.l + (100 - c.l) * 0.18 }),
    lighter: (c) => ({ ...c, l: c.l + (100 - c.l) * 0.25 }),
    pale: (c) => ({ ...c, s: c.s * 0.75, l: c.l + (100 - c.l) * 0.22 }),
    soft: (c) => ({ ...c, s: c.s * 0.65 }),
    muted: (c) => ({ ...c, s: c.s * 0.6 }),
    subdued: (c) => ({ ...c, s: c.s * 0.6 }),
    desaturated: (c) => ({ ...c, s: c.s * 0.55 }),
    dusty: (c) => ({ ...c, s: c.s * 0.7, l: c.l * 0.92 }),
    dark: (c) => ({ ...c, l: c.l * 0.8 }),
    deep: (c) => ({
        ...c,
        s: Math.min(100, c.s * 1.15),
        l: c.l * 0.82,
    }),
    bright: (c) => ({
        ...c,
        s: Math.min(100, c.s * 1.1),
        l: c.l + (100 - c.l) * 0.15,
    }),
    vivid: (c) => ({ ...c, s: Math.min(100, c.s * 1.25) }),
    strong: (c) => ({ ...c, s: Math.min(100, c.s * 1.2) }),
    saturated: (c) => ({ ...c, s: Math.min(100, c.s * 1.2) }),
    warm: (c) => ({ ...c, h: shiftHue(c.h, 30, 0.12) }),
    cool: (c) => ({ ...c, h: shiftHue(c.h, 215, 0.12) }),
};

const namedColor = (word: string): string | null =>
    CSS_NAMED_COLORS[word] ?? EXTRA_NAMED_COLORS[word] ?? null;

/** Resolve a phrase like "rust orange-brown" or "muted earth brown". */
const resolveNamedColors = (raw: string): string | null => {
    const words = raw.split(/[^a-z0-9]+/).filter(Boolean);
    if (words.length === 0) {
        return null;
    }
    const colorIdx = words
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => namedColor(w));
    if (colorIdx.length === 0) {
        return null;
    }
    const base = rgbToHsl(...hexToRgb(namedColor(colorIdx[colorIdx.length - 1].w)!));
    const tints = colorIdx.slice(0, -1).map(({ w }) => hexToRgb(namedColor(w)!));
    let rgb = hslToRgb(base);
    if (tints.length) {
        const avg = tints.reduce(
            (acc, t) => [acc[0] + t[0], acc[1] + t[1], acc[2] + t[2]],
            [0, 0, 0],
        ).map((v) => v / tints.length);
        const k = 0.35;
        rgb = rgb.map((v, j) => v * (1 - k) + avg[j] * k);
    }
    let hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    const modifiers = words.filter((w) => MODIFIERS[w]);
    modifiers.forEach((m) => {
        hsl = MODIFIERS[m](hsl);
    });
    return rgbToHex(hslToRgb(hsl));
};

/**
 * Normalize a palette entry to `#rrggbb`. LLMs sometimes emit color names
 * ("warm beige") instead of hex: exact CSS names first, then a compositional
 * resolve (base = last color word, earlier color words tint it, light/dark/
 * muted/... modifiers adjust HSL). Unknown descriptions are kept verbatim so
 * information is never lost.
 */
export const resolvePaletteColor = (value: string): string => {
    const hex = parseHexColor(value);
    if (hex) {
        return hex;
    }
    const raw = value.trim().toLowerCase();
    const direct = CSS_NAMED_COLORS[raw];
    if (direct) {
        return direct;
    }
    const joined = raw.replace(/[^a-z0-9]/g, '');
    const joinedHit = CSS_NAMED_COLORS[joined];
    if (joinedHit) {
        return joinedHit;
    }
    const composed = resolveNamedColors(raw);
    return composed ?? value.trim();
};

/** Compile an editor draft into the final prompt string. Throws on validation errors. */
export const compileMossDraft = (draft: MossLayoutDraft): string => {
    const summary: Record<string, unknown> = { caption: draft.summary };
    if (draft.meta) {
        summary.meta = draft.meta;
    }
    if (draft.canvas) {
        summary.canvas = draft.canvas;
    }
    if (draft.palette) {
        summary.palette = draft.palette;
    }
    const { prompt } = compileMossPrompt({
        width: draft.width,
        height: draft.height,
        bbox_coord_space: 'abs',
        bbox_format: 'xyxy',
        summary,
        items: draft.items,
    });
    return prompt;
};

const toNumber = (value: unknown, fallback = 0): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const toText = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Reverse of `compileMossPrompt`: parse a compiled (`abs_centralized`/`yxyx`)
 * or draft (`abs`/`xyxy`) layout JSON back into the editable draft. Canvas
 * dimensions come from the form because the compiled prompt omits them.
 * Returns null when the text is not a layout at all.
 */
export const decompileMossPrompt = (
    text: string,
    width: number,
    height: number,
): MossLayoutDraft | null => {
    let data: unknown;
    try {
        data = JSON.parse(text.trim());
    } catch {
        return null;
    }
    if (!isRecord(data)) {
        return null;
    }
    const compiled =
        data.bbox_coord_space === 'abs_centralized' && data.bbox_format === 'yxyx';
    const draft = data.bbox_coord_space === 'abs' && data.bbox_format === 'xyxy';
    if (!compiled && !draft) {
        return null;
    }
    if (!isRecord(data.summary) || typeof data.summary.caption !== 'string') {
        return null;
    }
    if (!Array.isArray(data.items)) {
        return null;
    }
    const items: MossLayoutItem[] = [];
    for (const entry of data.items) {
        if (!isRecord(entry) || !Array.isArray(entry.bbox) || entry.bbox.length !== 4) {
            return null;
        }
        const [a, b, c, d] = entry.bbox.map((v) => toNumber(v));
        const box: MossBBox = compiled
            ? [b + width / 2, a + height / 2, d + width / 2, c + height / 2]
            : [a, b, c, d];
        const label =
            entry.label === 'object' || entry.label === 'character' || entry.label === 'text'
                ? entry.label
                : 'object';
        const item: MossLayoutItem = {
            label,
            caption: toText(entry.caption),
            bbox: box,
        };
        const textValue = toText(entry.text);
        if (textValue) {
            item.text = textValue;
        }
        if (Array.isArray(entry.tags)) {
            item.tags = entry.tags.filter((t): t is string => typeof t === 'string');
        }
        if (Array.isArray(entry.palette)) {
            item.palette = entry.palette.filter((t): t is string => typeof t === 'string');
        }
        items.push(item);
    }
    const result: MossLayoutDraft = {
        width,
        height,
        summary: data.summary.caption,
        items,
    };
    if (Array.isArray(data.summary.meta)) {
        result.meta = data.summary.meta.filter((t): t is string => typeof t === 'string');
    }
    if (
        data.summary.canvas === 'single' ||
        data.summary.canvas === 'multi_panel' ||
        data.summary.canvas === 'collage'
    ) {
        result.canvas = data.summary.canvas;
    }
    if (Array.isArray(data.summary.palette)) {
        result.palette = data.summary.palette.filter(
            (t): t is string => typeof t === 'string',
        );
    }
    return result;
};
