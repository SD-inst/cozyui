import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const ClipSelectInput = ({ ...props }: CustomSelectInputProps) => {
    return (
        <SelectInput
            choices={[
                {
                    text: 'LLaMA fp8',
                    value: 'llava_llama3_fp8_scaled.safetensors',
                },
                {
                    text: 'LLaMA fp16',
                    value: 'llava_llama3_fp16.safetensors',
                },
                {
                    text: 'LLaMA fp16 uncensored',
                    value: 'hunyuanVideoSafetensors_uncensoredLlamaTE.safetensors',
                },
            ]}
            defaultValue='llava_llama3_fp8_scaled.safetensors'
            {...props}
        />
    );
};
