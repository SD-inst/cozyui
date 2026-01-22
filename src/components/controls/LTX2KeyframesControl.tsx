import { useWatchForm } from '../../hooks/useWatchForm';
import { useRegisterHandler } from '../contexts/TabContext';
import { ArrayInput } from './ArrayInput';
import { FileUpload } from './FileUpload';
import { keyframeHandler } from './keyframeHandler';
import { LengthInput } from './LengthSlider';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';
import { UploadType } from './UploadType';

export const LTX2KeyframesControl = ({
    name = 'keyframes',
    receiverFieldName = 'keyframe',
}) => {
    useRegisterHandler({ name, handler: keyframeHandler });
    const fps = useWatchForm('fps');
    return (
        <ArrayInput
            name={name}
            newValue={{ pos: 0, enabled: true }}
            receiverFieldName={receiverFieldName}
            targetFieldName='image'
        >
            <FileUpload name='image' label='image' type={UploadType.IMAGEORVIDEO} />
            <LengthInput
                name='position'
                label='keyframe_position'
                min={0}
                max={601}
                fps={fps}
                step={8}
                defaultValue={0}
            />
            <SliderInput
                name='strength'
                label='keyframe_strength'
                min={0}
                max={1}
                defaultValue={1}
                step={0.01}
            />
            <ToggleInput name='enabled' label='enabled' />
        </ArrayInput>
    );
};
