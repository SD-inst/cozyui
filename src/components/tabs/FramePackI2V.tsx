import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { KJCompileModelToggle } from '../controls/KJCompileModelToggle';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { PromptInput } from '../controls/PromptInput';
import { SeedInput } from '../controls/SeedInput';
import { SelectInput } from '../controls/SelectInput';
import { SliderInput } from '../controls/SliderInput';
import { ToggleInput } from '../controls/ToggleInput';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <PromptInput name='prompt' sx={{ mb: 3 }} />
                <SelectInput
                    name='size'
                    defaultValue={320}
                    choices={[
                        { text: '240p', value: 240 },
                        { text: '320p', value: 320 },
                        { text: '640p', value: 640 },
                    ]}
                />
                <SliderInput
                    name='length'
                    label='length_s'
                    min={1}
                    max={60}
                    defaultValue={5}
                />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <LengthInput
                    name='window_size'
                    defaultValue={9}
                    min={1}
                    max={20}
                    fps={30 / 4}
                />
                <GuidanceInput defaultValue={10} />
                <ToggleInput name='tea_cache' defaultValue={true} />
                <SliderInput
                    name='rel_thresh'
                    min={0}
                    max={1}
                    step={0.01}
                    defaultValue={0.15}
                />
                <LoraInput name='lora' type='framepack' />
                <KJCompileModelToggle classType='FramePackTorchCompileSettings' />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <VideoResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const FramePackI2VTab = (
    <WFTab
        label='FramePack'
        value='FramePack I2V'
        group='I2V'
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
