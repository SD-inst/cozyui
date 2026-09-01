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
