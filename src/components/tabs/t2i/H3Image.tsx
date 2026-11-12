import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { ChatComponent } from '../../chat/ChatComponent';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { ImageResult } from '../../controls/ImageResult';
import { LoraInput } from '../../controls/LoraInput';
import { MiniMaxH3ResolutionSelector } from '../../controls/MiniMaxH3ResolutionSelector';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { WFTab } from '../../WFTab';
import { useMiniMaxH3ImageFirstMessageTransform } from '../../../hooks/useMiniMaxH3ImageFirstMessageTransform';

// The caption rules the model ships with, as a lazy chunk (see the prompts
// directory): the chat writes the caption into the prompt field itself, so an
// image run never loads a second text model onto the GPU that is already busy
// with the image model.
const miniMaxH3ImageSystemPrompt = () =>
    import('../../chat/prompts/minimaxH3Image').then(
        (m) => m.miniMaxH3ImageSystemPrompt,
    );

const Content = () => {
    const transformFirstMessage = useMiniMaxH3ImageFirstMessageTransform();

    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <ChatComponent
                    systemPrompt={miniMaxH3ImageSystemPrompt}
                    transformFirstMessage={transformFirstMessage}
                />
                <MiniMaxH3ResolutionSelector
                    name='aspect_ratio'
                    defaultValue='1:1 (Square)'
                />
                {/* The workflow sizes itself through a Resolution Selector whose
                    megapixel widget stops at 16, and the server rejects a value
                    past the widget's declared range. */}
                <SliderInput
                    name='megapixels'
                    defaultValue={8}
                    min={2}
                    max={16}
                    step={0.1}
                />
                {/* The workflow's sampler chain fixes the schedule — 6 steps of
                    Euler Ancestral (eta 1, s_noise 0.9) at CFG 1 — so the tab
                    has no steps, sampler or scheduler control. */}
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
                <ImageResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const H3ImageTab = (
    <WFTab
        label='H3 Image'
        value='H3 Image T2I'
        group='T2I'
        content={<Content />}
    />
);
