import { get, merge } from 'lodash';
import {
    overrideType,
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

export const useResultParam = (override?: overrideType) => {
    const tab_name = useTabName();
    const result = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'result'], emptyResultParam)
    );
    const { index, ...overrideCtx } = useResultOverride(override);
    if (Array.isArray(result)) {
        return merge({}, result[index || 0], overrideCtx);
    }
    return merge({}, result, overrideCtx);
};

export const useResult = (override?: overrideType) => {
    const tab_name = useTabName();
    const result = useAppSelector((s) => s.tab.result);
    const { id, type } = useResultParam(override);
    if (!id || !type) {
        return emptyResult;
    }
    return get(result, [tab_name, id, type], emptyResult) as any[];
};
