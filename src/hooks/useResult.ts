import { get } from 'lodash';
import { useAppSelector } from '../redux/hooks';
import { useCurrentTab } from '../components/contexts/TabContext';

const emptyResult = {
    id: '',
    type: '',
};

export const useResult = (options?: {
    tabOverride?: string;
    id?: string;
    type?: string;
}) => {
    const resultStore = useAppSelector((s) => s.result);
    const current_tab = useCurrentTab(options?.tabOverride);
    const { id: ids, type: types } = useAppSelector((s) =>
        get(s, `config.tabs["${current_tab}"].result`, emptyResult)
    );
    return get(
        resultStore,
        `["${options?.id || ids}"]["${options?.type || types}"]`,
        []
    ) as any[];
};
