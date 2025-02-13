import { PropsWithChildren } from 'react';
import {
    defaultValue,
    resultOptionsType,
    ResultOverrideContext,
} from './ResultOverrideContext';

export const ResultOverrideContextProvider = ({
    value,
    ...props
}: {
    value?: Partial<resultOptionsType>;
} & PropsWithChildren) => (
    <ResultOverrideContext.Provider value={{ ...defaultValue, ...value }}>
        {props.children}
    </ResultOverrideContext.Provider>
);
