import { createContext, Dispatch } from 'react';
import { FilterType } from './filterType';

export const FilterContext = createContext<
    FilterType & {
        setPrompt: Dispatch<string>;
        setPinned: Dispatch<boolean>;
    }
>({
    prompt: '',
    pinned: false,
    setPrompt: () => {},
    setPinned: () => {},
});
