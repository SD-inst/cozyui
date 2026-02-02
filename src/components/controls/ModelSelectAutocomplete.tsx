import {
    Autocomplete,
    AutocompleteProps,
    Box,
    TextField,
    useEventCallback,
} from '@mui/material';
import { get } from 'lodash';
import { useController } from 'react-hook-form';
import { useListChoices } from '../../hooks/useListChoices';
import { useTranslate } from '../../i18n/I18nContext';
import { controlType } from '../../redux/config';
import { useAppSelector } from '../../redux/hooks';
import { useCtrlEnter, useRegisterHandler } from '../contexts/TabContext';
import { ModelOption } from './ModelOption';
import { ObjectReloadButton } from './ObjectReloadButton';

const emptyFilter = '';

type valueType = {
    id: string;
    label: string;
};

export const ModelSelectAutocomplete = ({
    sx,
    type,
    component = 'UNETLoader',
    field = 'unet_name',
    previews = true,
    defaultValue = null,
    extraFilter,
    ...props
}: {
    name: string;
    type: string;
    label?: string;
    component?: string;
    field?: string;
    previews?: boolean;
    extraFilter?: (v: string) => boolean;
} & Omit<
    AutocompleteProps<valueType, false, any, any>,
    'renderInput' | 'options'
>) => {
    const tr = useTranslate();
    const ceHanler = useCtrlEnter();
    const ctl = useController({
        name: props.name,
        defaultValue,
    });
    const models = useListChoices({
        component,
        field,
        index: 0,
    });
    const filter = useAppSelector((s) =>
        get(s, ['config', 'loras', type, 'filter'], emptyFilter),
    );
    const opts = models
        .filter(
            (l) => l.includes(filter) && (extraFilter ? extraFilter(l) : true),
        )
        .map((l) => {
            const label = l.slice(l.lastIndexOf('/') + 1, l.lastIndexOf('.'));
            return {
                label,
                id: l,
            };
        });
    const optsIdx = Object.fromEntries(opts.map((o) => [o.id, o.label]));
    const handler = useEventCallback(
        (api: any, value: string, control: controlType) => {
            if (!value || !control.node_id) {
                return;
            }
            api[control.node_id].inputs[control.field] = value;
        },
    );
    useRegisterHandler({ name: props.name, handler });
    return (
        <Box
            display='flex'
            position='relative'
            flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
            justifyContent='center'
            gap={1}
            sx={sx}
        >
            <Autocomplete
                onKeyUp={ceHanler}
                fullWidth
                {...ctl.field}
                onChange={(_, v) => {
                    if (typeof v === 'string') {
                        ctl.field.onChange(v);
                    } else {
                        ctl.field.onChange(v ? v.id : null);
                    }
                }}
                {...props}
                getOptionLabel={(v) =>
                    typeof v === 'string' ? optsIdx[v] || v : v.label || ''
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
                            previews={previews}
                        />
                    );
                }}
            />
            <ObjectReloadButton />
        </Box>
    );
};
