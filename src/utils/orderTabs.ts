export type TabOrder = {
    groups: string[];
    tabs: { [group: string]: string[] };
};

export const arrayMove = <T>(array: T[], from: number, to: number): T[] => {
    const result = [...array];
    result.splice(to, 0, result.splice(from, 1)[0]);
    return result;
};

/**
 * Merge a saved order with the current list of groups and tabs.
 * - Items present in the saved order are kept in that order.
 * - New items (present in the current list but not in the saved order) are
 *   appended at the end, in the order they appear in the current list.
 * - Items that were removed (present in the saved order but not in the
 *   current list) are dropped.
 * Returns the default order when no saved order is available.
 */
export const mergeOrder = (
    savedOrder: TabOrder | undefined,
    allGroups: string[],
    allTabsByGroup: { [group: string]: string[] },
): TabOrder => {
    if (!savedOrder || !savedOrder.groups?.length) {
        return {
            groups: [...allGroups],
            tabs: Object.fromEntries(
                allGroups.map((g) => [g, [...(allTabsByGroup[g] ?? [])]]),
            ),
        };
    }
    const resultGroups: string[] = [];
    for (const g of savedOrder.groups) {
        if (allGroups.includes(g) && !resultGroups.includes(g)) {
            resultGroups.push(g);
        }
    }
    for (const g of allGroups) {
        if (!savedOrder.groups.includes(g) && !resultGroups.includes(g)) {
            resultGroups.push(g);
        }
    }
    const resultTabs: { [group: string]: string[] } = {};
    for (const g of resultGroups) {
        const allTabs = allTabsByGroup[g] ?? [];
        const savedTabs = savedOrder.tabs?.[g] ?? [];
        const resultTabList: string[] = [];
        for (const t of savedTabs) {
            if (allTabs.includes(t) && !resultTabList.includes(t)) {
                resultTabList.push(t);
            }
        }
        for (const t of allTabs) {
            if (!savedTabs.includes(t) && !resultTabList.includes(t)) {
                resultTabList.push(t);
            }
        }
        resultTabs[g] = resultTabList;
    }
    return { groups: resultGroups, tabs: resultTabs };
};

/**
 * Move an item from its current position to the position of another item.
 * Mirrors dnd-kit's `arrayMove` semantics: the dragged item ends up at the
 * target item's index, and the target item shifts down.
 */
export const reorderItems = (
    currentItems: string[],
    activeId: string,
    overId: string,
): string[] => {
    const from = currentItems.indexOf(activeId);
    const to = currentItems.indexOf(overId);
    if (from === -1 || to === -1 || from === to) {
        return currentItems;
    }
    return arrayMove(currentItems, from, to);
};
