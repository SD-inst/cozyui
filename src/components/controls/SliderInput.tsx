import { Box, Slider, SliderProps, TextField, Typography } from '@mui/material';
import { useController } from 'react-hook-form';
import { HelpButton } from './HelpButton';
import { useCallback, useState } from 'react';
import { useTranslate } from '../../i18n/I18nContext';

export type SliderInputProps = {
    tooltip?: string;
    suffix?: string;
    name: string;
    label?: string;
} & SliderProps;

export const SliderInput = ({
    defaultValue,
    sx,
    tooltip,
    label,
    ...props
}: SliderInputProps) => {
    const {
        field: { value, onChange, ...field },
    } = useController({
        name: props.name,
        defaultValue,
    });
    const [edit, setEdit] = useState(false);
    const tr = useTranslate();
    const commitValue = useCallback(() => {
        onChange(value - (value % (props.step || 1)));
        setEdit(false);
    }, [props.step, onChange, value]);
    return (
        <Box width='100%' sx={{ position: 'relative', ...sx }}>
            {/* relative position to align the help elements inside the box */}
            <Box width='100%' display='flex' alignItems='center' gap={1}>
                <Typography variant='body1'>
                    {tr(`controls.${label || props.name}`)}
                    {props.suffix ? ' ' + props.suffix : ''}:
                </Typography>
                {edit ? (
                    <TextField
                        autoFocus
                        size='small'
                        type='number'
                        slotProps={{
                            htmlInput: {
                                max: props.max,
                                min: props.min,
                                step: props.step,
                            },
                        }}
                        value={value}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        {...field}
                        onBlur={() => commitValue()}
                        onFocus={(e) => e.target.select()}
                        onKeyUp={(e) => e.key === 'Enter' && commitValue()}
                    />
                ) : (
                    <Typography
                        variant='body1'
                        sx={{ cursor: 'pointer' }}
                        onClick={() => !props.disabled && setEdit(true)}
                    >
                        {value}
                    </Typography>
                )}
                {tooltip && <HelpButton title={tooltip} />}
            </Box>
            <Slider
                valueLabelDisplay='auto'
                value={value}
                onChange={(_, v) => onChange(v)}
                {...field}
                {...props}
            />
        </Box>
    );
};
