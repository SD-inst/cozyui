import { DescribeButton } from '../controls/DescribeButton';
import { FileUpload } from '../controls/FileUpload';
import { HYSize } from '../controls/HYSize';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { SeedInput } from '../controls/SeedInput';
import { SelectInput } from '../controls/SelectInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { GenerateButton } from '../GenerateButton';
import { WFTab } from '../WFTab';

const models = [
    {
        text: 'Original',
        value: 'hyvid/hunyuan_video_720_fp8_e4m3fn.safetensors',
        alsoSet: [
            {
                name: 'quantization',
                value: 'fp8_e4m3fn',
            },
        ],
    },
    {
        text: 'Fast (lower quality, fewer steps)',
        value: 'hyvid/hunyuan_video_FastVideo_720_fp8_e4m3fn.safetensors',
        alsoSet: [
            {
                name: 'quantization',
                value: 'fp8_e4m3fn',
            },
        ],
    },
];

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <TextInput
                    name='suffix'
                    label='Description suffix'
                    defaultValue=''
                    sx={{ display: 'none' }}
                />
                <SelectInput
                    name='llm'
                    choices={[
                        {
                            text: 'Florence2-base',
                            value: 'microsoft/Florence-2-base',
                        },
                        {
                            text: 'CogFlorence 2.2 Large',
                            value: 'thwri/CogFlorence-2.2-Large',
                        },
                        {
                            text: 'Florence2-large PromptGen v2.0',
                            value: 'MiaoshouAI/Florence-2-large-PromptGen-v2.0',
                        },
                    ]}
                    label='LLM for description'
                    defaultValue='thwri/CogFlorence-2.2-Large'
                />
                <DescribeButton api='Describe image' />
                <TextInput name='prompt' multiline sx={{ mb: 3 }} />
                <SelectInput
                    name='model'
                    defaultValue='hyvid/hunyuan_video_720_fp8_e4m3fn.safetensors'
                    choices={models}
                />
                <HYSize name='size' label='max size' defaultValue={512} />
                <LengthInput
                    min={5}
                    max={257}
                    step={4}
                    fps={24}
                    name='length'
                    defaultValue={85}
                />
                <SliderInput name='steps' defaultValue={15} min={1} max={30} />
                <SliderInput
                    name='flow_shift'
                    label='flow shift'
                    min={1}
                    max={30}
                    defaultValue={9}
                />
                <SliderInput
                    name='guidance'
                    label='guidance scale'
                    min={1}
                    max={20}
                    defaultValue={6}
                />
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput
                    name='lora'
                    filter='/hunyuan/'
                    sx={{ mb: 2 }}
                    append={[
                        {
                            id: 'comfy/img2vid.safetensors',
                            label: 'img2vid',
                            strength: 1,
                        },
                    ]}
                />
                <SliderInput
                    name='enhance'
                    label='Enhance-a-Video weight'
                    min={0}
                    max={8}
                    defaultValue={4}
                    step={0.1}
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

export const HunyanI2VTab = (
    <WFTab label='Hunyuan I2V' value='Hunyuan I2V' content={<Content />} />
);
