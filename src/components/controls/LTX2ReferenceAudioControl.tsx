import { useEventCallback } from '@mui/material';
import { useEffect } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { insertGraph } from '../../api/utils';
import { useRestoreValues } from '../../hooks/useRestoreValues';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { FileUpload } from './FileUpload';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';
import { UploadType } from './UploadType';

type TReferenceAudio = {
    enabled: boolean;
    audio: string;
    trim: number;
};

const defaultValue: TReferenceAudio = {
    enabled: false,
    audio: '',
    trim: 30,
};

export const LTX2ReferenceAudioControl = ({
    name = 'reference_audio',
}: {
    name?: string;
}) => {
    const setValue = useRestoreValues();
    const {
        field: { value },
    } = useController({
        name,
        defaultValue,
    });
    useEffect(() => {
        if (typeof value === 'string') {
            // received audio file name from another tab/history
            setValue(name, {
                enabled: true,
                audio: value,
                trim: 30,
            } as TReferenceAudio);
        }
    }, [name, setValue, value]);
    const enabled = useWatch({ name: `${name}.enabled` });
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (api: any, value: TReferenceAudio, control: controlType) => {
            if (!value || !value.enabled || !value.audio) {
                return;
            }
            const length = getValues('length');
            const fps = getValues('fps');
            const duration = length / fps;
            const { audio_vae_node_id, concat_node_id } = control;
            const wf = {
                ':1': {
                    inputs: {
                        audio: value.audio,
                        audioUI: '',
                    },
                    class_type: 'LoadAudio',
                    _meta: {
                        title: 'Load Audio',
                    },
                },
                ':2': {
                    inputs: {
                        audio_vae: [audio_vae_node_id, 0],
                        audio: [':1', 0],
                    },
                    class_type: 'LTXVAudioVAEEncode',
                    _meta: {
                        title: 'LTXV Audio VAE Encode',
                    },
                },
                ':3': {
                    inputs: {
                        video_fps: fps,
                        video_start_time: 0,
                        video_end_time: duration,
                        audio_latent: [':2', 0],
                        audio_start_time:
                            value.trim < duration ? value.trim : duration,
                        audio_end_time: duration,
                        max_length: 'pad',
                    },
                    class_type: 'LTXVAudioVideoMask',
                    _meta: {
                        title: 'LTXV Audio/Video Mask',
                    },
                },
            };
            const nodeID = insertGraph(api, wf);
            api[concat_node_id].inputs.audio_latent = [nodeID + ':3', 1];
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <>
            <ToggleInput
                name={`${name}.enabled`}
                label='reference_audio_enabled'
            />
            {enabled && (
                <>
                    <FileUpload
                        name={`${name}.audio`}
                        label='audio'
                        type={UploadType.AUDIO}
                    />
                    <SliderInput
                        name={`${name}.trim`}
                        label='trim'
                        min={0}
                        max={30}
                        step={0.1}
                        defaultValue={30}
                    />
                </>
            )}
        </>
    );
};
