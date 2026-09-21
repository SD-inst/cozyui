import { arrayMove } from '@dnd-kit/sortable';

/**
 * Reorder an array of `{ id }` items by moving the item with `activeId` to the
 * position of the item with `overId`. Like dnd-kit's `arrayMove` but keyed on
 * the stable item id rather than a raw index, so it stays correct across
 * renders. Returns the same array (unchanged) when either id is not found.
 */
export const reorderById = <T extends { id: string }>(
    values: T[],
    activeId: string,
    overId: string,
): T[] => {
    const oldIndex = values.findIndex((v) => v.id === activeId);
    const newIndex = values.findIndex((v) => v.id === overId);
    if (oldIndex < 0 || newIndex < 0) {
        return values;
    }
    return arrayMove(values, oldIndex, newIndex);
};
