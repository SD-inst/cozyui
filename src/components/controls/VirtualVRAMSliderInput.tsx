import { SliderInput } from './SliderInput';
import { SliderInputProps } from './SliderInputBase';

export const VirtualVRAMSliderInput = ({ ...props }: SliderInputProps) => {
    return (
        <SliderInput
            min={0}
            max={24}
            step={1}
            tooltip='virtual_vram'
            defaultValue={0}
            {...props}
        />
    );
};
