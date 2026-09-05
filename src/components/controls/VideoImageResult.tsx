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
    const isVideo = (length ?? 0) > imageThreshold;
    return (
        <>
            <div style={{ display: isVideo ? 'block' : 'none' }}>
                <VideoResult {...props} />
            </div>
            <div style={{ display: isVideo ? 'none' : 'block' }}>
                <ResultOverrideContextProvider value={{ id, type: 'images' }}>
                    <ImageResult previewMaxFrames={imagePreviewMaxFrames} noHistory={isVideo} />
                </ResultOverrideContextProvider>
            </div>
        </>
    );
};
