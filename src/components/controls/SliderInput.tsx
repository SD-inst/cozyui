import { Box, Slider, SliderProps, Typography } from '@mui/material';
import { useController } from 'react-hook-form';

export const SliderInput = ({ defaultValue, ...props }: SliderProps) => {
    const ctl = useController({
        name: props.name!,
        defaultValue: defaultValue,
    });
    return (
        <Box width='100%'>
            <Typography gutterBottom>
                {props.name}: {ctl.field.value}
            </Typography>
            <Slider valueLabelDisplay='auto' {...ctl.field} {...props} />
        </Box>
    );
};
