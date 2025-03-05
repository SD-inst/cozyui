import { get, merge } from 'lodash';
import {
    resultsOptionsType,
    useResultOverride,
} from '../components/contexts/ResultOverrideContext';
import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';

export const emptyResultParam: resultsOptionsType = {
    id: '',
    type: '',
};

const emptyResult: any[] = [];

export const useResultParam = () => {
    const tab_name = useTabName();
    const result = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'result'], emptyResultParam)
    );
    const { index, ...override } = useResultOverride();
    if (Array.isArray(result)) {
        return merge({}, result[index || 0], override);
    }
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
