import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { UploadType } from '../controls/UploadType';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' type={UploadType.IMAGE} />
                <PromptInput name='prompt' />
                <PromptInput name='neg_prompt' />
                <SliderInput
                    name='upscale'
                    min={1}
                    max={5}
                    step={0.1}
                    defaultValue={2}
                />
                <WidthHeight
                    widthName='tile_width'
                    heightName='tile_height'
                    maxWidth={2048}
                    maxHeight={2048}
                />
                <SliderInput name='steps' defaultValue={10} min={1} max={40} />
                <SliderInput
                    name='denoise'
                    defaultValue={0.3}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <AdvancedSettings>
                    <CFGInput defaultValue={3} step={0.1} />
                    <SliderInput
                        name='padding'
                        min={0}
                        max={256}
                        step={1}
                        defaultValue={64}
                    />
                    <SliderInput
                        name='mask_blur'
                        min={0}
                        max={128}
                        step={1}
                        defaultValue={8}
                    />
                    <SamplerSelectInput
                        name='sampler'
                        defaultValue='dpmpp_3m_sde'
                    />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <ModelSelectAutocomplete
                        name='upscale_model'
                        type=''
                        component='UpscaleModelLoader'
                        field='model_name'
                        previews={false}
                        sx={{ mt: 2 }}
                    />
                </AdvancedSettings>
                <ModelSelectAutocomplete
                    component='CheckpointLoaderSimple'
                    field='ckpt_name'
                    name='model'
                    type='sd'
                    sx={{ mb: 2 }}
                />
                <LoraInput name='lora' type='sd' />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const SDUpscaleTab = (
    <WFTab
        label='SD'
        value='SD Upscale'
        group='Upscale'
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
