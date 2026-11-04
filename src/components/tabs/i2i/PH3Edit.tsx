import { Typography } from '@mui/material';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { ImageResult } from '../../controls/ImageResult';
import { LoraInput } from '../../controls/LoraInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { PH3ImageEntry } from '../../controls/PH3ImagesHandler';
import { PH3Images } from '../../controls/PH3Images';
import { PromptUpsampleToggle } from '../../controls/PromptUpsampleToggle';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UpsampledPromptPanel } from '../../controls/UpsampledPromptPanel';
import { WFTab } from '../../WFTab';
import { useWatchForm } from '../../../hooks/useWatchForm';
import { useTranslate } from '../../../i18n/I18nContext';
import { activeEntries } from '../../../utils/arraySlots';

const Content = () => {
    const tr = useTranslate();
    const images: PH3ImageEntry[] = useWatchForm('images');
    const hasImage = activeEntries(images).some((i) => !!i.image);
    return (
        <Layout>
            <GridLeft>
                <PH3Images name='images' max={9} />
                <Typography variant='caption' color='textSecondary'>
                    {tr('controls.picture_numbering_note')}
                </Typography>
                <TextInput name='prompt' multiline sx={{ mt: 2, mb: 2 }} />
                <PromptUpsampleToggle
                    name='prompt_upsample'
                    defaultValue={true}
                />
                <SliderInput
                    name='megapixels'
                    defaultValue={4}
                    min={1}
                    max={12}
                    step={0.1}
                />
                {/* The workflow samples on hand-picked sigmas (ManualSigmas),
                    so there is no step count to offer: any other schedule
                    degrades the picture. The output size follows the edited
                    image, the megapixels only pick how much of it is kept. */}
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
                <ImageResult sendTargetTab='P-H3 Edit' sendLabel='send_back' />
                <UpsampledPromptPanel />
            </GridRight>
            <GridBottom>
                <GenerateButton disabled={!hasImage} />
            </GridBottom>
        </Layout>
    );
};

export const PH3EditTab = (
    <WFTab
        label='P-H3 Edit'
        value='P-H3 I2I'
        group='I2I'
        receivers={[{ name: 'images', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
