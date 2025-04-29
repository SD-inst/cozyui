import { Autocomplete, AutocompleteProps, Box, TextField } from '@mui/material';
import { get } from 'lodash';
import { useController } from 'react-hook-form';
import { useListChoices } from '../../hooks/useListChoices';
import { useTranslate } from '../../i18n/I18nContext';
import { useAppSelector } from '../../redux/hooks';
import { useCtrlEnter, useRegisterHandler } from '../contexts/TabContext';
import { ModelOption } from './ModelOption';
import { ObjectReloadButton } from './ObjectReloadButton';
import { useCallback } from 'react';
import { controlType } from '../../redux/config';

const emptyFilter = '';

type valueType = {
    id: string;
    label: string;
};

export const ModelSelectAutocomplete = ({
    sx,
    type,
    ...props
}: {
    name: string;
    type: string;
    label?: string;
} & Omit<
    AutocompleteProps<valueType, false, any, any>,
    'renderInput' | 'options'
>) => {
    const tr = useTranslate();
    const ceHanler = useCtrlEnter();
    const ctl = useController({
        name: props.name,
        defaultValue: [],
    });
    const loras = useListChoices({
        component: 'UNETLoader',
        field: 'unet_name',
        index: 0,
    });
    const filter = useAppSelector((s) =>
        get(s, ['config', 'loras', type, 'filter'], emptyFilter)
    );
    const opts = loras
        .filter((l) => l.includes(filter))
        .map((l) => {
            const label = l.slice(
                l.lastIndexOf('/') + 1,
                l.lastIndexOf('.safetensors')
            );
            return {
                label,
                id: l,
            };
        });
    const handler = useCallback(
        (api: any, value: valueType, control?: controlType) => {
            if (!value || !control || !control.node_id) {
                return;
            }
            api[control.node_id].inputs[control.field] = value.id;
        },
        []
    );
    useRegisterHandler({ name: props.name, handler });
    return (
        <Box display='flex' position='relative' gap={1} sx={sx}>
            <Autocomplete
                onKeyUp={ceHanler}
                fullWidth
                {...ctl.field}
                onChange={(_, v) => {
                    if (!v || typeof v === 'string') {
                        return;
                    }
                    ctl.field.onChange(v);
                }}
                {...props}
                getOptionLabel={(v) =>
                    typeof v === 'string' ? v : v.label || ''
                }
                options={opts}
                renderInput={(params) => (
                    <>
                        <TextField
                            label={tr(`controls.${props.name}`)}
                            {...params}
                        />
                    </>
                )}
                renderOption={(props, option, _, ownerState) => {
                    const { key, ...optionProps } = props;
                    return (
                        <ModelOption
                            key={key}
                            {...optionProps}
                            value={ownerState.getOptionLabel(option)}
                            id={option.id}
                        />
                    );
                }}
            />
            <ObjectReloadButton />
        </Box>
    );
};
