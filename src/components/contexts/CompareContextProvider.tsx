import { PropsWithChildren, useState } from 'react';
import {
    CompareContext,
    CompareType,
    defaultCompareValue,
} from './CompareContext';

export const CompareContextProvider = ({
    value,
    ...props
}: {
    value?: CompareType;
} & PropsWithChildren) => {
    const [compare, setCompare] = useState<CompareType>(defaultCompareValue);
    return (
        <CompareContext.Provider value={{ ...compare, setCompare, ...value }}>
            {props.children}
        </CompareContext.Provider>
    );
};
