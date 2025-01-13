import { createContext, Dispatch, SetStateAction, useContext } from 'react';

export const emptyStatus: status = {
    client_id: '',
    progress: {
        max: 0,
        min: 0,
        value: -1,
    },
    queue: 0,
    generationDisabled: false,
    result: {},
    setStatus: () => {},
    status: '',
};

export const StatusContext = createContext<status>(emptyStatus);

export type status = {
    client_id: string;
    result: {
        [id: string]: {
            [type: string]: any[];
        };
    };
    status: string;
    queue: number;
    progress: {
        min: number;
        max: number;
        value: number;
    };
    generationDisabled: boolean;
    setStatus: Dispatch<SetStateAction<status>>;
};

export const useResult = (id: string, type: string) => {
    const v = useContext(StatusContext);
    if (!v.result[id] || !v.result[id][type]) {
        return null;
    }
    return v.result[id][type];
};

export const useStatus = () => useContext(StatusContext);
