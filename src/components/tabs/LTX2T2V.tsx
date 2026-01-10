import { useWatchForm } from '../../hooks/useWatchForm';
import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { LTX2KeyframesControl } from '../controls/LTX2KeyframesControl';
import { LTX2UpsampleControl } from '../controls/LTX2UpsampleControl';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';

const Content = () => {
    const fps = useWatchForm('fps');
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline />
                <LTX2KeyframesControl />
                <WidthHeight
                    defaultWidth={1280}
                    defaultHeight={736}
                    maxWidth={1920}
                    maxHeight={1920}
                    step={32}
                />
                <LengthInput
                    name='length'
                    min={9}
                    max={601}
                    step={8}
                    defaultValue={129}
                    fps={fps}
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
                        name='fps'
                        defaultValue={24}
                        min={1}
                        max={50}
                    />
                    <SamplerSelectInput
                        name='sampler'
                        defaultValue='euler_ancestral'
                    />
                    <LTX2UpsampleControl />
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

export const LTX2T2VTab = (
    <WFTab label='LTX-2' value='LTX-2 T2V' group='T2V' content={<Content />} />
);
