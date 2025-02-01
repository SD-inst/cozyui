import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const KJAttentionSelectInput = ({
    ...props
}: CustomSelectInputProps) => {
    return (
        <SelectInput
            choices={[
                { text: 'Sage Attention', value: 'sageattn_varlen' },
                { text: 'Flash Attention', value: 'flash_attn_varlen' },
                { text: 'Comfy Attention', value: 'comfy' },
                { text: 'SDPA Attention', value: 'sdpa' },
            ]}
            defaultValue='sageattn_varlen'
            {...props}
        />
    );
};
