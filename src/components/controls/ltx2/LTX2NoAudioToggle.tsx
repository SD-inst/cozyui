import { useWatch } from 'react-hook-form';
import { ext } from '../fileExts';
import { ToggleInput, ToggleInputProps } from '../ToggleInput';
import { UploadType } from '../UploadType';

const videoExts = ext[UploadType.VIDEO];

const isVideoFile = (filename: string): boolean => {
    if (!filename) return false;
    const lowerFilename = filename.toLowerCase();
    return videoExts.some((e) => lowerFilename.endsWith(e));
};

export const LTX2NoAudioToggle = (props: ToggleInputProps) => {
    const imageValue = useWatch({ name: 'image' });
    const showToggle = isVideoFile(imageValue as string);

    if (!showToggle) {
        return null;
    }

    return <ToggleInput label='no_audio' {...props} />;
};
