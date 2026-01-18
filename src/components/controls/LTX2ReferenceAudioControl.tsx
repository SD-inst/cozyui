import { useEventCallback } from '@mui/material';
import { useEffect } from 'react';
import { useController, useWatch } from 'react-hook-form';
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
    trim: 60,
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
                trim: 60,
            } as TReferenceAudio);
        }
    }, [name, setValue, value]);
    const enabled = useWatch({ name: `${name}.enabled` });
    const handler = useEventCallback(
        (api: any, value: TReferenceAudio, control: controlType) => {
            if (!value || !value.enabled || !value.audio) {
                return;
            }
            const { audio_vae_node_id, size_node_id, concat_node_id } = control;
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
                        start_index: 0,
                        duration: value.trim,
                        audio: [':1', 0],
                    },
                    class_type: 'TrimAudioDuration',
                    _meta: {
                        title: 'Trim Audio Duration',
                    },
                },
                ':3': {
                    inputs: {
                        audio_vae: [audio_vae_node_id, 0],
                        audio: [':2', 0],
                    },
                    class_type: 'LTXVAudioVAEEncode',
                    _meta: {
                        title: 'LTXV Audio VAE Encode',
                    },
                },
                ':4': {
                    inputs: {
                        value: 0,
                        width: [size_node_id, 0],
                        height: [size_node_id, 1],
                    },
                    class_type: 'SolidMask',
                    _meta: {
                        title: 'SolidMask',
                    },
                },
                ':5': {
                    inputs: {
                        samples: [':3', 0],
                        mask: [':4', 0],
                    },
                    class_type: 'SetLatentNoiseMask',
                    _meta: {
                        title: 'Set Latent Noise Mask',
                    },
                },
            };
            const nodeID = insertGraph(api, wf);
            api[concat_node_id].inputs.audio_latent = [nodeID + ':5', 0];
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
