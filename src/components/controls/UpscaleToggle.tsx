import { useEventCallback } from '@mui/material';
import { get } from 'lodash';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { delResult } from '../../redux/tab';
import { useRegisterHandler, useTabName } from '../contexts/TabContext';
import { ToggleInput, ToggleInputProps } from './ToggleInput';

export const UpscaleToggle = ({ ...props }: ToggleInputProps) => {
    const tab_name = useTabName();
    const webp_node_id = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'result', 1, 'id'], null)
    );
    const dispatch = useAppDispatch();
    const handler = useEventCallback((api: any, val: boolean) => {
        if (val || !webp_node_id) {
            return;
        }
        delete api[webp_node_id];
        dispatch(delResult({ tab_name, id: webp_node_id }));
    });
    useRegisterHandler({ name: props.name, handler });
    return <ToggleInput tooltip='upscale' {...props} />;
};
