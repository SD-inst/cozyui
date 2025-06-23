import { Collection } from 'dexie';
import { useCallback, useContext } from 'react';
import { FilterContext } from '../contexts/FilterContext';
import { FilterType } from '../contexts/filterType';
import { db, markEnum, TaskResult } from './db';

type filterFunc<T extends Collection> = [
    (param: any) => T, // index
    (coll: T, param: any) => T // no index
];

type TRCollType = ReturnType<typeof db.taskResults.toCollection>;

type trFilterFunc = filterFunc<TRCollType>;

const wordFilter: trFilterFunc = [
    (param: string) => {
        return db.taskResults.where('words').startsWith(param);
    },
    (coll) => coll,
];

const pinFilter: trFilterFunc = [
    (param: boolean) => {
        if (param) {
            return db.taskResults.where('mark').equals(markEnum.PINNED);
        } else {
            return db.taskResults.toCollection();
        }
    },
    (coll: TRCollType, param: boolean) =>
        coll.filter((t) => (param ? t.mark === markEnum.PINNED : true)),
];

export const pkFromFilter = async (
    filter: FilterType,
    additionalFilter?: (t: TaskResult) => boolean
) => {
    const filter_words = filter.prompt
        .split(' ')
        .map((w) => w.toLowerCase())
        .filter((w) => !!w);
    const colls = (
        !filter_words.length
            ? [pinFilter[0](filter.pinned)]
            : filter_words.map((w) =>
                  pinFilter[1](wordFilter[0](w), filter.pinned)
              )
    ).map((coll) => (additionalFilter ? coll.filter(additionalFilter) : coll));
    const pks = await Promise.all(colls.map((c) => c.primaryKeys()));
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
