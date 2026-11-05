import { Typography } from '@mui/material';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { ImageResult } from '../../controls/ImageResult';
import { LoraInput } from '../../controls/LoraInput';
import { MiniMaxH3ResolutionSelector } from '../../controls/MiniMaxH3ResolutionSelector';
import { ModArrayInput } from '../../controls/ModArrayInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { PromptUpsampleToggle } from '../../controls/PromptUpsampleToggle';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UpsampledPromptPanel } from '../../controls/UpsampledPromptPanel';
import { WFTab } from '../../WFTab';
import { useMiniMaxH3RefModHandler } from '../../../hooks/useMiniMaxH3RefModHandler';
import { useRegisterHandler } from '../../contexts/TabContext';
import { useTranslate } from '../../../i18n/I18nContext';

const Content = () => {
    const tr = useTranslate();
    const refModHandler = useMiniMaxH3RefModHandler();
    useRegisterHandler({ name: 'refmods', handler: refModHandler });
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <PromptUpsampleToggle
                    name='prompt_upsample'
                    defaultValue={true}
                />
                <ModArrayInput name='refmods' max={8} />
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
                <UpsampledPromptPanel />
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
