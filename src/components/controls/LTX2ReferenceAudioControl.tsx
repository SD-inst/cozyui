import { useEffect } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { useRestoreValues } from '../../hooks/useRestoreValues';
import { useRegisterHandler } from '../contexts/TabContext';
import { FileUpload } from './FileUpload';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';
import { UploadType } from './UploadType';
import {
    TReferenceAudio,
    useReferenceAudioHandler,
} from './referenceAudioHandler';

const defaultValue: TReferenceAudio = {
    enabled: false,
    source: false,
    igc: 0,
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
                ...defaultValue,
                enabled: true,
                audio: value,
            });
        }
    }, [name, setValue, value]);
    const enabled = useWatch({ name: `${name}.enabled` });
    const source = useWatch({ name: `${name}.source` });
    const handler = useReferenceAudioHandler();
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
                    <ToggleInput name={`${name}.source`} label='source' />
                    {source && (
                        <SliderInput
                            name={`${name}.trim`}
                            label='trim'
                            min={0}
                            max={30}
                            step={0.1}
                            defaultValue={30}
                        />
                    )}
                    {!source && (
                        <SliderInput
                            name={`${name}.igc`}
                            label='igc'
                            min={0}
                            max={10}
                            step={1}
                            defaultValue={0}
                        />
                    )}
                </>
            )}
        </>
    );
};
