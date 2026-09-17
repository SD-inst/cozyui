import { useCallback, useEffect, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ChatComponent } from '../../chat/ChatComponent';
import {
    yue2EditingPrompt,
    yue2GenerationPrompt,
} from '../../chat/prompts/yue2';
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
import { SelectInput } from '../../controls/SelectInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { WFTab } from '../../WFTab';
import { useTranslate } from '../../../i18n/I18nContext';
import {
    buildStructuredPrompt,
    parseStructuredPrompt,
} from '../../../utils/structuredPrompt';

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

// Intercepts the transient `prompt` field the chat writes on "send to prompt",
// splits the structured // sections, and distributes them into the real
// fields (style / lyrics / abc). The transient field is cleared afterwards so
// it never lingers in the form or other tabs' send menus.
const useYuE2ChatReceiver = () => {
    const { setValue, unregister } = useFormContext();
    const promptValue = useWatch({ name: 'prompt' });
    useEffect(() => {
        if (!promptValue) {
            return;
        }
        const sections = parseStructuredPrompt(promptValue);
        if (sections.style !== undefined) {
            setValue('style', sections.style);
        }
        if (sections.lyrics !== undefined) {
            setValue('lyrics', sections.lyrics);
        }
        const abc = sections['ABC'] ?? sections['abc'];
        if (abc !== undefined) {
            setValue('abc', abc);
        }
        setValue('prompt', '');
        unregister('prompt');
    }, [promptValue, setValue, unregister]);
};

const Content = () => {
    const tr = useTranslate();
    const style = useWatch({ name: 'style' });
    const lyrics = useWatch({ name: 'lyrics' });
    const abc = useWatch({ name: 'abc' });

    // Editing mode: the first user message is built from the instruction plus
    // the current field values, all in the structured // format.
    const editingTransform = useCallback(
        (text: string) =>
            buildStructuredPrompt([
                ['instruction', text],
                ['style', style],
                ['lyrics', lyrics],
                ['ABC', abc || undefined],
            ]),
        [style, lyrics, abc],
    );

    // Recover the user's instruction from a transformed editing-mode message
    // (used by the "new chat" / "edit message" actions).
    const extractInstruction = useCallback(
        (content: string) =>
            parseStructuredPrompt(content)['instruction'] ?? '',
        [],
    );

    const modes = useMemo(
        () => [
            {
                id: 'generation',
                label: tr('controls.yue2_chat_mode_generation'),
                systemPrompt: yue2GenerationPrompt,
            },
            {
                id: 'editing',
                label: tr('controls.yue2_chat_mode_editing'),
                systemPrompt: yue2EditingPrompt,
                transformFirstMessage: editingTransform,
                extractText: extractInstruction,
            },
        ],
        [tr, editingTransform, extractInstruction],
    );

    useYuE2ChatReceiver();

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
                <ChatComponent
                    modes={modes}
                    defaultMode='generation'
                    promptFieldName='prompt'
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
                    <SelectInput
                        name='abc_mode'
                        defaultValue='full'
                        choices={[
                            { text: tr('controls.mode_full'), value: 'full' },
                            { text: tr('controls.mode_melody'), value: 'melody' },
                        ]}
                    />
                    <SelectInput
                        name='music_mode'
                        defaultValue='full'
                        choices={[
                            { text: tr('controls.mode_full'), value: 'full' },
                            { text: tr('controls.mode_melody'), value: 'melody' },
                        ]}
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
