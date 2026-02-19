import { Box, useEventCallback } from '@mui/material';
import { PromptInput } from './PromptInput';
import { TextInputProps } from './TextInput';
import { ToggleInput } from './ToggleInput';
import { useRegisterHandler } from '../contexts/TabContext';
import { controlType } from '../../redux/config';
import { useFormContext, useWatch } from 'react-hook-form';
import { useEffect } from 'react';

type TValue = {
    text: string;
    duplicate: boolean;
};

export const DoublePromptInput = ({ name, ...props }: TextInputProps) => {
    const handler = useEventCallback(
        (api: any, value: TValue, control: controlType) => {
            if (!control.node_id || !control.field) {
                return;
            }
            const text = value.duplicate
                ? value.text + ' ' + value.text
                : value.text;
            api[control.node_id].inputs[control.field] = text;
        },
    );
    useRegisterHandler({ name, handler });
    const prompt = useWatch({ name });
    const { setValue } = useFormContext();
    useEffect(() => {
        if (typeof prompt === 'string') {
            setValue(name, { text: prompt, duplicate: false });
        }
    }, [name, prompt, setValue]);

    return (
        <Box display='flex' flexDirection='column'>
            <PromptInput
                {...props}
                name={name + '.text'}
                label={name}
                sx={{ mb: 0 }}
            />
            <Box sx={{ mb: 2 }}>
                <ToggleInput
                    name={name + '.duplicate'}
                    label='prompt_duplicate'
                />
            </Box>
        </Box>
    );
};
