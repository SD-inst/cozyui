import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { Box } from '@mui/system';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useResult, useResultParam } from '../../hooks/useResult';
import { useAppDispatch } from '../../redux/hooks';
import { delResult } from '../../redux/result';
import { FileUpload } from '../controls/FileUpload';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { SeedInput } from '../controls/SeedInput';
import { SelectInput } from '../controls/SelectInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { GenerateButton } from '../GenerateButton';
import { WFTab } from '../WFTab';

const Content = () => {
    const results = useResult({ tabOverride: 'Describe image' });
    const { id } = useResultParam('Describe image');
    const dispatch = useAppDispatch();
    const form = useFormContext();
    useEffect(() => {
        if (results.length) {
            form.setValue('prompt', results[0] as string);
            dispatch(delResult({ node_id: id }));
        }
    }, [results, form, dispatch, id]);
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <SelectInput
                    name='suffix'
                    label='Description suffix'
                    defaultValue=' The scene is captured in real-life footage.'
                    choices={[
                        { text: '<None>', value: '' },
                        ' The scene is captured in real-life footage.',
                        ' The scene appears to be from a movie or TV show.',
                        ' The scene is computer-generated imagery.',
                    ]}
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
                <GenerateButton
                    tabOverride='Describe image'
                    text='Describe'
                    hideErrors
                />
                <TextInput name='prompt' multiline />
                <Box display='flex' flexDirection='row' width='100%' mt={2}>
                    <Box display='flex' flexDirection='column' flex={1}>
                        <SliderInput
                            name='width'
                            label='max width'
                            defaultValue={800}
                            min={128}
                            max={1280}
                            step={32}
                        />
                        <SliderInput
                            name='height'
                            label='max height'
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
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        Advanced parameters
                    </AccordionSummary>
                    <AccordionDetails>
                        <TextInput
                            name='neg_prompt'
                            defaultValue='low quality, worst quality, deformed, distorted, disfigured, motion smear, motion artifacts, fused fingers, bad anatomy, weird hand, ugly'
                            label='negative prompt'
                            multiline
                        />
                        <SliderInput
                            name='cfg'
                            label='CFG'
                            defaultValue={3}
                            min={1}
                            max={10}
                            step={0.1}
                        />
                        <SliderInput
                            name='stg'
                            label='STG'
                            defaultValue={1}
                            min={0}
                            max={5}
                            step={0.05}
                        />
                        <SliderInput
                            name='stg_rescale'
                            label='STG rescale'
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
                            label='STG mode'
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
    <WFTab label='LTX I2V' value='LTX I2V' content={<Content />} />
);
