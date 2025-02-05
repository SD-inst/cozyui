import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { mergeType } from '../../api/mergeType';
import { DescribeButton } from '../controls/DescribeButton';
import { EnhanceVideoInput } from '../controls/EnhanceVideoInput';
import { FileUpload } from '../controls/FileUpload';
import { HYSize } from '../controls/HYSize';
import { KJSchedulerSelectInput } from '../controls/KJSchedulerSelectInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { SeedInput } from '../controls/SeedInput';
import { SelectInput } from '../controls/SelectInput';
import { SliderInput } from '../controls/SliderInput';
import { TeaCacheInput } from '../controls/TeaCacheInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { GenerateButton } from '../controls/GenerateButton';
import { WFTab } from '../WFTab';
import { BlockSwapInput } from '../controls/BlockSwapInput';

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
                <HYSize name='size' label='max size' defaultValue={544} />
                <LengthInput
                    min={5}
                    max={201}
                    step={4}
                    fps={24}
                    name='length'
                    defaultValue={85}
                />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        Advanced parameters
                    </AccordionSummary>
                    <AccordionDetails>
                        <KJSchedulerSelectInput name='sampler' />
                        <SliderInput
                            name='flow_shift'
                            label='flow shift'
                            min={1}
                            max={30}
                            defaultValue={10}
                        />
                        <SliderInput
                            name='guidance'
                            label='guidance scale'
                            min={1}
                            max={20}
                            defaultValue={10}
                        />
                        <SliderInput
                            name='aug_strength'
                            label='Noise augmentation'
                            min={0}
                            max={1}
                            step={0.01}
                            defaultValue={0}
                        />
                        <SliderInput
                            name='latent_strength'
                            label='Latent strength'
                            min={0}
                            max={1}
                            step={0.01}
                            defaultValue={1}
                        />
                        <EnhanceVideoInput
                            name='enhance_video'
                            label='Enhance-a-Video weight'
                        />
                        <TeaCacheInput name='tea_cache' defaultValue={0.15} />
                        <BlockSwapInput name='block_swap' />
                    </AccordionDetails>
                </Accordion>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput
                    name='lora'
                    filter='/hunyuan/'
                    sx={{ mb: 2 }}
                    append={[
                        {
                            id: 'comfy/img2vid544p.safetensors',
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

export const HunyanI2VTab = (
    <WFTab label='Hunyuan I2V' value='Hunyuan I2V' content={<Content />} />
);
