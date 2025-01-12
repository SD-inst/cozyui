import { createContext, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useGet } from '../hooks/useGet';

const TabContext = createContext({});

type Tabs = {
    [name: string]: {
        workflow: string;
        api: string;
        controls: {
            [control: string]: {
                id: string;
                field: string;
            };
        };
    };
};

export const useTabContext = () => useContext<Tabs>(TabContext);

export const TabContextProvider = ({ ...props }) => {
    const { data, error, isError, isSuccess } = useGet('tabs.json');
    useEffect(() => {
        if (isSuccess) {
            toast.success('Got tabs');
            return;
        }
        if (!isError) {
            return;
        }
        toast.error('Error getting tabs: ' + error);
    }, [isError, error, isSuccess]);
    return (
        <TabContext.Provider value={isSuccess ? data : {}}>
            {props.children}
        </TabContext.Provider>
    );
};
