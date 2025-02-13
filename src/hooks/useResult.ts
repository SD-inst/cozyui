import { get, merge } from 'lodash';
import {
    resultOptionsType,
    useResultOverride,
} from '../components/contexts/ResultOverrideContext';
import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';

export const emptyResultParam: resultOptionsType = {
    id: '',
    type: '',
};

const emptyResult: any[] = [];

export const useResultParam = () => {
    const tab_name = useTabName();
    const result = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'result'], emptyResultParam)
    );
    const override = useResultOverride();
    return merge({}, result, override);
};

export const useResult = () => {
    const tab_name = useTabName();
    const result = useAppSelector((s) => s.tab.result);
    const { id, type } = useResultParam();
    if (!id || !type) {
        return emptyResult;
    }
    return get(result, [tab_name, id, type], emptyResult) as any[];
};
