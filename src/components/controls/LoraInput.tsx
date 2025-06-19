import {
    Autocomplete,
    AutocompleteProps,
    AutocompleteRenderGetTagProps,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField
} from '@mui/material';
import { get } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { mergeType } from '../../api/mergeType';
import { getFreeNodeId } from '../../api/utils';
import { useAPI } from '../../hooks/useConfigTab';
import { useListChoices } from '../../hooks/useListChoices';
import { useTranslate } from '../../i18n/I18nContext';
import { loraDefaults } from '../../redux/config';
import { useAppSelector } from '../../redux/hooks';
import { useCtrlEnter, useRegisterHandler } from '../contexts/TabContext';
import { HelpButton } from './HelpButton';
import { ModelOption } from './ModelOption';
import { ObjectReloadButton } from './ObjectReloadButton';
import { SelectControl } from './SelectControl';

type valueType = {
    id: string;
    label: string;
    strength: number;
    merge: mergeType;
};

const LoraChip = ({
    getTagProps,
    index,
    value,
    onOK,
    hideMergeType = false,
}: {
    getTagProps: AutocompleteRenderGetTagProps;
    index: number;
    value: valueType;
    onOK: (strength: number, merge: mergeType) => void;
    hideMergeType?: boolean;
}) => {
    const tr = useTranslate();
    const { key, ...tagProps } = getTagProps({ index });
    const [open, setOpen] = useState(false);
    const [strength, setStrength] = useState('' + value.strength);
    const [merge, setMerge] = useState(value.merge);
    const ref = useRef<HTMLInputElement>(null);
    const handleOK = () => {
        onOK(parseFloat(strength) || 1, merge);
        setOpen(false);
    };
    useEffect(() => {
        if (!open) {
            return;
        }
        setStrength('' + value.strength);
        setMerge(value.merge);
        setTimeout(() => ref.current?.focus(), 100);
    }, [open, value.merge, value.strength]);
    return (
        <>
            <Chip
                variant='outlined'
                label={`${value.label}:${value.strength}`}
                key={key}
                onClick={() => setOpen(true)}
                sx={{
                    height: 'auto',
                    '& .MuiChip-label': {
                        display: 'block',
                        whiteSpace: 'normal',
                        wordBreak: 'break-all',
                    },
                }}
                {...tagProps}
            />
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>
                    {tr('controls.change_lora_merge_params')}
                </DialogTitle>
                <DialogContent
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                    <TextField
                        fullWidth
                        sx={{ mt: 1 }}
                        label={tr('controls.strength')}
                        value={strength}
                        type='number'
                        slotProps={{
                            htmlInput: { step: 0.05, min: -3, max: 3 },
                        }}
                        inputRef={ref}
                        onChange={(e) => setStrength(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleOK();
                            }
                            e.stopPropagation();
                        }}
                    />
                    {!hideMergeType && (
                        <SelectControl
                            label={'controls.merge_type'}
                            value={merge}
                            onChange={(e) =>
                                setMerge(e.target.value as mergeType)
                            }
                        >
                            <MenuItem value={mergeType.SINGLE}>
                                {tr('controls.merge_type_single')}
                            </MenuItem>
                            <MenuItem value={mergeType.DOUBLE}>
                                {tr('controls.merge_type_double')}
                            </MenuItem>
                            <MenuItem value={mergeType.FULL}>
                                {tr('controls.merge_type_full')}
                            </MenuItem>
                        </SelectControl>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleOK}>{tr('controls.ok')}</Button>
                    <Button onClick={() => setOpen(false)}>
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

const emptyFilter = '';
const emptyDefaults: loraDefaults = {};

export const LoraInput = ({
    append,
    sx,
    type,
    ...props
}: {
    name: string;
    type: string;
    label?: string;
    append?: valueType[];
} & Omit<
    AutocompleteProps<valueType, true, any, any>,
    'renderInput' | 'options'
>) => {
    const filter = useAppSelector((s) =>
        get(s, ['config', 'loras', type, 'filter'], emptyFilter)
    );
    const defaults = useAppSelector((s) =>
        get(s, ['config', 'loras', type, 'defaults'], emptyDefaults)
    );
    const envFilter = (l: string) =>
        import.meta.env.VITE_FILTER_LORAS
            ? l.includes(import.meta.env.VITE_FILTER_LORAS)
            : true;
    const final_filter = (l: string) => envFilter(l) && l.includes(filter);
    const tr = useTranslate();
    const disable_lora_filter = localStorage.getItem('disable_lora_filter');
    const { setValue } = useFormContext();
    const ceHanler = useCtrlEnter();
    const {
        handler_options: {
            lora_params: {
                api_input_name,
                lora_input_name,
                input_node_id,
                output_idx,
                output_node_ids,
                class_name,
                strength_field_name,
                name_field_name,
                additional_inputs,
            },
        },
    } = useAPI();
    const handler = useCallback(
        (api: any, values: valueType[]) => {
            if (append) {
                values = values.concat(append);
            }
            if (!values.length) {
                return;
            }
            const last_node_id = getFreeNodeId(api);
            const additional_fields = { ...additional_inputs } as any;
            if (input_node_id) {
                additional_fields[lora_input_name] = [
                    input_node_id,
                    output_idx,
                ];
            }
            const loraNodes = values.map((v) => ({
                inputs: {
                    [name_field_name]: v.id,
                    [strength_field_name]: v.strength,
                    ...additional_fields,
                },
                class_type: class_name,
                _meta: {
                    title: class_name,
                },
            }));
            if (class_name === 'HunyuanVideoLoraLoader') {
                loraNodes.forEach((n, i) => {
                    n.inputs.blocks_type =
                        values[i].merge === mergeType.DOUBLE
                            ? 'double_blocks'
                            : values[i].merge === mergeType.SINGLE
                            ? 'single_blocks'
                            : 'all';
                });
            }
            output_node_ids.forEach(
                (id) =>
                    (api[id].inputs[api_input_name] = [
                        '' + last_node_id,
                        output_idx,
                    ])
            );

            loraNodes.forEach((n, i) => {
                api['' + (last_node_id + i)] = n;
                if (i < loraNodes.length - 1) {
                    (n.inputs as any)[lora_input_name] = [
                        '' + (last_node_id + i + 1),
                        output_idx,
                    ];
                }
            });

            const block_edit_idx = getFreeNodeId(api);
            if (class_name === 'HyVideoLoraSelect') {
                const createBlockEdit = (
                    block_edit_idx: number,
                    name: string,
                    single: boolean
                ) => {
                    const block_edit = {
                        ['' + block_edit_idx]: {
                            inputs: {} as any,
                            class_type: 'HyVideoLoraBlockEdit',
                            _meta: {
                                title: name,
                            },
                        },
                    };
                    for (let i = 0; i <= 19; i++) {
                        block_edit['' + block_edit_idx].inputs[
                            `double_blocks.${i}.`
                        ] = !single;
                    }
                    for (let i = 0; i <= 39; i++) {
                        block_edit['' + block_edit_idx].inputs[
                            `single_blocks.${i}.`
                        ] = single;
                    }
                    return block_edit;
                };
                const single_only = createBlockEdit(
                    block_edit_idx,
                    'Single only',
                    true
                );
                const double_only = createBlockEdit(
                    block_edit_idx + 1,
                    'Double only',
                    false
                );
                Object.assign(api, single_only, double_only);
                loraNodes.forEach((n, i) => {
                    if (values[i].merge < mergeType.FULL) {
                        (n.inputs as any).blocks = [
                            '' + (block_edit_idx + values[i].merge),
                            0,
                        ];
                    }
                });
            }
        },
        [
            append,
            additional_inputs,
            input_node_id,
            class_name,
            output_node_ids,
            lora_input_name,
            output_idx,
            name_field_name,
            strength_field_name,
            api_input_name,
        ]
    );
    useRegisterHandler({ name: props.name, handler });
    const ctl = useController({
        name: props.name,
        defaultValue: [],
    });
    const loras = useListChoices({
        component: 'LoraLoaderModelOnly',
        field: 'lora_name',
        index: 0,
    });
    const opts = loras
        .filter((l) => (!disable_lora_filter ? final_filter(l) : true))
        .map((l) => {
            const label = l.slice(
                l.lastIndexOf('/') + 1,
                l.lastIndexOf('.safetensors')
            );
            return {
                label,
                id: l,
                strength: 1,
                merge: mergeType.DOUBLE,
                ...defaults[l],
            };
        });
    return (
        <Box display='flex' position='relative' gap={1} sx={sx}>
            <Autocomplete
                onKeyUp={ceHanler}
                renderTags={(values, getTagProps) =>
                    values.map((v, i) => (
                        <LoraChip
                            key={getTagProps({ index: i }).key}
                            getTagProps={getTagProps}
                            index={i}
                            value={v}
                            onOK={(strength: number, merge: mergeType) => {
                                setValue(props.name, [
                                    ...values.slice(0, i),
                                    { ...values[i], strength, merge },
                                    ...values.slice(i + 1),
                                ]);
                            }}
                            hideMergeType={
                                class_name !== 'HunyuanVideoLoraLoader' &&
                                class_name !== 'HyVideoLoraSelect'
                            }
                        />
                    ))
                }
                fullWidth
                {...ctl.field}
                onChange={(_, v) => ctl.field.onChange(v)}
                multiple
                {...props}
                options={opts}
                renderInput={(params) => (
                    <>
                        <TextField
                            label={tr(`controls.${props.name}`)}
                            {...params}
                        />
                        <HelpButton title='lora' sx={{ right: 80, mt: -1 }} />
                    </>
                )}
                renderOption={(props, option, _, ownerState) => {
                    return (
                        <ModelOption
                            {...props}
                            key={option.id}
                            value={ownerState.getOptionLabel(option)}
                            id={option.id}
                            minHeight={30}
                        />
                    );
                }}
            />
            <ObjectReloadButton />
        </Box>
    );
};
