import { useController } from 'react-hook-form';
import { SliderInputBase, SliderInputProps } from './SliderInputBase';

export const SliderInput = ({
    name,
    defaultValue,
    ...props
}: SliderInputProps) => {
    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        field: { ref, ...field },
    } = useController({
        name,
        defaultValue,
    });
    return <SliderInputBase {...field} {...props} />;
};
