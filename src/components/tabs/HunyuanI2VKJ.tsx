import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { mergeType } from '../../api/mergeType';
import { useTranslate } from '../../i18n/I18nContext';
import { BlockSwapInput } from '../controls/BlockSwapInput';
import { DescribeButton } from '../controls/DescribeButton';
import { EnhanceVideoInput } from '../controls/EnhanceVideoInput';
import { FileUpload } from '../controls/FileUpload';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
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
import { WFTab } from '../WFTab';
import { useHyvModelChoices } from './hyv_models';

const Content = () => {
    const tr = useTranslate();
    const hyv_models = useHyvModelChoices((m) => m.quantization !== 'gguf');
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <TextInput
                    name='suffix'
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
                    defaultValue='thwri/CogFlorence-2.2-Large'
                />
                <DescribeButton />
                <TextInput name='prompt' multiline sx={{ mb: 3 }} />
                <SelectInput
                    name='model'
                    defaultValue='hyvid/hunyuan_video_720_fp8_e4m3fn.safetensors'
                    choices={hyv_models}
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
                <GuidanceInput defaultValue={10} />
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        {tr('controls.advanced_parameters')}
                    </AccordionSummary>
                    <AccordionDetails>
                        <KJSchedulerSelectInput name='sampler' />
                        <FlowShiftInput defaultValue={10} />
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
                        <TeaCacheInput name='tea_cache' defaultValue={0.15} />
                        <BlockSwapInput name='block_swap' />
                    </AccordionDetails>
                </Accordion>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput
                    name='lora'
                    type='hunyuan'
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

export const HunyanI2VKJTab = (
    <WFTab label='Hunyuan I2V Kijai' value='Hunyuan I2V' content={<Content />} />
);
