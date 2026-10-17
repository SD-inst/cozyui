import { useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { AudioResult } from '../../controls/AudioResult';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { SeedInput } from '../../controls/SeedInput';
import { SelectInput } from '../../controls/SelectInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UploadType } from '../../controls/UploadType';
import { useTranslate } from '../../../i18n/I18nContext';
import { controlType } from '../../../redux/config';
import { Workflow } from '../../../api/graph';
import { useRegisterHandler } from '../../contexts/TabContext';
import { WFTab } from '../../WFTab';

// Picks the generation node class from the scenario and rewrites the single
// generation node in place (all three classes share the same single audio
// output, so the Save node link never changes):
// - no reference audio  -> BreezeTTS2VoiceDesign (LoadAudio/Whisper removed)
// - audio, no instruction -> BreezeTTS2VoiceClone
// - audio + instruction -> BreezeTTS2VoiceDirection (adds stitch_reference)
const ModeHandler = ({ name }: { name: string }) => {
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (api: Workflow, value: any, control: controlType) => {
            const gen = api[control.gen_node_id];
            const audio = (getValues(control.audio_field) as string) || '';
            const instruction =
                typeof value === 'string' ? value.trim() : '';
            if (!audio) {
                delete api[control.whisper_node_id];
                delete api[control.load_audio_id];
                gen.class_type = 'BreezeTTS2VoiceDesign';
                gen._meta = { title: 'Breeze TTS 2 Voice Design' };
                delete gen.inputs.reference_audio;
                delete gen.inputs.reference_text;
                delete gen.inputs.stitch_reference;
                gen.inputs.instruction = instruction;
            } else if (!instruction) {
                gen.class_type = 'BreezeTTS2VoiceClone';
                gen._meta = { title: 'Breeze TTS 2 Voice Clone' };
                delete gen.inputs.instruction;
                delete gen.inputs.stitch_reference;
                gen.inputs.reference_audio = [control.load_audio_id, 0];
                gen.inputs.reference_text = [control.whisper_node_id, 1];
            } else {
                const stitch =
                    (getValues(control.stitch_field) as string) || 'none';
                gen.class_type = 'BreezeTTS2VoiceDirection';
                gen._meta = { title: 'Breeze TTS 2 Voice Direction' };
                gen.inputs.reference_audio = [control.load_audio_id, 0];
                gen.inputs.reference_text = [control.whisper_node_id, 1];
                gen.inputs.instruction = instruction;
                gen.inputs.stitch_reference = stitch;
            }
        },
    );
    useRegisterHandler({ name, handler });
    return null;
};

const Content = () => {
    const tr = useTranslate();
    return (
        <Layout>
            <GridLeft>
                <TextInput
                    name='prompt'
                    multiline
                    defaultValue='(sigh) It is good to hear your voice again after all this time.'
                    sx={{ mb: 2 }}
                />
                <FileUpload
                    name='audio_input'
                    label='reference_audio'
                    type={UploadType.AUDIO}
                />
                <TextInput
                    name='instruction'
                    label='voice_instruction'
                    multiline
                />
                <SliderInput
                    name='cfg'
                    min={1}
                    max={10}
                    step={0.1}
                    defaultValue={1}
                />
                <SliderInput
                    name='max_new_tokens'
                    min={64}
                    max={3000}
                    step={8}
                    defaultValue={1500}
                />
                <SeedInput name='seed' defaultValue={1024} seedLength={7} />
                <AdvancedSettings>
                    <SelectInput
                        name='stitch_reference'
                        defaultValue='none'
                        choices={[
                            { text: tr('controls.stitch_none'), value: 'none' },
                            {
                                text: tr('controls.stitch_before'),
                                value: 'before',
                            },
                            { text: tr('controls.stitch_after'), value: 'after' },
                        ]}
                    />
                    <SliderInput
                        name='temperature'
                        min={0}
                        max={2}
                        step={0.05}
                        defaultValue={0.9}
                    />
                    <SliderInput
                        name='top_k'
                        min={0}
                        max={1024}
                        step={1}
                        defaultValue={50}
                    />
                    <SliderInput
                        name='top_p'
                        min={0}
                        max={1}
                        step={0.01}
                        defaultValue={1}
                    />
                    <SliderInput
                        name='repetition_penalty'
                        min={0}
                        max={2}
                        step={0.05}
                        defaultValue={1.1}
                    />
                    <SliderInput
                        name='depth_temperature'
                        min={0}
                        max={2}
                        step={0.05}
                        defaultValue={0.9}
                    />
                    <SliderInput
                        name='depth_top_k'
                        min={0}
                        max={1024}
                        step={1}
                        defaultValue={50}
                    />
                    <SliderInput
                        name='depth_top_p'
                        min={0}
                        max={1}
                        step={0.01}
                        defaultValue={1}
                    />
                </AdvancedSettings>
                <ModeHandler name='instruction' />
            </GridLeft>
            <GridRight>
                <AudioResult loop={false} />
            </GridRight>
            <GridBottom>
                <GenerateButton requiredControls={['prompt']} />
            </GridBottom>
        </Layout>
    );
};

export const BreezeSingleSpeakerTab = (
    <WFTab
        label='Breeze Single-Speaker'
        value='Breeze Single-Speaker'
        group='TTS'
        content={<Content />}
    />
);
