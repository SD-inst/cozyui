// Orchestration on top of the pure policy in `filePreflight`: probe each file
// the payload references, restore the missing ones from the local upload store,
// and rewrite the name everywhere it appears.
//
// A run is created per generation and driven in two phases, because the two
// payload shapes only exist at different moments:
//
//   await run.values({getValues, setValue});   // before the control handlers
//   ...handlers build the workflow...
//   await run.graph({api, getValues, setValue});  // before the prompt is sent
//
// The first phase is where recovery actually happens: a form field has a place
// to write the restored name back to, so every node the handlers then build
// already points at a file that exists. The second phase only sees what the
// handlers introduced on their own and skips every name the first phase already
// confirmed.
import { FilePresence, probeFile } from '../api/files';
import { Workflow } from '../api/graph';
import { db } from '../components/history/db';
import {
    collectGraphRefs,
    collectValueRefs,
    mapLimit,
    renameInGraph,
    renameInValues,
} from './filePreflight';
import {
    ensureUploadsMigrated,
    lookupUpload,
    renameUpload,
    uploadInputFile,
} from './uploadStore';

// A wedged container must not hold the generation in WAITING forever: every
// probe and upload is bounded on its own, this bounds the whole sweep.
export const PREFLIGHT_BUDGET_MS = 4 * 60_000;
const PROBE_CONCURRENCY = 4;
// Per file, per page load: a persistently failing upload must not loop.
const MAX_RESTORE_ATTEMPTS = 2;

const restoreAttempts: Record<string, number> = {};

// Dexie throws as soon as a table is touched when IndexedDB is unavailable
// (private mode, disabled storage), and a preflight that throws would block the
// generation it was meant to protect.
const readStoredNames = async (): Promise<string[]> => {
    try {
        return (await db.uploads.orderBy('lastUsedAt').primaryKeys()) as string[];
    } catch {
        return [];
    }
};

export type LostFile = {
    filename: string;
    // Where it was found — a form path ("ref_images.2.image") or a node
    // reference ("#98.image") — so the message can point at the control.
    where: string;
};

export type PreflightReport = {
    // Files that were gone and are back on the server under a new name.
    restored: Array<{ from: string; to: string }>;
    // Files that are gone and have no local copy to restore from.
    lost: LostFile[];
    // Files whose presence could not be established (dead or wedged server).
    unreachable: LostFile[];
    timedOut: boolean;
};

export type FormAccess = {
    getValues: () => any;
    setValue: (path: string, value: string) => void;
};

export type PreflightRun = {
    values: (form: FormAccess) => Promise<PreflightReport>;
    graph: (args: { api: Workflow } & FormAccess) => Promise<PreflightReport>;
    report: PreflightReport;
};

export const createPreflightRun = (apiUrl: string): PreflightRun => {
    const report: PreflightReport = {
        restored: [],
        lost: [],
        unreachable: [],
        timedOut: false,
    };
    const presence = new Map<string, FilePresence>();
    const renames: Record<string, string> = {};
    let manifest: Set<string> | null = null;

    const probeAndRestore = async (
        refs: Array<{ filename: string; where: string }>,
        deadline: number,
    ): Promise<void> => {
        await mapLimit(refs, PROBE_CONCURRENCY, async ({ filename, where }) => {
            if (presence.has(filename)) {
                return;
            }
            if (Date.now() > deadline) {
                report.timedOut = true;
                presence.set(filename, 'unknown');
                report.unreachable.push({ filename, where });
                return;
            }
            const result = await probeFile(filename, apiUrl);
            presence.set(filename, result);
            if (result === 'present') {
                return;
            }
            if (result === 'unknown') {
                report.unreachable.push({ filename, where });
                return;
            }
            // Gone. Only a copy we uploaded ourselves can bring it back.
            if ((restoreAttempts[filename] || 0) >= MAX_RESTORE_ATTEMPTS) {
                report.lost.push({ filename, where });
                return;
            }
            const local = await lookupUpload(filename);
            if (!local) {
                report.lost.push({ filename, where });
                return;
            }
            restoreAttempts[filename] = (restoreAttempts[filename] || 0) + 1;
            try {
                const { name } = await uploadInputFile(local, apiUrl);
                renames[filename] = name;
                presence.set(name, 'present');
                report.restored.push({ from: filename, to: name });
                // The stored copy follows the file to its new name, so the next
                // generation finds it under the name the form now holds. The
                // upload itself already succeeded, so a storage hiccup here
                // must not turn the recovery into a failure.
                await renameUpload(filename, name).catch(() => undefined);
            } catch {
                report.lost.push({ filename, where });
            }
        });
    };

    const applyRenames = (form: FormAccess): void => {
        if (!Object.keys(renames).length) {
            return;
        }
        const applied = renameInValues(form.getValues(), renames);
        applied.changed.forEach((change) =>
            form.setValue(change.path, change.filename),
        );
    };

    const loadManifest = async (): Promise<Set<string>> => {
        if (!manifest) {
            await ensureUploadsMigrated();
            // Names the local store holds bytes for: uploaded by this client
            // even when the name carries no upload prefix. A store that cannot
            // be read only means nothing can be restored — generation continues
            // and the server reports what it is missing.
            manifest = new Set<string>(await readStoredNames());
        }
        return manifest;
    };

    return {
        report,
        values: async (form) => {
            if (!apiUrl) {
                return report;
            }
            const deadline = Date.now() + PREFLIGHT_BUDGET_MS;
            const names = await loadManifest();
            const refs = collectValueRefs(form.getValues(), names);
            await probeAndRestore(
                refs.map((ref) => ({ filename: ref.filename, where: ref.path })),
                deadline,
            );
            applyRenames(form);
            return report;
        },
        graph: async ({ api, ...form }) => {
            if (!apiUrl) {
                return report;
            }
            const deadline = Date.now() + PREFLIGHT_BUDGET_MS;
            const names = await loadManifest();
            // Anything already confirmed or restored in the value pass is not
            // probed a second time.
            const refs = collectGraphRefs(
                api,
                names,
                new Set(presence.keys()),
            );
            await probeAndRestore(
                refs.map((ref) => ({
                    filename: ref.filename,
                    where: `#${ref.nodeId}.${ref.field}`,
                })),
                deadline,
            );
            // Names the handlers wrote into the graph may be stale; fix them
            // there and in the form, so the preview and the next generation do
            // not repeat the work.
            if (Object.keys(renames).length) {
                renameInGraph(api, renames);
                applyRenames(form);
            }
            return report;
        },
    };
};
