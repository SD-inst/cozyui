// Turns a crash report from a phone into positions in the source tree:
//
//   yarn symbolicate report.txt        # or pipe the report on stdin
//
// The maps are built but deliberately never served to the browser — a map is
// the whole source — so this is where they get used: offline, against the build
// the report names. See scripts/collect-sourcemaps.mjs for where they live.
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import {
    decodeMappings,
    describeOriginal,
    indexMappings,
    originalPositionFor,
    parseStack,
    rawSourceMapType,
    sourceMappingIndexType,
    sourceLineOf,
} from '../src/utils/sourcemap.ts';

const findMaps = (
    dir: string,
    into: Map<string, rawSourceMapType> = new Map(),
): Map<string, rawSourceMapType> => {
    if (!existsSync(dir)) {
        return into;
    }
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            findMaps(path, into);
        } else if (entry.endsWith('.map')) {
            // Bundle names are content hashed, so a name identifies the build;
            // a later version simply wins if a name ever repeats.
            into.set(
                entry.replace(/\.map$/, ''),
                JSON.parse(readFileSync(path, 'utf8')) as rawSourceMapType,
            );
        }
    }
    return into;
};

const readInput = (): string => {
    const files = process.argv.slice(2);
    if (files.length) {
        return files.map((file) => readFileSync(file, 'utf8')).join('\n');
    }
    return readFileSync(0, 'utf8');
};

const report = readInput();
const maps = new Map([...findMaps('sourcemaps'), ...findMaps('dist')]);
const indexes = new Map<string, sourceMappingIndexType>();
for (const [name, map] of maps) {
    indexes.set(name, indexMappings(decodeMappings(map)));
}

const frames = parseStack(report);
if (!frames.length) {
    console.error('No stack frames found in the input.');
    process.exit(1);
}

let matched = 0;
for (const frame of frames) {
    const original = originalPositionFor(
        indexes.get(frame.basename),
        frame.line,
        frame.column,
    );
    if (!indexes.has(frame.basename)) {
        console.log(`${frame.text}\n    no map file for ${frame.basename}`);
        continue;
    }
    if (!original?.source) {
        console.log(
            `${frame.text}\n    no mapping at ${frame.line}:${frame.column}`,
        );
        continue;
    }
    matched += 1;
    console.log(`${frame.text}\n    -> ${describeOriginal(original)}`);
    const snippet = sourceLineOf(
        maps.get(frame.basename) as rawSourceMapType,
        original.source,
        original.originalLine as number,
    );
    if (snippet) {
        console.log(`       ${snippet}`);
    }
}

console.log(
    `\n${matched}/${frames.length} frames symbolicated from ${indexes.size} map file(s).`,
);
if (!matched && indexes.size) {
    console.log(
        'None of them matched: the report names content-hashed bundles, so it needs the maps of the build that produced it.',
    );
}
if (!indexes.size) {
    console.log(
        'No source maps found: run `yarn build` (it moves them to sourcemaps/<version>).',
    );
}
