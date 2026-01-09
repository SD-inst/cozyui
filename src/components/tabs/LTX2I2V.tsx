import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <TextInput name='prompt' multiline />
                <SliderInput
                    name='size'
                    label='size_mp'
                    defaultValue={1}
                    min={0.1}
                    max={2}
                    step={0.01}
                />
                <LengthInput
                    name='length'
                    min={9}
                    max={601}
                    step={8}
                    defaultValue={126}
                    fps={25}
                />
                <SliderInput name='steps' defaultValue={20} min={5} max={50} />
                <AdvancedSettings>
                    <TextInput
                        name='neg_prompt'
                        defaultValue='blurry, low quality, still frame, frames, watermark, overlay, titles, has blurbox, has subtitles'
                        multiline
                    />
                    <CFGInput defaultValue={4} />
                    <SliderInput
                        name='compression'
                        defaultValue={33}
                        min={1}
                        max={50}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='euler' />
                </AdvancedSettings>
                <LoraInput name='lora' type='ltx2' sx={{ mt: 1 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <VideoResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const LTX2I2VTab = (
    <WFTab
        label='LTX-2'
        value='LTX-2 I2V'
        group='I2V'
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
