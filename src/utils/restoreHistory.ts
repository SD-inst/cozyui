// Restoring the parameters of a past generation.
//
// A history entry names its files the way the server knew them then, and those
// names are addresses, not identities: the server empties its input folder on a
// schedule, and a re-upload mints a fresh name for the same bytes. Writing the
// names through blindly leaves a form full of dead references that has also
// displaced the working files it replaced. So every media reference is resolved
// before anything is written, and a reference that cannot be resolved leaves its
// field exactly as the form has it.
import { ensureFileOnServer, fileOnServer } from '../api/files';
import { sha256Hex } from './contentHash';
import { mapLimit } from './filePreflight';
import { MediaRef, walkMediaFields } from './mediaFields';
import { lookupUpload, nameHash, registerUpload } from './uploadStore';

const PROBE_CONCURRENCY = 4;

export type HistoryReport = {
    // Gone from the server, brought back from a local copy under a new name.
    restored: Array<{ from: string; to: string }>;
    // The form already held the same content under a name that works, so
    // nothing was uploaded and the working file stays where it is.
    reused: Array<{ from: string; to: string }>;
    // Nothing left to restore from; the field keeps what the form had.
    lost: string[];
};

export type HistoryResolution = HistoryReport & { values: any };

// Resolve every media name the entry references to a name the form can use.
export const resolveHistoryValues = async ({
    values,
    current,
    apiUrl,
}: {
    values: any;
    current: any;
    apiUrl: string;
}): Promise<HistoryResolution> => {
    const refs = walkMediaFields(values);
    const resolved: Record<string, string> = {};
    const report: HistoryReport = { restored: [], reused: [], lost: [] };
    if (!refs.length) {
        return { values, ...report };
    }
    // The form's own media, indexed by content. A photo the user re-uploaded
    // yesterday already works under a different name; reusing it keeps the slot
    // alive and keeps a second copy of the same bytes off the server.
    const liveByHash = new Map<string, string>();
    for (const ref of walkMediaFields(current)) {
        const hash = await nameHash(ref.filename);
        if (hash && !liveByHash.has(hash)) {
            liveByHash.set(hash, ref.filename);
        }
    }
    const lostFor = (name: string): void => {
        if (!report.lost.includes(name)) {
            report.lost.push(name);
        }
    };
    const names = [...new Set(refs.map((ref) => ref.filename))];
    await mapLimit(names, PROBE_CONCURRENCY, async (name) => {
        if (await fileOnServer(name, apiUrl)) {
            resolved[name] = name;
            return;
        }
        // The bytes may still be here under another name: the alias table maps
        // the dead one onto the content that never moved.
        const local = await lookupUpload(name);
        if (!local) {
            lostFor(name);
            return;
        }
        const hash =
            (await nameHash(name)) ??
            (await sha256Hex(local).catch(() => undefined));
        const live = hash ? liveByHash.get(hash) : undefined;
        if (live) {
            resolved[name] = live;
            report.reused.push({ from: name, to: live });
            return;
        }
        try {
            const to = await ensureFileOnServer(local, undefined, apiUrl);
            // The copy is addressed by the name it was stored under; the fresh
            // server name becomes an alias of the same content.
            await registerUpload(to, local);
            resolved[name] = to;
            report.restored.push({ from: name, to });
        } catch {
            lostFor(name);
        }
    });
    return { values: mergeResolved(values, current, resolved), ...report };
};

// The values to write: non-media fields come from the entry, media fields only
// where they resolved. A slot whose file cannot be brought back keeps the file
// sitting in that slot now; a slot with nothing to keep is dropped rather than
// left pointing at a file that does not exist.
export const mergeResolved = (
    values: any,
    current: any,
    resolved: Record<string, string>,
): any => {
    const refs: MediaRef[] = walkMediaFields(values);
    const mediaFields = new Set(refs.map((ref) => ref.field));
    const keyOf = new Map<string, string>(
        refs.map((ref) => [ref.field, ref.key]),
    );
    const merged: any = {};
    for (const [field, value] of Object.entries(values)) {
        if (!mediaFields.has(field)) {
            merged[field] = value;
            continue;
        }
        if (typeof value === 'string') {
            // Unresolved: leave the field out of the payload entirely, so the
            // form keeps the value it has instead of gaining a dead name.
            const to = resolved[value];
            if (to) {
                merged[field] = to;
            }
            continue;
        }
        if (!Array.isArray(value)) {
            // A compound media field (e.g. `i2i`): its filename is nested, so
            // it is not a reference the walk produces. The preflight rewrites
            // it at generation time, where the graph needs it to be real.
            merged[field] = value;
            continue;
        }
        const key = keyOf.get(field) ?? '';
        const existing: any[] = Array.isArray(current?.[field])
            ? current[field]
            : [];
        merged[field] = value
            .map((entry, index) => {
                if (!entry || typeof entry !== 'object' || !key) {
                    return entry;
                }
                const name = (entry as Record<string, unknown>)[key];
                if (typeof name !== 'string' || !name) {
                    return entry;
                }
                const to = resolved[name];
                if (to) {
                    return { ...entry, [key]: to };
                }
                const kept = existing[index];
                return kept && typeof kept[key] === 'string' && kept[key]
                    ? kept
                    : null;
            })
            .filter((entry) => entry !== null);
    }
    return merged;
};
