import { PropsWithChildren, useState } from 'react';
import { TabContext, tabContextdefaultValue } from './TabContext';

export const TabContextProvider = ({
    value: v,
    ...props
}: { value: any } & PropsWithChildren) => {
    const [value, setValue] = useState(tabContextdefaultValue);
    return (
        <TabContext.Provider value={{ ...value, ...v, setValue }}>
            {props.children}
        </TabContext.Provider>
    );
};
