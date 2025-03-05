import { createContext, useContext } from 'react';

export type resultOptionsType = {
    id?: string;
    type?: string;
};

export type overrideType = resultOptionsType & { index?: number };

export type resultsOptionsType = resultOptionsType | resultOptionsType[];

export const defaultValue: overrideType = {};

export const ResultOverrideContext = createContext(defaultValue);

export const useResultOverride = () => useContext(ResultOverrideContext);
