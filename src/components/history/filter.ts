import { useCallback, useContext } from 'react';
import { FilterType } from '../contexts/filterType';
import { db, markEnum, TaskResult } from './db';
import { FilterContext } from '../contexts/FilterContext';

export const pkFromFilter = async (
    filter: FilterType,
    additionalFilter?: (t: TaskResult) => boolean
) => {
    const filter_words = filter.prompt.split(' ').map((w) => w.toLowerCase());
    const pks = await Promise.all(
        filter_words.map((w) => {
            let coll = null;
            if (w) {
                coll = db.taskResults
                    .where('words')
                    .startsWith(w)
                    .filter((t) =>
                        filter.pinned ? t.mark === markEnum.PINNED : true
                    );
            } else {
                if (filter.pinned) {
                    coll = db.taskResults.where('mark').equals(markEnum.PINNED);
                } else {
                    coll = db.taskResults.toCollection();
                }
            }
            if (additionalFilter) {
                coll = coll.filter(additionalFilter);
            }
            return coll.primaryKeys();
        })
    );
    const pk_x = pks.reduce((a, b) => {
        const set = new Set(b);
        return a.filter((pk) => set.has(pk));
    });
    return pk_x;
};

export const usePkFromFilter = () => {
    const filter = useContext(FilterContext);
    return useCallback(
        (f: Parameters<typeof pkFromFilter>[1]) => pkFromFilter(filter, f),
        [filter]
    );
};
