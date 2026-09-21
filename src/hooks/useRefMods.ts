import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { db, RefMod } from '../components/history/db';
import { ensureFileOnServer, fileOnServer } from '../api/files';
import { activeEntries } from '../utils/arraySlots';
import { useApiURL } from './useApiURL';

// Every ref-mod thumbnail is a `cover` crop of the source frame; the stored
// (x, y) offsets pick the anchor via `object-position`. x: 0 = left, 100 =
// right; y: 0 = top, 100 = bottom. 50/50 (the default) centers it.
export const refModThumbStyle = (x: number, y: number): CSSProperties => ({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${x}% ${y}%`,
});

// A visual ref mod slot resolved for the chat: only the visual ones are
// returned, in the order they were added. `index` is 1-based among the visual
// ref mods (audio-only mods are dropped — their thumbnail exists for the user,
// not the model). The tab adds its own offset to reach the absolute image
// position. Only the position is exposed: the mod's name is personal info and
// must never be sent to the chat, so the model describes the subject purely
// from the attached image.
export type ChatRefMod = {
    index: number;
    kind: 'image' | 'video';
};

// Returns a cache keyed by mod id (stable) instead of a position-based array.
// A mod's meta (name/kind/crop) never changes, so only a change to the SET of
// mods should re-fetch — not their order. Keying on the sorted set + a mod-id
// cache is the same reorder-flash guard as useModThumbURLs: a reorder leaves
// the cache untouched, so each item reads its own meta by id.
export const useRefModMeta = (modIds: Array<string | undefined>) => {
    const setKey = useMemo(
        () => modIds.filter(Boolean).sort().join(','),
        [modIds],
    );
    const [modsById, setModsById] = useState<Record<string, RefMod>>({});
    const idsRef = useRef(modIds);
    idsRef.current = modIds;

    useEffect(() => {
        let cancelled = false;
        const active = idsRef.current.filter((id): id is string => !!id);
        if (!active.length) {
            setModsById({});
            return;
        }
        Promise.all(
            active.map(async (id) => {
                const mod = await db.refMods.get(id);
                return [id, mod] as const;
            }),
        ).then((result) => {
            if (cancelled) return;
            const map: Record<string, RefMod> = {};
            for (const [id, mod] of result) {
                if (mod) map[id] = mod;
            }
            setModsById(map);
        });
        return () => {
            cancelled = true;
        };
    }, [setKey]);

    return modsById;
};

// Reads the `name` form field (an array of { id, strength, copies }) and
// returns the visual ref mods with their 1-based index. Only the position is
// exposed — the mod's name/description is never sent to the chat.
export const useRefModsForChat = (name: string) => {
    const entries = useWatch({
        name,
    }) as Array<{ id?: string; skip_chat?: boolean }> | undefined;
    const modIds = (entries ?? []).map((e) =>
        typeof e?.id === 'string' ? e.id : undefined,
    );
    const modsById = useRefModMeta(modIds);

    const result: ChatRefMod[] = [];
    let index = 0;
    (entries ?? []).forEach((entry) => {
        const id = typeof entry?.id === 'string' ? entry.id : undefined;
        if (!id) return;
        // Skipped-for-chat assets are dropped here too, so the 1-based index
        // (used to build the `refmods=` line) stays aligned with the attached
        // thumbnails, which ChatComponent filters the same way.
        if (entry?.skip_chat) return;
        const mod = modsById[id];
        if (mod?.kind === 'audio') return;
        index += 1;
        result.push({
            index,
            kind: mod?.kind === 'image' ? 'image' : 'video',
        });
    });
    return result;
};

// Builds the `refmods=` line for the first message: a comma-separated list of
// the 1-based image positions of the visual ref mods (for example "1, 2").
// No name or description — that is personal info and must stay out of the
// chat. `offset` shifts the positions (0 when ref mods come first, or the
// number of images attached before them).
export const formatRefModsLine = (
    refMods: ChatRefMod[],
    offset = 0,
): string => refMods.map((m) => offset + m.index).join(', ');

// Bring a ref mod's safetensors back onto the server: reuse the stored name if
// the file is still there, otherwise re-upload the local IndexedDB backup and
// remember the new name. Returns the filename to use, or undefined if there is
// no local backup to restore from.
export const ensureRefModOnServer = async (
    id: string,
    apiUrl: string,
): Promise<string | undefined> => {
    const file = await db.refModFiles
        .where({ mod: id })
        .and((f: any) => f.fileType === 'safetensors')
        .first();
    if (!file) return undefined;
    const mod = await db.refMods.get(id);
    const name = await ensureFileOnServer(
        new File([file.file], file.filename, { type: 'application/octet-stream' }),
        mod?.serverFilename,
        apiUrl,
    );
    if (mod && mod.serverFilename !== name) {
        await db.refMods.update(id, { serverFilename: name });
    }
    return name;
};

// Proactively restore the field's ref mods to the server on load, mirroring
// FileUpload's auto-recovery. A ref mod's thumbnail is a local IndexedDB
// backup, so it never fails to render and the server file would otherwise stay
// missing until the next generation. Keyed on the ids, so it runs on mount and
// whenever the active set changes. Skipped entries are ignored (the generation
// handler treats them as absent too).
export const useRefModReupload = (name: string) => {
    const apiUrl = useApiURL();
    const entries = useWatch({
        name,
    }) as Array<{ id?: string; skip?: boolean }> | undefined;
    const modIds = activeEntries(entries).map((e) =>
        typeof e?.id === 'string' ? e.id : undefined,
    );
    const idsKey = modIds.map((id) => id ?? '').join(',');
    // Latest-ids ref so the effect can read the current ids without listing the
    // (unstable) array as a dependency; the reactive key is idsKey.
    const idsRef = useRef(modIds);
    idsRef.current = modIds;
    // Cap re-upload attempts per mod so a persistently failing upload (e.g. the
    // server rejecting it) cannot loop — mirrors the useReuploadLost guard.
    const attempts = useRef<Record<string, number>>({});

    useEffect(() => {
        if (!idsKey || !apiUrl) return;
        (async () => {
            for (const id of idsRef.current) {
                if (!id) continue;
                if ((attempts.current[id] || 0) > 2) continue;
                const mod = await db.refMods.get(id);
                if (!mod?.serverFilename) continue;
                // Still on the server: nothing to do (and we avoid loading the
                // potentially large local backup for no reason).
                if (await fileOnServer(mod.serverFilename, apiUrl)) continue;
                // Gone (e.g. the server was cleared): re-upload the backup.
                attempts.current[id] = (attempts.current[id] || 0) + 1;
                try {
                    await ensureRefModOnServer(id, apiUrl);
                } catch {
                    // The attempt cap above stops a re-running loop.
                }
            }
        })();
    }, [idsKey, apiUrl]);
};
