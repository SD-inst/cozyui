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
        isEmpty: () => boolean;
    }
>({
    prompt: '',
    pinned: false,
    type: '',
    model: '',
    dateFrom: '',
    dateTo: '',
    setPrompt: () => {},
    setPinned: () => {},
    setType: () => {},
    setModel: () => {},
    setDateFrom: () => {},
    setDateTo: () => {},
    isEmpty: () => true,
});
