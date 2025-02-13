import { get } from 'lodash';
import { useContext } from 'react';
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

export const useAPI = () => {
    const { api, tab_name } = useContext(TabContext);
    return useAppSelector((s) =>
        get(s, ['config', 'tabs', api || tab_name], emptyParams)
    ) as tabConfigType;
};
