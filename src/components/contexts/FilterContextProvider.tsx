import { useState } from 'react';
import { FilterContext } from './FilterContext';

export const FilterContextProvider = ({ ...props }) => {
    const [filter, setFilter] = useState({
        prompt: '',
        pinned: false,
        type: '',
        model: '',
        dateFrom: '',
        dateTo: '',
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
    const setModel = (model: string) => {
        setFilter((f) => ({ ...f, model }));
    };
    const setDateFrom = (dateFrom: string) => {
        setFilter((f) => ({ ...f, dateFrom }));
    };
    const setDateTo = (dateTo: string) => {
        setFilter((f) => ({ ...f, dateTo }));
    };
    const isEmpty = () =>
        !filter.pinned &&
        !filter.prompt &&
        !filter.type &&
        !filter.model &&
        !filter.dateFrom &&
        !filter.dateTo;
    return (
        <FilterContext.Provider
            value={{
                ...filter,
                setPinned,
                setPrompt,
                setType,
                setModel,
                setDateFrom,
                setDateTo,
                isEmpty,
            }}
        >
            {props.children}
        </FilterContext.Provider>
    );
};
