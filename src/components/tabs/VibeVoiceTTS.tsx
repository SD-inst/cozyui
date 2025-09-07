import { useWatch } from 'react-hook-form';
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
    const audio_input = useWatch({ name: 'audio_input' });
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <FileUpload name='audio_input' type={UploadType.AUDIO} />
                <SliderInput min={1} max={100} name='steps' defaultValue={20} />
                <SliderInput
                    name='cfg'
                    min={0}
                    max={10}
                    defaultValue={1.3}
                    step={0.1}
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
                <GenerateButton disabled={!audio_input} />
            </GridBottom>
        </Layout>
    );
};

export const VibeVoiceTab = (
    <WFTab
        label='VibeVoice TTS'
        value='VibeVoice TTS'
        group='Audio'
        content={<Content />}
    />
);
