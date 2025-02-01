import { get, merge } from 'lodash';
import { useCurrentTab } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';

const emptyResult = {
    id: '',
    type: '',
};

export const useResultParam = (options?: {
    tabOverride?: string;
    id?: string;
    type?: string;
}) => {
    const { tabOverride, ...rest } = options || {};
    const current_tab = useCurrentTab(tabOverride);
    const result = useAppSelector((s) =>
        get(s, `config.tabs["${current_tab}"].result`, emptyResult)
    );
    return merge({}, result, rest);
};

export const useResult = (options?: {
    tabOverride?: string;
    id?: string;
    type?: string;
}) => {
    const resultStore = useAppSelector((s) => s.result);
    const { id, type } = useResultParam(options);
    return get(resultStore, `["${id}"]["${type}"]`, []) as any[];
};
