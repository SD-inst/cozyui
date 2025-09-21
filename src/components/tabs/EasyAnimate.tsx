import { useCallback } from 'react';
import { getFreeNodeId } from '../../api/utils';
import { useRegisterHandler } from '../contexts/TabContext';
import { AdvancedSettings } from '../controls/AdvancedSettings';
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
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
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
                <FileUpload name='image' />
                <FileUpload name='image_end' />
                <SelectInput
                    name='suffix'
                    defaultValue=''
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
                <LengthInput name='length' min={1} max={49} defaultValue={49} />
                <SliderInput name='steps' defaultValue={25} min={5} max={50} />
                <CFGInput defaultValue={3} />
                <AdvancedSettings>
                    <TextInput
                        name='neg_prompt'
                        defaultValue='Blurring, mutation, deformation, distortion, dark and solid, comics.'
                        multiline
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
                </AdvancedSettings>
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
        group='I2V'
        receivers={[
            { name: 'image', acceptedTypes: 'images' },
            { name: 'image_end', acceptedTypes: 'images' },
        ]}
        content={<Content />}
    />
);
