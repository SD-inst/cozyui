import { useResultParam } from '../../hooks/useResult';
import { useWatchForm } from '../../hooks/useWatchForm';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';
import { ImageResult } from './ImageResult';
import { VideoResult, VideoResultProps } from './VideoResult';

export const VideoImageResult = ({
    lengthName = 'length',
    imageThreshold = 1,
    imagePreviewMaxFrames,
    ...props
}: VideoResultProps & {
    lengthName?: string;
    imageThreshold?: number;
    imagePreviewMaxFrames?: number;
}) => {
    const length = useWatchForm(lengthName);
    const { id } = useResultParam();
    return length > imageThreshold ? (
        <VideoResult {...props} />
    ) : (
        <ResultOverrideContextProvider value={{ id, type: 'images' }}>
            <ImageResult previewMaxFrames={imagePreviewMaxFrames} />
        </ResultOverrideContextProvider>
    );
};
