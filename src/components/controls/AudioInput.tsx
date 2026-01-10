import { Box, BoxProps, useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { replaceNodeConnection } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { FileUpload } from './FileUpload';
import { ToggleInput } from './ToggleInput';
import { UploadType } from './UploadType';

export const AudioInput = ({
    toggleName,
    audioName,
    ...props
}: BoxProps & {
    toggleName: string;
    audioName: string;
}) => {
    const { watch, getValues } = useFormContext();
    const handler = useEventCallback(
        (api: any, value: boolean, control: controlType) => {
            const audio = getValues(audioName);
            if (
                !value ||
                !audio ||
                !control.tts_node_id ||
                !control.tts_field
            ) {
                return;
            }
            const audioNode = {
                inputs: {
                    audio: getValues(audioName),
                },
                class_type: 'LoadAudio',
                _meta: {
                    title: 'LoadAudio',
                },
            };
            replaceNodeConnection(
                api,
                control.tts_node_id,
                control.tts_field,
                audioNode
            );
        }
    );
    useRegisterHandler({ name: toggleName, handler });
    return (
        <Box display='flex' flexDirection='column' gap={1} {...props}>
            <ToggleInput name={toggleName} />
            {watch(toggleName) && (
                <FileUpload name={audioName} type={UploadType.AUDIO} />
            )}
        </Box>
    );
};
