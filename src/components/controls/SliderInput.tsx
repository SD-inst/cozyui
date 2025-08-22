import { useController } from 'react-hook-form';
import { SliderInputBase, SliderInputProps } from './SliderInputBase';

export const SliderInput = ({
    name,
    defaultValue,
    ...props
}: SliderInputProps) => {
    const { field } = useController({
        name,
        defaultValue,
    });
    return <SliderInputBase {...field} {...props} />;
};
