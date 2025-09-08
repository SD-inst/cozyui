import { useCallback, useContext } from 'react';
import { FilterContext } from '../contexts/FilterContext';
import { FilterType } from '../contexts/filterType';
import { db, markEnum } from './db';

type trFilterFunc = (param?: any) => Promise<number[]>;

const wordFilter: trFilterFunc = (param: string) => {
    return db.taskResults.where('words').startsWith(param).primaryKeys();
};
const pinFilter: trFilterFunc = () => {
    return db.taskResults.where('mark').equals(markEnum.PINNED).primaryKeys();
};

const typeFilter: trFilterFunc = (param: string) => {
    return db.taskResults.where('type').equals(param).primaryKeys();
};

export const pkFromFilter = async (
    filter: FilterType,
    additionalFilters?: trFilterFunc[] | trFilterFunc
) => {
    const filter_words = filter.prompt
        .split(' ')
        .map((w) => w.toLowerCase())
        .filter((w) => !!w);
    const pksP = []; // primary key promises
    if (filter_words.length) {
        pksP.push(...filter_words.map((w) => wordFilter(w)));
    }
    if (filter.pinned) {
        pksP.push(pinFilter());
    }
    if (filter.type) {
        console.log('Filtering by type:', filter);
        pksP.push(typeFilter(filter.type));
    }
    if (additionalFilters) {
        const af = Array.isArray(additionalFilters)
            ? additionalFilters
            : [additionalFilters];
        pksP.push(...af.map((f) => f()));
    }
    // array of resolved primary key arrays
    // (one array of matches per filter/word)
    const pks = await Promise.all(pksP);
    // intersection of all keys
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
