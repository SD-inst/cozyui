import { AbcResultPanel } from '../../controls/AbcResultPanel';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { AudioResult } from '../../controls/AudioResult';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LengthInput } from '../../controls/LengthSlider';
import { LoraInput } from '../../controls/LoraInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UploadType } from '../../controls/UploadType';
import { WFTab } from '../../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='audio' type={UploadType.AUDIO} />
                <TextInput
                    name='style'
                    multiline
                    sx={{ mb: 2 }}
                    defaultValue='Power metal with riffs'
                />
                <TextInput
                    name='lyrics'
                    multiline
                    sx={{ mb: 2 }}
                    defaultValue='[Instrumental]'
                />
                <LengthInput
                    min={1}
                    max={480}
                    step={1}
                    name='length'
                    defaultValue={180}
                    fps={1}
                />
                <SliderInput name='steps' defaultValue={32} min={1} max={100} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='yue2'
                        component='CheckpointLoaderSimple'
                        field='ckpt_name'
                        previews={false}
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='er_sde' />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='beta57'
                    />
                    <SliderInput
                        name='temperature'
                        defaultValue={1}
                        min={0}
                        max={2}
                        step={0.01}
                    />
                    <SliderInput
                        name='top_p'
                        defaultValue={0.95}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                    <SliderInput
                        name='top_k'
                        defaultValue={100}
                        min={0}
                        max={1000}
                    />
                    <SliderInput
                        name='repetition_penalty'
                        defaultValue={1.2}
                        min={1}
                        max={2}
                        step={0.01}
                    />
                </AdvancedSettings>
                <LoraInput name='lora' type='yue2' sx={{ mb: 2 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <AudioResult loop={false} />
                <AbcResultPanel targetTab='YuE2' />
            </GridRight>
            <GridBottom>
                <GenerateButton requiredControls='audio' />
            </GridBottom>
        </Layout>
    );
};

export const YuE2CoverTab = (
    <WFTab
        label='YuE2 Cover'
        value='YuE2 Cover'
        group='Music'
        content={<Content />}
    />
);
