import { get } from 'lodash';
import { useAppSelector } from '../redux/hooks';
import { useCurrentTab } from '../components/contexts/TabContext';

const emptyResult = {
    id: '',
    type: '',
};

export const useResultParam = (tabOverride?: string) => {
    const current_tab = useCurrentTab(tabOverride);
    return useAppSelector((s) =>
        get(s, `config.tabs["${current_tab}"].result`, emptyResult)
    );
};

export const useResult = (options?: {
    tabOverride?: string;
    id?: string;
    type?: string;
}) => {
    const resultStore = useAppSelector((s) => s.result);
    const { id: ids, type: types } = useResultParam(options?.tabOverride);
    return get(
        resultStore,
        `["${options?.id || ids}"]["${options?.type || types}"]`,
        []
    ) as any[];
};
