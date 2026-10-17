import { useEventCallback } from '@mui/material';
import toast from 'react-hot-toast';
import { Workflow } from '../../../api/graph';
import { getFreeNodeId } from '../../../api/utils';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { ArrayInput } from '../../controls/ArrayInput';
import { AudioResult } from '../../controls/AudioResult';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { SeedInput } from '../../controls/SeedInput';
import { SectionAccordion } from '../../controls/SectionAccordion';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UploadType } from '../../controls/UploadType';
import { useTranslate } from '../../../i18n/I18nContext';
import { controlType } from '../../../redux/config';
import { useRegisterHandler } from '../../contexts/TabContext';
import { WFTab } from '../../WFTab';

const MAX_SPEAKERS = 8;

// Inserts one BreezeTTS2Speaker node per active ArrayInput entry and wires it
// into the Multi-Speaker node's optional speaker_1..speaker_8 cast slots.
// A slot with no reference audio gets audio "none" and is designed purely
// from its instruction; VALIDATE_INPUTS on the node accepts any filename
// present in the ComfyUI input folder, which uploaded files are.
const SpeakersHandler = ({ name }: { name: string }) => {
    const tr = useTranslate();
    const handler = useEventCallback(
        (api: Workflow, value: any, control: controlType) => {
            const entries = Array.isArray(value) ? value : [];
            let slot = 1;
            for (const entry of entries) {
                if (!entry || entry.skip) {
                    continue;
                }
                const speakerName = typeof entry.name === 'string' ? entry.name.trim() : '';
                if (!speakerName) {
                    continue;
                }
                if (slot > MAX_SPEAKERS) {
                    break;
                }
                const id = getFreeNodeId(api) + '';
                api[id] = {
                    inputs: {
                        name: speakerName,
                        audio: entry.audio || 'none',
                        reference_text: entry.reference_text || '',
                        auto_transcribe_if_empty: true,
                        instruction: entry.instruction || '',
                        cfg_scale: entry.cfg_scale ?? 1,
                    },
                    class_type: 'BreezeTTS2Speaker',
                    _meta: { title: 'Breeze TTS 2 Speaker' },
                };
                api[control.tts_node_id].inputs['speaker_' + slot] = [id, 0];
                slot++;
            }
            if (slot === 1) {
                toast.error(tr('toasts.breeze_no_speakers'));
            }
        },
    );
    useRegisterHandler({ name, handler });
    return null;
};

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput
                    name='prompt'
                    multiline
                    defaultValue={`Alice: Hey Bob, did you finish recording the demo?
Bob: (sigh) Almost. I just need one more take.
Alice: (laugh) That is what you said an hour ago!`}
                    sx={{ mb: 2 }}
                />
                <SectionAccordion
                    label='controls.speakers'
                    defaultExpanded
                    sx={{ mb: 2 }}
                >
                    <ArrayInput
                        name='speakers'
                        listMode
                        keyField='audio'
                        hideChatToggle
                        hideHeading
                        min={0}
                        max={MAX_SPEAKERS}
                        newValue={{
                            name: '',
                            audio: '',
                            reference_text: '',
                            instruction: '',
                            cfg_scale: 1,
                        }}
                    >
                        <TextInput name='name' label='speaker_name' />
                        <FileUpload
                            name='audio'
                            label='reference_audio'
                            type={UploadType.AUDIO}
                        />
                        <TextInput
                            name='reference_text'
                            label='reference_text'
                            multiline
                        />
                        <TextInput
                            name='instruction'
                            label='voice_instruction'
                            multiline
                        />
                        <SliderInput
                            name='cfg_scale'
                            label='speaker_cfg'
                            min={1}
                            max={10}
                            step={0.1}
                            defaultValue={1}
                        />
                    </ArrayInput>
                </SectionAccordion>
                <SliderInput
                    name='pause_between_speakers'
                    min={0}
                    max={3}
                    step={0.05}
                    defaultValue={0.3}
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
                <SpeakersHandler name='speakers' />
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

export const BreezeMultiSpeakerTab = (
    <WFTab
        label='Breeze Multi-Speaker'
        value='Breeze Multi-Speaker'
        group='TTS'
        content={<Content />}
    />
);
