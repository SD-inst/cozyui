import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { useCallback } from 'react';
import { getFreeNodeId } from '../../api/utils';
import { useRegisterHandler } from '../contexts/TabContext';
import { DescribeButton } from '../controls/DescribeButton';
import { FileUpload } from '../controls/FileUpload';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { SeedInput } from '../controls/SeedInput';
import { SelectInput } from '../controls/SelectInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { GenerateButton } from '../GenerateButton';
import { WFTab } from '../WFTab';

const Content = () => {
    const handler = useCallback((api: any, value: string) => {
        if (!value) {
            return;
        }
        const id = getFreeNodeId(api);
        api[id] = {
            inputs: {
                image: value,
                upload: 'image',
            },
            class_type: 'LoadImage',
            _meta: {
                title: 'End Image',
            },
        };
        api['82'].inputs['end_img'] = ['' + id, 0];
    }, []);
    useRegisterHandler({ name: 'image_end', handler });
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' label='start image' />
                <FileUpload name='image_end' label='end image (optional)' />
                <SelectInput
                    name='suffix'
                    label='Description suffix (optional)'
                    defaultValue=''
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
                <DescribeButton
                    api='Describe image'
                    text='Describe'
                    hideErrors
                />
                <TextInput name='prompt' multiline />
                <LengthInput name='length' min={1} max={49} defaultValue={49} />
                <SliderInput name='steps' defaultValue={25} min={5} max={50} />
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        Advanced parameters
                    </AccordionSummary>
                    <AccordionDetails>
                        <TextInput
                            name='neg_prompt'
                            defaultValue='Blurring, mutation, deformation, distortion, dark and solid, comics.'
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
                        <SelectInput
                            name='sampler'
                            choices={[
                                { text: 'Flow', value: 'Flow' },
                                { text: 'Euler', value: 'Euler' },
                                { text: 'Euler a', value: 'Euler A' },
                                { text: 'DPM++ 2M', value: 'DPM++' },
                            ]}
                            defaultValue={'Flow'}
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

export const EasyAnimateI2VTab = (
    <WFTab
        label='EasyAnimate I2V'
        value='EasyAnimate I2V'
        content={<Content />}
    />
);
