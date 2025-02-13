import { createContext, useContext } from 'react';

export type resultOptionsType = {
    id?: string;
    type?: string;
};

export const defaultValue: resultOptionsType = {};

export const ResultOverrideContext = createContext(defaultValue);

export const useResultOverride = () => useContext(ResultOverrideContext);
