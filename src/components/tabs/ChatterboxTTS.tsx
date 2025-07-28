import { AudioInput } from '../controls/AudioInput';
import { AudioResult } from '../controls/AudioResult';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <AudioInput toggleName='audio_toggle' audioName='audio_input' />
                <SliderInput
                    min={0}
                    max={2}
                    step={0.01}
                    name='exaggeration'
                    defaultValue={0.5}
                />
                <SliderInput
                    name='cfg'
                    defaultValue={0.8}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <SliderInput
                    name='temperature'
                    defaultValue={0.8}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <SeedInput name='seed' defaultValue={1024} seedLength={8} />
            </GridLeft>
            <GridRight>
                <AudioResult loop={false} />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const ChatterboxTab = (
    <WFTab
        label='Chatterbox TTS'
        value='Chatterbox TTS'
        group='Audio'
        content={<Content />}
    />
);
