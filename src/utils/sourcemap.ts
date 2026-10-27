// A crash report from a phone names positions in the minified bundle —
// `index-CJRcUQi3.js:208:80139` — which means nothing until the source map of
// that exact build is applied. Decoding a map is a few dozen lines of base64
// VLQ, and keeping it here means the offline symbolicator pulls in no
// dependency and the suite covers the decoding.

export type rawSourceMapType = {
    version?: number;
    sources: string[];
    names?: string[];
    mappings: string;
    sourcesContent?: (string | null)[];
};

export type mappingSegmentType = {
    generatedLine: number; // 1-based, as a browser reports it
    generatedColumn: number; // 0-based, as a source map stores it
    source?: string;
    originalLine?: number; // 1-based
    originalColumn?: number; // 0-based
    name?: string;
};

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Each segment is a run of variable-length quantities: five bits per base64
// digit with a continuation bit, and the sign in the lowest bit of the last one.
export const decodeVlq = (segment: string): number[] => {
    const values: number[] = [];
    let accumulator = 0;
    let shift = 0;
    for (const character of segment) {
        const digit = BASE64.indexOf(character);
        if (digit < 0) {
            throw new Error(`Not a base64 digit in a source map: "${character}"`);
        }
        accumulator += (digit & 31) << shift;
        if (digit & 32) {
            shift += 5;
            continue;
        }
        const negative = accumulator & 1;
        accumulator >>= 1;
        values.push(negative ? -accumulator : accumulator);
        accumulator = 0;
        shift = 0;
    }
    return values;
};

// Mappings are grouped by generated line (';') and the fields after the first
// are deltas against the previous segment, which is why decoding has to walk
// the whole string even to answer one position.
export const decodeMappings = (map: rawSourceMapType): mappingSegmentType[] => {
    const segments: mappingSegmentType[] = [];
    const names = map.names ?? [];
    let sourceIndex = 0;
    let originalLine = 0;
    let originalColumn = 0;
    let nameIndex = 0;
    map.mappings.split(';').forEach((lineMappings, lineIndex) => {
        let generatedColumn = 0;
        if (!lineMappings) {
            return;
        }
        for (const field of lineMappings.split(',')) {
            if (!field) {
                continue;
            }
            const values = decodeVlq(field);
            generatedColumn += values[0];
            const segment: mappingSegmentType = {
                generatedLine: lineIndex + 1,
                generatedColumn,
            };
            if (values.length >= 4) {
                sourceIndex += values[1];
                originalLine += values[2];
                originalColumn += values[3];
                segment.source = map.sources[sourceIndex];
                segment.originalLine = originalLine + 1;
                segment.originalColumn = originalColumn;
                if (values.length >= 5) {
                    nameIndex += values[4];
                    segment.name = names[nameIndex];
                }
            }
            segments.push(segment);
        }
    });
    return segments;
};

export type sourceMappingIndexType = Map<number, mappingSegmentType[]>;

export const indexMappings = (
    segments: mappingSegmentType[],
): sourceMappingIndexType => {
    const index: sourceMappingIndexType = new Map();
    for (const segment of segments) {
        const line = index.get(segment.generatedLine);
        if (line) {
            line.push(segment);
        } else {
            index.set(segment.generatedLine, [segment]);
        }
    }
    // Segments come out in generated order already; sorting keeps the binary
    // search correct for maps produced by other tools.
    for (const line of index.values()) {
        line.sort((a, b) => a.generatedColumn - b.generatedColumn);
    }
    return index;
};

// A generated column rarely matches a segment exactly — a call site sits
// somewhere inside a mapped range — so the answer is the last segment that
// starts at or before it.
export const originalPositionFor = (
    index: sourceMappingIndexType | undefined,
    line: number,
    column: number,
): mappingSegmentType | null => {
    const segments = index?.get(line);
    if (!segments || !segments.length) {
        return null;
    }
    let low = 0;
    let high = segments.length - 1;
    let found: mappingSegmentType | undefined;
    while (low <= high) {
        const middle = (low + high) >> 1;
        if (segments[middle].generatedColumn <= column) {
            found = segments[middle];
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }
    return found?.source ? found : null;
};

export type stackFrameType = {
    text: string; // the line as the browser wrote it
    file: string; // the bundle url as it appears there
    basename: string; // what the map files are matched by
    line: number;
    column: number;
};

// Both shapes a browser produces: `at uP (http://…/index.js:208:80139)` and
// Safari's `uP@http://…/index.js:208:80139`. Requiring a scheme or a leading
// slash keeps the match from swallowing the function name in the Safari form.
// Sources are matched too, because a report from the dev server points at
// `.tsx` files that are already original positions.
const POSITION = /((?:https?:\/\/|\/)[^\s'"]*?\.[cm]?[jt]sx?):(\d+):(\d+)/;

export const parseStack = (text: string): stackFrameType[] => {
    const frames: stackFrameType[] = [];
    for (const line of text.split('\n')) {
        const match = POSITION.exec(line);
        if (!match) {
            continue;
        }
        frames.push({
            text: line.trim(),
            file: match[1],
            basename: match[1].split('/').pop() ?? match[1],
            line: Number(match[2]),
            column: Number(match[3]),
        });
    }
    return frames;
};

// A build with a relative `base` prefixes every source with `../`, which is
// noise in a report; the raw value stays on the segment so the map's own
// `sourcesContent` can still be looked up.
const displaySource = (source: string): string =>
    source.replace(/^(\.\.\/)+/, '');

export const describeOriginal = (original: mappingSegmentType): string => {
    const position = `${displaySource(original.source as string)}:${
        original.originalLine
    }:${(original.originalColumn ?? 0) + 1}`;
    return original.name ? `${position} ${original.name}` : position;
};

// The map usually carries the original text, so the report can show the line
// that actually threw instead of only its position.
export const sourceLineOf = (
    map: rawSourceMapType,
    source: string,
    line: number,
): string | null => {
    const content = map.sourcesContent?.[map.sources.indexOf(source)];
    if (!content) {
        return null;
    }
    return content.split('\n')[line - 1]?.trim() ?? null;
};
