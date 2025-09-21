import { AdvancedSettings } from '../controls/AdvancedSettings';
import { AudioResult } from '../controls/AudioResult';
import { CFGInput } from '../controls/CFGInput';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput
                    name='prompt'
                    multiline
                    sx={{ mb: 2 }}
                    defaultValue='funk, pop, soul, rock, melodic, guitar, drums, bass, keyboard, percussion, 105 BPM, energetic, upbeat, groovy, vibrant, dynamic'
                />
                <TextInput
                    name='lyrics'
                    multiline
                    sx={{ mb: 2, maxHeight: 300, overflowY: 'scroll' }}
                    defaultValue={`[intro]

[verse]
Neon lights they flicker bright
City hums in dead of night
Rhythms pulse through concrete veins
Lost in echoes of refrains

[verse]
Bassline groovin' in my chest
Heartbeats match the city's zest
Electric whispers fill the air
Synthesized dreams everywhere

[breakdown]

[chorus]
Turn it up and let it flow
Feel the fire let it grow
In this rhythm we belong
Hear the night sing out our song

[guitar solo]

[verse]
Guitar strings they start to weep
Wake the soul from silent sleep
Every note a story told
In this night we’re bold and gold

[bridge]
Voices blend in harmony
Lost in pure cacophony
Timeless echoes timeless cries
Soulful shouts beneath the skies

[verse]
Keyboard dances on the keys
Melodies on evening breeze
Catch the tune and hold it tight
In this moment we take flight

[outro]`}
                />
                <SliderInput
                    min={1}
                    max={300}
                    step={0.1}
                    name='length'
                    defaultValue={170}
                />
                <SliderInput name='steps' defaultValue={50} min={1} max={100} />
                <CFGInput defaultValue={5} />
                <FlowShiftInput defaultValue={5} />
                <AdvancedSettings>
                    <SamplerSelectInput
                        name='sampler'
                        defaultValue='res_multistep'
                    />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <SliderInput
                        name='lyrics_strength'
                        defaultValue={0.9}
                        min={0}
                        max={3}
                        step={0.01}
                    />
                    <SliderInput
                        name='vocal_volume'
                        defaultValue={0.3}
                        min={0}
                        max={3}
                        step={0.01}
                    />
                </AdvancedSettings>
                <SeedInput name='seed' />
            </GridLeft>
            <GridRight>
                <AudioResult loop={false} />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const ACEStepTab = (
    <WFTab
        label='ACE Step'
        value='ACE Step'
        group='Music'
        content={<Content />}
    />
);
