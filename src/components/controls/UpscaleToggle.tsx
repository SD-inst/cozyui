import { FormControlLabel, Switch, SwitchProps } from '@mui/material';
import { get } from 'lodash';
import { useCallback } from 'react';
import { useController } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { useRegisterHandler, useTabName } from '../contexts/TabContext';
import { useTranslate } from '../../i18n/I18nContext';
import { delResult } from '../../redux/tab';

export const UpscaleToggle = ({
    label,
    ...props
}: {
    name: string;
    label?: string;
} & SwitchProps) => {
    const tr = useTranslate();
    const {
        field: { value, ...field },
    } = useController({ name: props.name, defaultValue: false });
    const tab_name = useTabName();
    const webp_node_id = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'result', 1, 'id'], null)
    );
    const dispatch = useAppDispatch();
    const handler = useCallback(
        (api: any, val: boolean) => {
            if (val || !webp_node_id) {
                return;
            }
            delete api[webp_node_id];
            dispatch(delResult({ tab_name, id: webp_node_id }));
        },
        [dispatch, tab_name, webp_node_id]
    );
    useRegisterHandler({ name: props.name, handler });
    return (
        <FormControlLabel
            sx={{ mt: 1 }}
            label={label ? tr(label) : tr('controls.' + props.name)}
            control={<Switch checked={value} {...field} />}
        />
    );
};
