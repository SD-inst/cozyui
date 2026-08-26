import { createContext, Dispatch } from 'react';
import { FilterType } from './filterType';

export const FilterContext = createContext<
    FilterType & {
        setPrompt: Dispatch<string>;
        setPinned: Dispatch<boolean>;
        setType: Dispatch<string>;
        setModel: Dispatch<string>;
        setDateFrom: Dispatch<string>;
        setDateTo: Dispatch<string>;
        setGroup: Dispatch<string>;
        setTab: Dispatch<string>;
        isEmpty: () => boolean;
    }
>({
    prompt: '',
    pinned: false,
    type: '',
    model: '',
    dateFrom: '',
    dateTo: '',
    group: '',
    tab: '',
    setPrompt: () => {},
    setPinned: () => {},
    setType: () => {},
    setModel: () => {},
    setDateFrom: () => {},
    setDateTo: () => {},
    setGroup: () => {},
    setTab: () => {},
    isEmpty: () => true,
});
