import { useWatch } from 'react-hook-form';
import { useRegisterHandler } from '../../contexts/TabContext';
import { ArrayInput } from '../ArrayInput';
import { FileUpload } from '../FileUpload';
import { keyframeHandler } from '../keyframeHandler';
import { LengthInput } from '../LengthSlider';
import { SliderInput } from '../SliderInput';
import { ToggleInput } from '../ToggleInput';
import { UploadType } from '../UploadType';
import { Box } from '@mui/material';

const newValue = { pos: 0, enabled: true };

export const LTX2KeyframesControl = ({
    name = 'keyframes',
    receiverFieldName = 'keyframe',
}) => {
    useRegisterHandler({ name, handler: keyframeHandler });
    const fps = useWatch({ name: 'fps', defaultValue: 24 });
    return (
        <ArrayInput
            name={name}
            newValue={newValue}
            receiverFieldName={receiverFieldName}
            targetFieldName='image'
        >
            <FileUpload
                name='image'
                label='image'
                type={UploadType.IMAGEORVIDEO}
            />
            <LengthInput
                name='position'
                label='keyframe_position'
                min={0}
                max={601}
                fps={fps}
                step={8}
                defaultValue={0}
            />
            <Box display='flex' flexWrap='wrap' alignItems='center' gap={4}>
                <SliderInput
                    name='strength'
                    label='keyframe_strength'
                    min={0}
                    max={1}
                    defaultValue={0.5}
                    step={0.01}
                    sx={{ minWidth: 200, flex: 1 }}
                />
                <LengthInput
                    name='trim'
                    label='keyframe_trim'
                    min={0}
                    max={120}
                    fps={fps}
                    defaultValue={0}
                    step={8}
                    sx={{ minWidth: 200, flex: 1 }}
                />
                <ToggleInput name='last' label='keyframe_last' sx={{ mt: 1 }} />
            </Box>
            <ToggleInput name='enabled' label='enabled' />
        </ArrayInput>
    );
};
