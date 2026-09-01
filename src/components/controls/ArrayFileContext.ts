import { createContext, useContext } from 'react';

/**
 * Per-slot context that an `ArrayInput` provides to the controls rendered
 * inside each slot. Lets a `FileUpload` know it lives inside an array and how
 * to append new slots when the user drops several files at once.
 */
export type ArrayFileContextType = {
    /** The array field name (e.g. "ref_images"). */
    name: string;
    /** This slot's index in the array. */
    index: number;
    /** Maximum number of slots, or -1 for unlimited. */
    max: number;
    /**
     * Append new slots, each partial entry merged over the default template,
     * capped by `max`. Returns how many slots were actually added.
     */
    appendSlots: (entries: Record<string, any>[]) => number;
};

export const ArrayFileContext = createContext<ArrayFileContextType | null>(
    null,
);

export const useArrayFileContext = () => useContext(ArrayFileContext);
