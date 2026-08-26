import { useEventCallback } from '@mui/material';
import { useContext } from 'react';
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

const modelFilter: trFilterFunc = (param: string) => {
    return db.taskResults.where('model').equals(param).primaryKeys();
};

const dateFilter: trFilterFunc = (param: { from?: number; to?: number }) => {
    if (param.from !== undefined && param.to !== undefined) {
        return db.taskResults
            .where('timestamp')
            .between(param.from, param.to, true, true)
            .primaryKeys();
    } else if (param.from !== undefined) {
        return db.taskResults.where('timestamp').aboveOrEqual(param.from).primaryKeys();
    } else if (param.to !== undefined) {
        return db.taskResults.where('timestamp').belowOrEqual(param.to).primaryKeys();
    }
    return Promise.resolve([]);
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
        pksP.push(typeFilter(filter.type));
    }
    if (filter.model) {
        pksP.push(modelFilter(filter.model));
    }
    if (filter.dateFrom || filter.dateTo) {
        const from = filter.dateFrom
            ? new Date(filter.dateFrom + 'T00:00:00').getTime()
            : undefined;
        const to = filter.dateTo
            ? new Date(filter.dateTo + 'T23:59:59').getTime()
            : undefined;
        pksP.push(dateFilter({ from, to }));
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
    return useEventCallback((f: Parameters<typeof pkFromFilter>[1]) =>
        pkFromFilter(filter, f)
    );
};
