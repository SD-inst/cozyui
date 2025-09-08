import { useState } from 'react';
import { FilterContext } from './FilterContext';

export const FilterContextProvider = ({ ...props }) => {
    const [filter, setFilter] = useState({
        prompt: '',
        pinned: false,
        type: '',
    });
    const setPrompt = (prompt: string) => {
        setFilter((f) => ({ ...f, prompt }));
    };
    const setPinned = (pinned: boolean) => {
        setFilter((f) => ({ ...f, pinned }));
    };
    const setType = (type: string) => {
        setFilter((f) => ({ ...f, type }));
    };
    const isEmpty = () => !filter.pinned && !filter.prompt && !filter.type;
    return (
        <FilterContext.Provider
            value={{ ...filter, setPinned, setPrompt, setType, isEmpty }}
        >
            {props.children}
        </FilterContext.Provider>
    );
};
