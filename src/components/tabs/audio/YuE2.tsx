import { AbcPlanningToggle } from '../../controls/AbcPlanningToggle';
import { AbcResultPanel } from '../../controls/AbcResultPanel';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { AudioResult } from '../../controls/AudioResult';
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
import { WFTab } from '../../WFTab';

const defaultStyle =
    'Upbeat indie pop with warm female vocals, bright electric guitars, punchy drums, melodic bass, and subtle synth layers. Catchy and energetic, with an uplifting summer atmosphere, a memorable chorus, and polished modern production.';

const defaultLyrics = `[Verse]
Morning light across the window
City waking down below
I can hear the streets are calling
Feels like somewhere we should go

[Chorus]
Run with me into the sunlight
Leave the shadows far behind
We don't need to know tomorrow
Tonight the whole world feels alive

[Verse]
Radio playing through the open door
Laughing like we did before
Every mile becomes a memory
And I just want a little more

[Chorus]
Run with me into the sunlight
Leave the shadows far behind
We don't need to know tomorrow
Tonight the whole world feels alive`;

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput
                    name='style'
                    multiline
                    sx={{ mb: 2 }}
                    defaultValue={defaultStyle}
                />
                <TextInput
                    name='lyrics'
                    multiline
                    sx={{ mb: 2 }}
                    defaultValue={defaultLyrics}
                />
                <AbcPlanningToggle
                    name='abc_planning'
                    label='abc_planning'
                    defaultValue={true}
                />
                <LengthInput
                    min={1}
                    max={480}
                    step={1}
                    name='length'
                    defaultValue={240}
                    fps={1}
                />
                <SliderInput name='steps' defaultValue={32} min={1} max={100} />
                <AdvancedSettings>
                    <TextInput
                        name='abc'
                        multiline
                        sx={{ mb: 2 }}
                        defaultValue=''
                    />
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
                <AbcResultPanel />
            </GridRight>
            <GridBottom>
                <GenerateButton requiredControls='style' />
            </GridBottom>
        </Layout>
    );
};

export const YuE2Tab = (
    <WFTab label='YuE2' value='YuE2' group='Music' content={<Content />} />
);
