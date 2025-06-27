import { get } from 'lodash';
import { useContext, useMemo } from 'react';
import { TabContext } from '../components/contexts/TabContext';
import { tabConfigType } from '../redux/config';
import { useAppSelector } from '../redux/hooks';

const emptyParams = {
    api: '',
    controls: {},
    result: {},
    handler_options: {
        lora_params: {},
        node_params: {},
    },
};

const emptyApi = {};

export const useAPI = () => {
    const { api, tab_name } = useContext(TabContext);
    return useAppSelector((s) =>
        get(s, ['config', 'tabs', api || tab_name], emptyParams)
    ) as tabConfigType;
};

type indexType = { [key: string]: string[] };

export const useFindNode = (nodeClass: string) => {
    const api = useAppSelector((s) => get(s, 'tab.api', emptyApi));
    const nodeIndex = useMemo(() => {
        const result: indexType = {};
        Object.keys(api).forEach((k) => {
            const nodeClass = api[k].class_type;
            if (!nodeClass) {
                return;
            }
            if (!result[nodeClass]) {
                result[nodeClass] = [k];
            } else {
                result[nodeClass].push(k);
            }
        });
        return result;
    }, [api]);
    return nodeIndex[nodeClass] && nodeIndex[nodeClass].length === 1
        ? nodeIndex[nodeClass]
        : null;
};
