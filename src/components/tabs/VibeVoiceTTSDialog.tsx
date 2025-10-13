import { AudioInput } from '../controls/AudioInput';
import { AudioResult } from '../controls/AudioResult';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { ToggleInput } from '../controls/ToggleInput';
import { UploadType } from '../controls/UploadType';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput
                    name='prompt'
                    multiline
                    defaultValue={`[1]: Hello, this is the first speaker.
[2]: Hi there, I'm the second speaker.
[1]: Nice to meet you!
[2]: Nice to meet you too!`}
                    sx={{ mb: 2 }}
                />
                <FileUpload name='audio_input_1' type={UploadType.AUDIO} />
                <FileUpload name='audio_input_2' type={UploadType.AUDIO} />
                <AudioInput
                    toggleName='audio_toggle_3'
                    audioName='audio_input_3'
                />
                <AudioInput
                    toggleName='audio_toggle_4'
                    audioName='audio_input_4'
                />
                <SliderInput min={1} max={100} name='steps' defaultValue={20} />
                <SliderInput
                    name='cfg'
                    min={0}
                    max={10}
                    defaultValue={1.3}
                    step={0.01}
                />
                <SliderInput
                    name='temperature'
                    min={0}
                    max={3}
                    defaultValue={0.95}
                    step={0.01}
                />
                <SliderInput
                    name='top_p'
                    min={0}
                    max={1}
                    defaultValue={0.95}
                    step={0.01}
                />
                <ToggleInput name='use_sampling' />
                <SeedInput name='seed' defaultValue={1024} seedLength={7} />
            </GridLeft>
            <GridRight>
                <AudioResult loop={false} />
            </GridRight>
            <GridBottom>
                <GenerateButton
                    requiredControls={['audio_input_1', 'audio_input_2']}
                />
            </GridBottom>
        </Layout>
    );
};

export const VibeVoiceDialogTab = (
    <WFTab
        label='VibeVoice Dialog'
        value='VibeVoice TTS Dialog'
        group='TTS'
        content={<Content />}
    />
);
