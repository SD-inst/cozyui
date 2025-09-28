import { AdvancedSettings } from '../controls/AdvancedSettings';
import { AudioResult } from '../controls/AudioResult';
import { CFGInput } from '../controls/CFGInput';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { SeedInput } from '../controls/SeedInput';
import { SelectInput } from '../controls/SelectInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { UploadType } from '../controls/UploadType';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='audio' type={UploadType.AUDIO} />
                <TextInput
                    name='lyrics'
                    multiline
                    sx={{ mb: 2 }}
                    defaultValue={`[intro] [intro] [intro] [intro] [intro] [intro] [intro] [intro]

[verse]
Sunlight spills on the dusty ground.
Shadows stretch but make no sound.
The creak of the porch as we sway in tune.
Chasing whispers of an afternoon.

[chorus]
Oh those sunny old days never fade.
Carved in gold like a hand-made braid.
We'd run through the fields where the wild winds play.
Lost in the warmth of those sunny old days.

[inst] [chorus] [inst] [chorus] [inst] [chorus] [inst] [chorus]

[verse]
Barefoot steps on the gravel trail.
The scent of rain in the summer gale.
Laughter echoes where the tall grass bends.
Stories we swore would never end.

[chorus]
Oh those sunny old days never fade.
Carved in gold like a hand-made braid.
We'd run through the fields where the wild winds play.
Lost in the warmth of those sunny old days.

[bridge]
The years may pull us far from here.
But in my heart they're always near.
The sky still holds that endless hue.
And every sunbeam whispers you.

[chorus]
Oh those sunny old days never fade.
Carved in gold like a hand-made braid.
We'd run through the fields where the wild winds play.
Lost in the warmth of those sunny old days.

[outro] [outro] [outro] [outro] [outro] [outro] [outro] [outro]`}
                />
                <LengthInput
                    min={1}
                    max={250}
                    step={1}
                    name='length'
                    defaultValue={250}
                    fps={1}
                />
                <SliderInput name='steps' defaultValue={25} min={1} max={50} />
                <CFGInput defaultValue={1.3} max={10} step={0.01} />
                <AdvancedSettings>
                    <SelectInput
                        name='sampler'
                        choices={[
                            { text: 'Spiral', value: 'spiral' },
                            { text: 'Euler', value: 'discrete_euler' },
                            { text: 'Pingpong', value: 'pingpong' },
                        ]}
                        defaultValue='spiral'
                    />
                    <SliderInput
                        name='audio_len'
                        defaultValue={10}
                        min={1}
                        max={45}
                    />
                    <SliderInput
                        name='top_k'
                        defaultValue={150}
                        min={1}
                        max={1000}
                    />
                    <SliderInput
                        name='temperature'
                        defaultValue={1.05}
                        min={0}
                        max={1.5}
                        step={0.01}
                    />
                    <SliderInput
                        name='diff_temp'
                        defaultValue={0.91}
                        min={0}
                        max={1.5}
                        step={0.01}
                    />
                </AdvancedSettings>
                <SeedInput name='seed' seedLength={8} />
            </GridLeft>
            <GridRight>
                <AudioResult loop={false} />
            </GridRight>
            <GridBottom>
                <GenerateButton requiredControls={['audio', 'lyrics']} />
            </GridBottom>
        </Layout>
    );
};

export const SongBloomTab = (
    <WFTab
        label='SongBloom'
        value='SongBloom'
        group='Music'
        content={<Content />}
    />
);
