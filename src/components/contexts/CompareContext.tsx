import { createContext, Dispatch, SetStateAction } from 'react';

export type CompareType = {
    jsonA?: any;
    jsonB?: any;
    selected_id?: number;
    A_id?: number;
    B_id?: number;
    open: boolean;
    setCompare: Dispatch<SetStateAction<CompareType>>;
};

export const defaultCompareValue = {
    open: false,
    setCompare: () => {},
};

export const CompareContext = createContext<CompareType>(defaultCompareValue);
