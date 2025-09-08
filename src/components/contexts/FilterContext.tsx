import { createContext, Dispatch } from 'react';
import { FilterType } from './filterType';

export const FilterContext = createContext<
    FilterType & {
        setPrompt: Dispatch<string>;
        setPinned: Dispatch<boolean>;
        setType: Dispatch<string>;
        isEmpty: () => boolean;
    }
>({
    prompt: '',
    pinned: false,
    type: '',
    setPrompt: () => {},
    setPinned: () => {},
    setType: () => {},
    isEmpty: () => true,
});
