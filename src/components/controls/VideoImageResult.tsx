import { useWatch } from 'react-hook-form';
import { useResultParam } from '../../hooks/useResult';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';
import { ImageResult } from './ImageResult';
import { VideoResult, VideoResultProps } from './VideoResult';

export const VideoImageResult = ({
    lengthName = 'length',
    ...props
}: VideoResultProps & { lengthName?: string }) => {
    const length = useWatch({ name: lengthName });
    const { id } = useResultParam();
    return length > 1 ? (
        <VideoResult {...props} />
    ) : (
        <ResultOverrideContextProvider value={{ id, type: 'images' }}>
            <ImageResult />
        </ResultOverrideContextProvider>
    );
};
