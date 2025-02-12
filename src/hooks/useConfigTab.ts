import { get } from 'lodash';
import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';
import { tabConfigType } from '../redux/config';

const emptyParams = {
    api: '',
    controls: {},
    result: {},
    handler_options: {
        lora_params: {},
        node_params: {},
    },
};

export const useConfigTab = (tabOverride?: string) => {
    const current_tab = useTabName(tabOverride);
    return useAppSelector((s) =>
        get(s, ['config', 'tabs', current_tab], emptyParams)
    ) as tabConfigType;
};
