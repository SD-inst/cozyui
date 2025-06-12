import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { Box } from '@mui/system';
import { useTranslate } from '../../i18n/I18nContext';
import { CFGInput } from '../controls/CFGInput';
import { DescribeButton } from '../controls/DescribeButton';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LLMSelectInput } from '../controls/LLMSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SelectInput } from '../controls/SelectInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';

const Content = () => {
    const tr = useTranslate();
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <SelectInput
                    name='suffix'
                    defaultValue=' The scene is captured in real-life footage.'
                    choices={[
                        { text: '<None>', value: '' },
                        ' The scene is captured in real-life footage.',
                        ' The scene appears to be from a movie or TV show.',
                        ' The scene is computer-generated imagery.',
                    ]}
                />
                <LLMSelectInput name='llm' />
                <DescribeButton />
                <TextInput name='prompt' multiline />
                <Box display='flex' flexDirection='row' width='100%' mt={2}>
                    <Box display='flex' flexDirection='column' flex={1}>
                        <SliderInput
                            name='max_width'
                            defaultValue={800}
                            min={128}
                            max={1280}
                            step={32}
                        />
                        <SliderInput
                            name='max_height'
                            defaultValue={800}
                            min={128}
                            max={1280}
                            step={32}
                        />
                    </Box>
                    <Box display='flex' alignItems='center'>
                        <SwapButton
                            names={['width', 'height']}
                            sx={{ mt: 3 }}
                        />
                    </Box>
                </Box>
                <LengthInput
                    name='length'
                    min={9}
                    max={257}
                    step={8}
                    defaultValue={129}
                    fps={25}
                />
                <SliderInput name='steps' defaultValue={25} min={5} max={50} />
                <CFGInput defaultValue={3} />
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        {tr('controls.advanced_parameters')}
                    </AccordionSummary>
                    <AccordionDetails>
                        <TextInput
                            name='neg_prompt'
                            defaultValue='low quality, worst quality, deformed, distorted, disfigured, motion smear, motion artifacts, fused fingers, bad anatomy, weird hand, ugly'
                            multiline
                        />
                        <SliderInput
                            name='stg'
                            defaultValue={1}
                            min={0}
                            max={5}
                            step={0.05}
                        />
                        <SliderInput
                            name='stg_rescale'
                            defaultValue={0.75}
                            min={0}
                            max={1}
                            step={0.05}
                        />
                        <SelectInput
                            name='stg_mode'
                            choices={[
                                { text: 'Attention', value: 'attention' },
                                { text: 'Residual', value: 'residual' },
                            ]}
                            defaultValue='attention'
                        />
                        <SliderInput
                            name='compression'
                            defaultValue={29}
                            min={1}
                            max={50}
                        />
                        <SelectInput
                            name='sampler'
                            choices={[
                                { text: 'Euler', value: 'euler' },
                                { text: 'Euler a', value: 'euler_ancestral' },
                                { text: 'DPM++ 2M', value: 'dpmpp_2m' },
                                { text: 'DPM++ 3M SDE', value: 'dpmpp_3m_sde' },
                            ]}
                            defaultValue={'euler'}
                        />
                    </AccordionDetails>
                </Accordion>
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

export const LTXI2VTab = (
    <WFTab label='LTX I2V' value='LTX I2V' group='I2V' content={<Content />} />
);
