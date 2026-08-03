import { useEventCallback } from '@mui/material';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { MiniMaxH3ResolutionSelector } from '../../controls/MiniMaxH3ResolutionSelector';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UploadType } from '../../controls/UploadType';
import { VideoResult } from '../../controls/VideoResult';
import { WFTab } from '../../WFTab';
import { controlType } from '../../../redux/config';
import { useRegisterHandler } from '../../contexts/TabContext';

const ImageFrameInput = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: any, value: string, control: controlType) => {
            if (!value) {
                return;
            }
            const imageNodeId = control.image_node_id;
            api[imageNodeId] = {
                inputs: { image: value },
                class_type: 'LoadImage',
                _meta: { title: 'Load Image' },
            };
            api[control.node_id].inputs[control.field] = [imageNodeId, 0];
        },
    );
    useRegisterHandler({ name, handler });
    return <FileUpload name={name} type={UploadType.IMAGE} />;
};

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <ImageFrameInput name='first_frame' />
                <ImageFrameInput name='last_frame' />
                <TextInput name='prompt' sx={{ mb: 2 }} multiline />
                <MiniMaxH3ResolutionSelector
                    name='aspect_ratio'
                    defaultValue='16:9 (Widescreen)'
                />
                <SliderInput
                    name='megapixels'
                    label='size_mp'
                    defaultValue={0.4}
                    min={0.1}
                    max={2}
                    step={0.1}
                />
                <SliderInput
                    name='length'
                    label='length'
                    defaultValue={5}
                    min={1}
                    max={30}
                    step={0.1}
                />
                <SliderInput name='steps' defaultValue={20} min={1} max={50} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='minimax_h3'
                        component='UNETLoader'
                        field='unet_name'
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput
                        name='sampler'
                        defaultValue='res_multistep'
                    />
                </AdvancedSettings>
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <VideoResult rate_override={4} />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const MiniMaxH3I2VTab = (
    <WFTab
        label='MiniMax H3'
        value='MiniMax H3 I2V'
        group='I2V'
        receivers={[
            { name: 'first_frame', acceptedTypes: ['images', 'gifs'] },
            { name: 'last_frame', acceptedTypes: ['images', 'gifs'] },
        ]}
        content={<Content />}
    />
);
