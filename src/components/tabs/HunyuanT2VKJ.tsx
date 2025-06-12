import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { Box } from '@mui/system';
import { useTranslate } from '../../i18n/I18nContext';
import { BlockSwapInput } from '../controls/BlockSwapInput';
import { EnhanceVideoInput } from '../controls/EnhanceVideoInput';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { HYModelSelectInput } from '../controls/HYModelSelectInput';
import { HYSize } from '../controls/HYSize';
import { KJAttentionSelectInput } from '../controls/KJAttentionSelectInput';
import { KJHYCFG } from '../controls/KJHYCFG';
import { KJSchedulerSelectInput } from '../controls/KJSchedulerSelectInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { TeaCacheInput } from '../controls/TeaCacheInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';

const Content = () => {
    const tr = useTranslate();
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <Box display='flex' flexDirection='row' width='100%'>
                    <Box display='flex' flexDirection='column' flex={1}>
                        <HYSize name='width' defaultValue={512} />
                        <HYSize name='height' defaultValue={320} />
                    </Box>
                    <Box display='flex' alignItems='center'>
                        <SwapButton
                            names={['width', 'height']}
                            sx={{ mt: 3 }}
                        />
                    </Box>
                </Box>
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
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        {tr('controls.advanced_parameters')}
                    </AccordionSummary>
                    <AccordionDetails>
                        <HYModelSelectInput
                            name='model'
                            filter={(m) => !m.path.endsWith('gguf')}
                        />
                        <KJHYCFG name='neg_prompt' />
                        <KJSchedulerSelectInput name='sampler' />
                        <KJAttentionSelectInput name='attention' />
                        <EnhanceVideoInput name='enhance_video' />
                        <TeaCacheInput name='tea_cache' defaultValue={0.2} />
                        <BlockSwapInput name='block_swap' />
                    </AccordionDetails>
                </Accordion>
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
