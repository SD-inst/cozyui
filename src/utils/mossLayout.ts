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
            compiled[key] =
                key === 'bbox'
                    ? centeredBox(value, width as number, height as number, `${location}.bbox`)
                    : value;
        });
        compiledItems.push(compiled);
    });

    const result = {
        summary,
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
