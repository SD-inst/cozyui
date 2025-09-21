import { AdvancedSettings } from '../controls/AdvancedSettings';
import { EnhanceVideoInput } from '../controls/EnhanceVideoInput';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { HYModelSelectInput } from '../controls/HYModelSelectInput';
import { HYTeaCacheInput } from '../controls/HYTeaCacheInput';
import { KJAttentionSelectInput } from '../controls/KJAttentionSelectInput';
import { KJHYBlockSwapInput } from '../controls/KJHYBlockSwapInput';
import { KJHYCFG } from '../controls/KJHYCFG';
import { KJSchedulerSelectInput } from '../controls/KJSchedulerSelectInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <WidthHeight defaultWidth={848} defaultHeight={480} />
                <LengthInput
                    min={5}
                    max={201}
                    step={4}
                    fps={24}
                    name='length'
                    defaultValue={85}
                />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <GuidanceInput />
                <FlowShiftInput />
                <AdvancedSettings>
                    <HYModelSelectInput
                        name='model'
                        filter={(m) => !m.path.endsWith('gguf')}
                    />
                    <KJHYCFG name='neg_prompt' />
                    <KJSchedulerSelectInput name='sampler' />
                    <KJAttentionSelectInput name='attention' />
                    <EnhanceVideoInput name='enhance_video' />
                    <HYTeaCacheInput name='tea_cache' defaultValue={0.2} />
                    <KJHYBlockSwapInput name='block_swap' />
                </AdvancedSettings>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput name='lora' type='hunyuan' />
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

export const HunyanT2VKJTab = (
    <WFTab
        label='Hunyuan T2V Kijai'
        value='Hunyuan T2V KJ'
        group='T2V'
        content={<Content />}
    />
);
