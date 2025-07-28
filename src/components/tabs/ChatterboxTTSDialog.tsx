import { AudioInput } from '../controls/AudioInput';
import { AudioResult } from '../controls/AudioResult';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { UploadType } from '../controls/UploadType';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput
                    name='prompt'
                    multiline
                    defaultValue={`SPEAKER A: This is a test
SPEAKER B: Let's count: 1 2 3`}
                    sx={{ mb: 2 }}
                />
                <FileUpload name='audio_input_A' type={UploadType.AUDIO} />
                <FileUpload name='audio_input_B' type={UploadType.AUDIO} />
                <AudioInput
                    toggleName='audio_toggle_C'
                    audioName='audio_input_C'
                />
                <AudioInput
                    toggleName='audio_toggle_D'
                    audioName='audio_input_D'
                />
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

export const ChatterboxDialogTab = (
    <WFTab
        label='Chatterbox TTS Dialog'
        value='Chatterbox TTS Dialog'
        group='Audio'
        content={<Content />}
    />
);
