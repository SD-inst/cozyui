import { useState } from 'react';
import { FilterContext } from './FilterContext';

export const FilterContextProvider = ({ ...props }) => {
    const [filter, setFilter] = useState({ prompt: '', pinned: false });
    const setPrompt = (prompt: string) => {
        setFilter((f) => ({ ...f, prompt }));
    };
    const setPinned = (pinned: boolean) => {
        setFilter((f) => ({ ...f, pinned }));
    };
    return (
        <FilterContext.Provider value={{ ...filter, setPinned, setPrompt }}>
            {props.children}
        </FilterContext.Provider>
    );
};
