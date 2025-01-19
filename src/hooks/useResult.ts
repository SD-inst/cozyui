import { get } from 'lodash';
import { useAppSelector } from '../redux/hooks';

export const useResult = (tabOverride?: string) => {
    const resultStore = useAppSelector((s) => s.result);
    const current_tab = tabOverride || useAppSelector((s) => s.tab.current_tab);
    const { id, type } = useAppSelector((s) =>
        get(s, `config.tabs["${current_tab}"].result`, {
            id: '',
            type: '',
        })
    );
    return get(resultStore, `["${id}"]["${type}"]`, []) as any[];
};
