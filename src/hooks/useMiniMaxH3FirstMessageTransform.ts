import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';

export const useMiniMaxH3FirstMessageTransform = () => {
    const length = useWatch({ name: 'length', defaultValue: 5 });
    const aspectRatio = useWatch({
        name: 'aspect_ratio',
        defaultValue: '16:9 (Widescreen)',
    });
    const aspect = aspectRatio.split(' ')[0];

    return useCallback(
        (text: string) =>
            `length=${length}\naspect=${aspect}\ndescription=${text}`,
        [length, aspect],
    );
};
