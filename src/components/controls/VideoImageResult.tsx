import { useResultParam } from '../../hooks/useResult';
import { useWatchForm } from '../../hooks/useWatchForm';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';
import { ImageResult } from './ImageResult';
import { VideoResult, VideoResultProps } from './VideoResult';

export const VideoImageResult = ({
    lengthName = 'length',
    ...props
}: VideoResultProps & { lengthName?: string }) => {
    const length = useWatchForm(lengthName);
    const { id } = useResultParam();
    return length > 1 ? (
        <VideoResult {...props} />
    ) : (
        <ResultOverrideContextProvider value={{ id, type: 'images' }}>
            <ImageResult />
        </ResultOverrideContextProvider>
    );
};
