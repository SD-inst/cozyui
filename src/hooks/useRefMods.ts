import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { db, RefMod } from '../components/history/db';

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

// Returns RefMod[] parallel to `modIds` (each entry RefMod | undefined).
// The reactive dependency is idsKey (a stable string derived from the ids), so
// the query only re-runs when the set/order of ids changes — mirroring
// useModThumbURLs. The latest-ids ref lets the effect read the current values
// without listing the (unstable) array as a dependency.
export const useRefModMeta = (modIds: Array<string | undefined>) => {
    const idsKey = modIds.map((id) => id ?? '').join(',');
    const [mods, setMods] = useState<Array<RefMod | undefined>>([]);
    const idsRef = useRef(modIds);
    idsRef.current = modIds;

    useEffect(() => {
        let cancelled = false;
        if (!idsKey) {
            setMods([]);
            return;
        }
        Promise.all(
            idsRef.current.map((id) => (id ? db.refMods.get(id) : undefined)),
        ).then((result) => {
            if (!cancelled) {
                setMods(result);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [idsKey]);

    return mods;
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
    const mods = useRefModMeta(modIds);

    const result: ChatRefMod[] = [];
    let index = 0;
    (entries ?? []).forEach((entry, i) => {
        const id = modIds[i];
        if (!id) return;
        // Skipped-for-chat assets are dropped here too, so the 1-based index
        // (used to build the `refmods=` line) stays aligned with the attached
        // thumbnails, which ChatComponent filters the same way.
        if (entry?.skip_chat) return;
        const mod = mods[i];
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
