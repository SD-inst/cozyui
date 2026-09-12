/**
 * How many of `requested` new array slots can still be added, given the current
 * length and a max cap (-1 means unlimited). Used to distribute a multi-file
 * drop into fresh `ArrayInput` slots without exceeding the cap.
 */
export const roomForNewSlots = (
    currentLength: number,
    max: number,
    requested: number,
): number => {
    if (max === -1) {
        return requested;
    }
    return Math.min(Math.max(0, max - currentLength), requested);
};

/**
 * The subset of array entries that participate in generation. `ArrayInput`
 * gives every item a universal `skip` flag (the "effective value" is derived
 * here, never stored as a separate copy), so consumers filter to the active
 * entries before numbering slots or building nodes. A missing/false `skip`
 * counts as active, so pre-existing items without the flag are unaffected.
 */
export const activeEntries = <T extends { skip?: boolean }>(
    entries: T[] | undefined | null,
): T[] => (entries ?? []).filter((e) => !e?.skip);
