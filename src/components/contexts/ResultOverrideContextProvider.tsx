import { PropsWithChildren } from 'react';
import {
    defaultValue,
    overrideType,
    ResultOverrideContext
} from './ResultOverrideContext';

export const ResultOverrideContextProvider = ({
    value,
    ...props
}: {
    value?: Partial<overrideType>;
} & PropsWithChildren) => (
    <ResultOverrideContext.Provider value={{ ...defaultValue, ...value }}>
        {props.children}
    </ResultOverrideContext.Provider>
);
