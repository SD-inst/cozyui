import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo, useState } from 'react';
import { db } from '../components/history/db';
import { settings } from './settings';
import { mergeOrder, TabOrder } from '../utils/orderTabs';

/**
 * Loads the saved tab order from IndexedDB, merges it with the current list
 * of groups/tabs, and exposes save/reset helpers.
 *
 * `allGroups` and `allTabsByGroup` are the full (unfiltered) lists in their
 * default (code) order, so that hidden and newly-added tabs keep a stable
 * position in the saved order.
 *
 * The saved order is mirrored in local state and updated synchronously on
 * every drag, so the displayed order changes in the same render (no snap-back
 * flash) while the IndexedDB write completes in the background.
 */
export const useTabOrder = (
    allGroups: string[],
    allTabsByGroup: { [group: string]: string[] },
) => {
    // Reactive read from IndexedDB — initial load + external changes (reset)
    const dbValue = useLiveQuery(async () => {
        const row = await db.settings.get(settings.tab_order);
        return row ? (JSON.parse(row.value) as TabOrder) : undefined;
    }, []);

    // Local override set synchronously on drag (takes precedence over dbValue)
    const [localOverride, setLocalOverride] = useState<TabOrder | null>(null);

    const saved = localOverride ?? dbValue;

    const order = useMemo(
        () => mergeOrder(saved, allGroups, allTabsByGroup),
        [saved, allGroups, allTabsByGroup],
    );

    const saveOrder = useCallback(
        (groups: string[], tabs: { [group: string]: string[] }) => {
            const next: TabOrder = { groups, tabs };
            setLocalOverride(next);
            db.settings.put({
                name: settings.tab_order,
                value: JSON.stringify(next),
            });
        },
        [],
    );

    const resetOrder = useCallback(() => {
        setLocalOverride(null);
        db.settings.delete(settings.tab_order);
    }, []);

    return { order, saved, saveOrder, resetOrder };
};
