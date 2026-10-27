// Which strings in a payload name a file this client put into ComfyUI's
// `input` folder, and how to rewrite them once a missing file has been restored
// under a new name.
//
// Two payload shapes are walked:
//   - the form values (`collectValueRefs`) — before the control handlers run, so
//     the corrected name flows into every node the handlers build;
//   - the finished workflow (`collectGraphRefs`) — after the handlers, as a
//     safety net for names the handlers put there themselves.
//
// A name counts as ours only when it was uploaded by this client: either it
// carries the timestamp prefix every upload adds, or it is registered in the
// local upload store. That keeps prompts, output-file names and model selectors
// (`ltx2/ltx-2-19b-dev-fp8.safetensors`, always with a subfolder) out of the
// walk — and those cannot be restored by us anyway, since nothing uploads them.
//
// The module is pure (no React, no fetch, no IndexedDB) so the whole policy is
// testable on its own.
import { ext } from '../components/controls/fileExts';
import { UploadType } from '../components/controls/UploadType';
import { InputValue, Workflow } from '../api/graph';

const mediaExtensions: string[] = [
    ...ext[UploadType.IMAGE],
    ...ext[UploadType.VIDEO],
    ...ext[UploadType.AUDIO],
];

// Every upload prefixes the name with a millisecond timestamp; ComfyUI adds a
// prefix of its own when the name is taken.
const UPLOAD_PREFIX = /^\d{10,}_/;

const hasMediaExtension = (value: string): boolean => {
    const lower = value.toLowerCase();
    return mediaExtensions.some((e) => lower.endsWith(e));
};

// `manifest` is the set of names the local upload store holds bytes for.
export const isFileCandidate = (
    value: unknown,
    manifest: Set<string>,
): value is string => {
    if (typeof value !== 'string' || !value) {
        return false;
    }
    // A subfolder means a model/asset path, never an uploaded input.
    if (value.includes('/') || value.includes('\\')) {
        return false;
    }
    return (
        manifest.has(value) ||
        (hasMediaExtension(value) && UPLOAD_PREFIX.test(value))
    );
};

export type ValueRef = {
    filename: string;
    // react-hook-form path of the leaf holding it ("image", "ref_images.2.image",
    // "i2i.image") — the same path `setValue` takes.
    path: string;
};

// An entry excluded from generation ("as if it doesn't exist"): the per-item
// `skip` toggle, or a per-item `enabled` toggle switched off. Its file never
// reaches the workflow, so probing or restoring it would be wasted work.
const isExcludedEntry = (value: Record<string, unknown>): boolean =>
    value.skip === true || value.enabled === false;

const walkValue = (
    value: unknown,
    path: string,
    manifest: Set<string>,
    out: ValueRef[],
): void => {
    if (isFileCandidate(value, manifest)) {
        out.push({ filename: value, path });
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((entry, index) => {
            walkValue(entry, path ? `${path}.${index}` : `${index}`, manifest, out);
        });
        return;
    }
    if (value && typeof value === 'object') {
        if (isExcludedEntry(value as Record<string, unknown>)) {
            return;
        }
        for (const [key, child] of Object.entries(value)) {
            walkValue(child, path ? `${path}.${key}` : key, manifest, out);
        }
    }
};

export const collectValueRefs = (
    values: unknown,
    manifest: Set<string>,
): ValueRef[] => {
    const out: ValueRef[] = [];
    walkValue(values, '', manifest, out);
    return out.filter((ref) => ref.path !== '');
};

export type GraphRef = {
    filename: string;
    nodeId: string;
    field: string;
};

// A link to another node's output: [nodeId, outputIndex].
const isNodeLink = (value: unknown): boolean =>
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'number';

const walkInput = (
    value: unknown,
    manifest: Set<string>,
    out: string[],
): void => {
    if (isFileCandidate(value, manifest)) {
        out.push(value);
        return;
    }
    if (isNodeLink(value)) {
        return;
    }
    if (Array.isArray(value)) {
        // Some nodes take a list of filenames; a list of links is handled by
        // the isNodeLink guard above.
        value.forEach((entry) => walkInput(entry, manifest, out));
    }
};

// Names already accounted for in this generation (verified on the server or
// uploaded by it) are skipped, which keeps the second pass free of redundant
// requests.
export const collectGraphRefs = (
    api: Workflow,
    manifest: Set<string>,
    skipNames?: Set<string>,
): GraphRef[] => {
    const out: GraphRef[] = [];
    for (const [nodeId, node] of Object.entries(api ?? {})) {
        for (const [field, value] of Object.entries(node?.inputs ?? {})) {
            const names: string[] = [];
            walkInput(value, manifest, names);
            for (const filename of names) {
                if (skipNames?.has(filename)) {
                    continue;
                }
                out.push({ filename, nodeId, field });
            }
        }
    }
    return out;
};

// Rewrite every occurrence of a restored file's old name. Form values are
// rebuilt and the changed leaves are reported (the caller pushes each one
// through `setValue`, so the UI and the persisted state follow); the workflow
// is rewritten in place.
export type ValueRename = {
    // react-hook-form path of the changed leaf.
    path: string;
    // The new filename now stored there.
    filename: string;
};

export const renameInValues = (
    values: unknown,
    renames: Record<string, string>,
): { values: unknown; changed: ValueRename[] } => {
    const changed: ValueRename[] = [];
    const walk = (value: unknown, path: string): unknown => {
        if (typeof value === 'string') {
            const next = renames[value];
            if (next) {
                changed.push({ path, filename: next });
                return next;
            }
            return value;
        }
        if (Array.isArray(value)) {
            return value.map((entry, index) =>
                walk(entry, path ? `${path}.${index}` : `${index}`),
            );
        }
        if (value && typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, child]) => [
                    key,
                    walk(child, path ? `${path}.${key}` : key),
                ]),
            );
        }
        return value;
    };
    return { values: walk(values, ''), changed };
};

export const renameInGraph = (
    api: Workflow,
    renames: Record<string, string>,
): void => {
    const walk = (value: unknown): unknown => {
        if (typeof value === 'string') {
            return renames[value] ?? value;
        }
        if (isNodeLink(value)) {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(walk);
        }
        return value;
    };
    for (const node of Object.values(api ?? {})) {
        for (const [field, value] of Object.entries(node?.inputs ?? {})) {
            node.inputs[field] = walk(value) as InputValue;
        }
    }
};

// Run `fn` over `items` with at most `limit` in flight — enough to probe a
// tab's files quickly without flooding a container that may still be starting.
export const mapLimit = async <T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let cursor = 0;
    const workers = new Array(Math.min(limit, items.length)).fill(0).map(
        async () => {
            while (cursor < items.length) {
                const index = cursor++;
                results[index] = await fn(items[index]);
            }
        },
    );
    await Promise.all(workers);
    return results;
};
