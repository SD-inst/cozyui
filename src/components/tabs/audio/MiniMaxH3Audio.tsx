import { Box, useEventCallback } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { ArrayInput } from '../../controls/ArrayInput';
import { AudioResult } from '../../controls/AudioResult';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LoraInput } from '../../controls/LoraInput';
import { ModArrayInput } from '../../controls/ModArrayInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SectionAccordion } from '../../controls/SectionAccordion';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UploadType } from '../../controls/UploadType';

import { Workflow } from '../../../api/graph';
import { getFreeNodeId } from '../../../api/utils';
import { useMiniMaxH3AudioFirstMessageTransform } from '../../../hooks/useMiniMaxH3AudioFirstMessageTransform';
import { useMiniMaxH3RefModHandler } from '../../../hooks/useMiniMaxH3RefModHandler';
import { useTranslate } from '../../../i18n/I18nContext';
import { controlType } from '../../../redux/config';
import { ChatComponent } from '../../chat/ChatComponent';
import { useRegisterHandler } from '../../contexts/TabContext';
import { WFTab } from '../../WFTab';
import { anchorLengthInfo } from '../../controls/MiniMaxH3LatentAnchor';

const miniMaxH3AudioSystemPrompt = () =>
    import('../../chat/prompts/minimaxH3Audio').then(
        (m) => m.miniMaxH3AudioSystemPrompt,
    );

const audioValue = { audio: '' };

const ReferenceAudio = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (
            api: Workflow,
            value: Array<{ audio: string; skip?: boolean }>,
            control: controlType,
        ) => {
            if (!value || !value.length || !control.node_id) {
                return;
            }

            value.forEach((v, idx) => {
                if (!v.audio || v.skip) {
                    return;
                }
                const audioNodeID = getFreeNodeId(api) + '';
                api[audioNodeID] = {
                    inputs: { audio: v.audio },
                    class_type: 'LoadAudio',
                    _meta: { title: 'Load Audio' },
                };
                api[control.node_id].inputs['ref_audios.ref_audio_' + idx] = [
                    audioNodeID,
                    0,
                ];
            });
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={audioValue}
            keyField='audio'
            max={3}
            receiverFieldName='audio'
            targetFieldName='audio'
        >
            <FileUpload name='audio' label='audio' type={UploadType.AUDIO} />
        </ArrayInput>
    );
};

const LengthControl = () => {
    const tr = useTranslate();
    const length = useWatch({ name: 'length', defaultValue: 10 });
    const info = anchorLengthInfo(length);
    return (
        <SliderInput
            name='length'
            label='length'
            defaultValue={10}
            min={1}
            max={60}
            step={0.1}
            hint={tr('controls.length_info_audio', {
                seconds: (info.frames / 24).toFixed(2),
                audio: info.audioSlots,
            })}
        />
    );
};

const Content = () => {
    const transformFirstMessage = useMiniMaxH3AudioFirstMessageTransform();
    const refModHandler = useMiniMaxH3RefModHandler();
    useRegisterHandler({ name: 'refmods', handler: refModHandler });
    return (
        <Layout>
            <GridLeft>
                <SectionAccordion
                    label='controls.references'
                    defaultExpanded
                    sx={{ mb: 3 }}
                >
                    <Box display='flex' flexDirection='column' gap={3}>
                        <ModArrayInput name='refmods' max={8} />
                        <ReferenceAudio name='ref_audio' />
                    </Box>
                </SectionAccordion>
                <TextInput name='prompt' multiline />
                <ChatComponent
                    systemPrompt={miniMaxH3AudioSystemPrompt}
                    mediaFields={[
                        {
                            name: 'refmods',
                            kind: 'image',
                            itemField: 'id',
                            idbMod: true,
                        },
                        {
                            name: 'ref_audio',
                            kind: 'audio',
                            itemField: 'audio',
                        },
                    ]}
                    transformFirstMessage={transformFirstMessage}
                />
                <LengthControl />
                <SliderInput name='steps' defaultValue={50} min={1} max={100} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='minimax_h3'
                        component='UNETLoader'
                        field='unet_name'
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='seeds_2' />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='sgm_uniform'
                    />
                    <SliderInput
                        name='sigma_shift_audio'
                        label='sigma_shift_audio'
                        defaultValue={3}
                        min={0.1}
                        max={20}
                        step={0.1}
                    />
                </AdvancedSettings>
                <LoraInput name='lora' type='minimax_h3' sx={{ mt: 1 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <AudioResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const MiniMaxH3AudioTab = (
    <WFTab
        label='MiniMax H3 Audio'
        value='MiniMax H3 Audio'
        group='Audio'
        receivers={[{ name: 'ref_audio', acceptedTypes: ['audio'] }]}
        content={<Content />}
    />
);
