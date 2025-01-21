import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useResult } from '../../hooks/useResult';
import { FileUpload } from '../controls/FileUpload';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { GenerateButton } from '../GenerateButton';
import { WFTab } from '../WFTab';
import { SelectInput } from '../controls/SelectInput';
import { SeedInput } from '../controls/SeedInput';
import { LengthInput } from '../controls/LengthSlider';
import { SliderInput } from '../controls/SliderInput';
import { Box } from '@mui/system';
import { SwapButton } from '../controls/SwapButton';

const Content = () => {
    const results = useResult({ tabOverride: 'Describe image' });
    const form = useFormContext();
    useEffect(() => {
        if (results.length) {
            form.setValue('prompt', results[0] as string);
        }
    }, [results, form]);
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
                <SliderInput
                    name='compression'
                    defaultValue={29}
                    min={1}
                    max={50}
                    label={`compression (increase if there's no animation)`}
                />
                <SliderInput name='steps' defaultValue={25} min={5} max={50} />
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
