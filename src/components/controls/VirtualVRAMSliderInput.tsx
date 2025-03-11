import { useWatch } from 'react-hook-form';
import { SliderInput, SliderInputProps } from './SliderInput';

export const VirtualVRAMSliderInput = ({ ...props }: SliderInputProps) => {
    const model: string = useWatch({ name: 'model' });
    const disabled = !(model || '').toLowerCase().endsWith('.gguf');
    return (
        <SliderInput
            min={0}
            max={24}
            step={1}
            tooltip='virtual_vram'
            disabled={disabled}
            defaultValue={0}
            {...props}
        />
    );
};
