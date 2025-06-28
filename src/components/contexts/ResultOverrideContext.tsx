import { createContext, useContext } from 'react';

export type resultOptionsType = {
    id?: string;
    type?: string;
};

export type overrideType = resultOptionsType & { index?: number };

export type resultsOptionsType = resultOptionsType | resultOptionsType[];

export const defaultValue: overrideType = {};

export const ResultOverrideContext = createContext(defaultValue);

export const useResultOverride = (override?: overrideType) => {
    const result = useContext(ResultOverrideContext);
    if (override) {
        return override;
    }
    return result;
};
