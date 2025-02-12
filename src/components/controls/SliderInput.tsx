import { Box, Slider, SliderProps, Typography } from '@mui/material';
import { useController } from 'react-hook-form';
import { HelpButton } from './HelpButton';

export type SliderInputProps = {
    label?: string;
    tooltip?: string;
} & SliderProps;

export const SliderInput = ({
    defaultValue,
    sx,
    tooltip,
    ...props
}: SliderInputProps) => {
    const ctl = useController({
        name: props.name!,
        defaultValue: defaultValue,
    });
    return (
        <Box width='100%' sx={{ position: 'relative', ...sx }}>
            {/* relative position to align the help elements inside the box */}
            <Typography width='100%'>
                {props.label || props.name}: {ctl.field.value}
                {tooltip && <HelpButton title={tooltip} />}
            </Typography>
            <Slider valueLabelDisplay='auto' {...ctl.field} {...props} />
        </Box>
    );
};
