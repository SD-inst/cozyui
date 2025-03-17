import { createContext } from 'react';
import { FilterType } from './filterType';

export const FilterContext = createContext<FilterType>({
    prompt: '',
    pinned: false,
});
