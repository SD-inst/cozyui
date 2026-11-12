import { Typography } from '@mui/material';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { ChatComponent } from '../../chat/ChatComponent';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { H3ICustomAspect } from '../../controls/H3ICustomAspect';
import { H3IImages } from '../../controls/H3IImages';
import { H3IImageEntry } from '../../controls/H3IImagesHandler';
import { ImageResult } from '../../controls/ImageResult';
import { LoraInput } from '../../controls/LoraInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { WFTab } from '../../WFTab';
import { useMiniMaxH3ImageEditFirstMessageTransform } from '../../../hooks/useMiniMaxH3ImageEditFirstMessageTransform';
import { useWatchForm } from '../../../hooks/useWatchForm';
import { useTranslate } from '../../../i18n/I18nContext';
import { activeEntries } from '../../../utils/arraySlots';

// The edit-description rules the model ships with, as a lazy chunk: the chat
// looks at the uploaded pictures itself, so the run needs no text model of its
// own on the GPU that is already rendering the image.
const miniMaxH3ImageEditSystemPrompt = () =>
    import('../../chat/prompts/minimaxH3ImageEdit').then(
        (m) => m.miniMaxH3ImageEditSystemPrompt,
    );

const Content = () => {
    const tr = useTranslate();
    const images: H3IImageEntry[] = useWatchForm('images');
    const hasImage = activeEntries(images).some((i) => !!i.image);
    const customAspect = useWatchForm('custom_aspect');
    const transformFirstMessage = useMiniMaxH3ImageEditFirstMessageTransform();
    return (
        <Layout>
            <GridLeft>
                <H3IImages name='images' max={16} />
                <Typography variant='caption' color='textSecondary'>
                    {tr('controls.chat_picture_numbering_note')}
                </Typography>
                <TextInput name='prompt' multiline sx={{ mt: 2, mb: 2 }} />
                <ChatComponent
                    systemPrompt={miniMaxH3ImageEditSystemPrompt}
                    mediaFields={[
                        { name: 'images', kind: 'image', itemField: 'image' },
                    ]}
                    transformFirstMessage={transformFirstMessage}
                />
                {/* The slider is the megapixel target of the result either
                    way: of the canvas the edited picture implies, or of the
                    one picked under the custom-aspect toggle. */}
                <SliderInput
                    name='megapixels'
                    defaultValue={4}
                    min={2}
                    max={16}
                    step={0.1}
                />
                {!customAspect?.enabled && (
                    <Typography variant='caption' color='textSecondary'>
                        {tr('controls.aspect_follows_input_note')}
                    </Typography>
                )}
                <H3ICustomAspect />
                {/* Same fixed schedule as the H3 Image tab: 6 steps of Euler
                    Ancestral (eta 1, s_noise 0.9) at CFG 1, so no steps,
                    sampler or scheduler control here either. */}
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='minimax_h3'
                        component='UNETLoader'
                        field='unet_name'
                        sx={{ mb: 2 }}
                    />
                </AdvancedSettings>
                <LoraInput name='lora' type='minimax_h3' sx={{ mt: 1 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <ImageResult
                    sendTargetTab='H3 Image Edit'
                    sendLabel='send_back'
                />
            </GridRight>
            <GridBottom>
                <GenerateButton disabled={!hasImage} />
            </GridBottom>
        </Layout>
    );
};

export const H3ImageEditTab = (
    <WFTab
        label='H3 Image Edit'
        value='H3 Image I2I'
        group='I2I'
        receivers={[{ name: 'images', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
