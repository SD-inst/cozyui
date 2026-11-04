import { Button, useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { useTranslate } from '../../i18n/I18nContext';
import { TextResultPanel } from './TextResultPanel';

/**
 * The prompt upsampler's text result, with the action both P-H3 tabs want:
 * keep the expanded text as the prompt itself. Upsampling is switched off in
 * the same click, because feeding an already expanded prompt back through the
 * upsampler would expand it twice.
 */
export const UpsampledPromptPanel = ({
    index = 1,
    promptField = 'prompt',
    toggleField = 'prompt_upsample',
}: {
    index?: number;
    promptField?: string;
    toggleField?: string;
}) => {
    const tr = useTranslate();
    const { setValue } = useFormContext();
    const applyPrompt = useEventCallback((text: string) => {
        setValue(promptField, text);
        setValue(toggleField, false);
    });
    return (
        <TextResultPanel
            index={index}
            title={tr('controls.upsampled_prompt')}
            emptyText={tr('controls.upsampled_prompt_empty')}
            renderAction={(text) => (
                <Button
                    variant='contained'
                    color='primary'
                    onClick={() => applyPrompt(text)}
                >
                    {tr('controls.upsampled_prompt_use')}
                </Button>
            )}
        />
    );
};
