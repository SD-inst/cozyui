import { get, merge } from 'lodash';
import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';

const emptyResultParam = {
    id: '',
    type: '',
};

const emptyResult: any[] = [];

type resultOptions = {
    tab_override?: string;
    id?: string;
    type?: string;
};

export const useResultParam = (options?: resultOptions) => {
    const { tab_override, ...rest } = options || {};
    const tab_name = useTabName(tab_override);
    const result = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'result'], emptyResultParam)
    );
    return merge({}, result, rest);
};

export const useResult = (options?: resultOptions) => {
    const tab_name = useTabName();
    const result = useAppSelector((s) => s.tab.result);
    const { id, type } = useResultParam(options);
    return get(result, [tab_name, id, type], emptyResult) as any[];
};
