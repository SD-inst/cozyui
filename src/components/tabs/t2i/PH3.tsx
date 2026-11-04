import { Button, Typography, useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { ImageResult } from '../../controls/ImageResult';
import { LoraInput } from '../../controls/LoraInput';
import { MiniMaxH3ResolutionSelector } from '../../controls/MiniMaxH3ResolutionSelector';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { PromptUpsampleToggle } from '../../controls/PromptUpsampleToggle';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextResultPanel } from '../../controls/TextResultPanel';
import { TextInput } from '../../controls/TextInput';
import { WFTab } from '../../WFTab';
import { useTranslate } from '../../../i18n/I18nContext';

const Content = () => {
    const tr = useTranslate();
    const { setValue } = useFormContext();

    // Keep the expanded text as the prompt itself. Upsampling is switched off
    // in the same click, because feeding an already expanded prompt back
    // through the upsampler would expand it twice.
    const applyUpsampledPrompt = useEventCallback((text: string) => {
        setValue('prompt', text);
        setValue('prompt_upsample', false);
    });

    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <PromptUpsampleToggle
                    name='prompt_upsample'
                    defaultValue={true}
                />
                <MiniMaxH3ResolutionSelector
                    name='aspect_ratio'
                    defaultValue='16:9 (Widescreen)'
                />
                <SliderInput
                    name='megapixels'
                    defaultValue={8}
                    min={1}
                    max={12}
                    step={0.1}
                />
                {/* The workflow samples on hand-picked sigmas (ManualSigmas),
                    so there is no step count to offer: any other schedule
                    degrades the picture. */}
                <Typography variant='caption' color='textSecondary'>
                    {tr('controls.steps_fixed_note')}
                </Typography>
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='minimax_h3'
                        component='UNETLoader'
                        field='unet_name'
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='euler' />
                </AdvancedSettings>
                <LoraInput name='lora' type='minimax_h3' sx={{ mt: 1 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <ImageResult />
                <TextResultPanel
                    index={1}
                    title={tr('controls.upsampled_prompt')}
                    emptyText={tr('controls.upsampled_prompt_empty')}
                    renderAction={(text) => (
                        <Button
                            variant='contained'
                            color='primary'
                            onClick={() => applyUpsampledPrompt(text)}
                        >
                            {tr('controls.upsampled_prompt_use')}
                        </Button>
                    )}
                />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const PH3Tab = (
    <WFTab label='P-H3' value='P-H3 T2I' group='T2I' content={<Content />} />
);
