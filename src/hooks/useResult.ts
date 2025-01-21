import { get } from 'lodash';
import { useAppSelector } from '../redux/hooks';
import { useCurrentTab } from '../components/WorkflowTabs';

const emptyResult = {
    id: '',
    type: '',
};

export const useResult = (tabOverride?: string) => {
    const resultStore = useAppSelector((s) => s.result);
    const current_tab = useCurrentTab(tabOverride);
    const { id, type } = useAppSelector((s) =>
        get(s, `config.tabs["${current_tab}"].result`, emptyResult)
    );
    return get(resultStore, `["${id}"]["${type}"]`, []) as any[];
};
