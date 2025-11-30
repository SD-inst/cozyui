import { mergeType } from '../../api/mergeType';
import { AdvancedSettings } from '../controls/AdvancedSettings';
import { DescribeButton } from '../controls/DescribeButton';
import { EnhanceVideoInput } from '../controls/EnhanceVideoInput';
import { FileUpload } from '../controls/FileUpload';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { HYModelSelectInput } from '../controls/HYModelSelectInput';
import { HYSize } from '../controls/HYSize';
import { KJHYBlockSwapInput } from '../controls/KJHYBlockSwapInput';
import { KJHYTeaCacheInput } from '../controls/KJHYTeaCacheInput';
import { KJSchedulerSelectInput } from '../controls/KJSchedulerSelectInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LLMSelectInput } from '../controls/LLMSelectInput';
import { LoraInput } from '../controls/LoraInput';
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
                <TextInput
                    name='suffix'
                    defaultValue=''
                    sx={{ display: 'none' }}
                />
                <LLMSelectInput name='llm' />
                <DescribeButton />
                <TextInput name='prompt' multiline sx={{ mb: 3 }} />
                <HYSize name='size' defaultValue={544} />
                <LengthInput
                    min={5}
                    max={201}
                    step={4}
                    fps={24}
                    name='length'
                    defaultValue={85}
                />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <GuidanceInput defaultValue={10} />
                <FlowShiftInput defaultValue={10} />
                <AdvancedSettings>
                    <HYModelSelectInput
                        name='model'
                        filter={(m) => !m.path.endsWith('gguf')}
                    />
                    <KJSchedulerSelectInput name='sampler' />
                    <SliderInput
                        name='aug_strength'
                        min={0}
                        max={1}
                        step={0.01}
                        defaultValue={0}
                    />
                    <SliderInput
                        name='latent_strength'
                        min={0}
                        max={1}
                        step={0.01}
                        defaultValue={1}
                    />
                    <EnhanceVideoInput name='enhance_video' />
                    <KJHYTeaCacheInput defaultThreshold={0.1} />
                    <KJHYBlockSwapInput />
                </AdvancedSettings>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput
                    name='lora'
                    type='hunyuan'
                    sx={{ mb: 2 }}
                    append={[
                        {
                            id: 'img2vid544p.safetensors',
                            label: 'img2vid',
                            strength: 1,
                            merge: mergeType.FULL,
                        },
                    ]}
                />
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

export const HunyanI2VKJTab = (
    <WFTab
        label='Hunyuan Kijai'
        value='Hunyuan I2V KJ'
        group='I2V'
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
